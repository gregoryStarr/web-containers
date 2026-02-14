import { WebContainerManager, CommandResult } from '@org/webcontainer-manager';

export interface PipelineStage {
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number; // in ms
}

export interface PipelineResult {
  stage: string;
  success: boolean;
  result: CommandResult;
  aborted: boolean;
}

export interface PipelineConfig {
  install?: PipelineStage;
  build?: PipelineStage;
  test?: PipelineStage;
  mutation?: PipelineStage;
}

export class CIPipelineOrchestrator {
  private manager: WebContainerManager;
  private config: PipelineConfig;
  private aborted = false;
  private logger?: (message: string) => void;

  constructor(manager: WebContainerManager, config: PipelineConfig, logger?: (message: string) => void) {
    this.manager = manager;
    this.config = config;
    this.logger = logger;
  }

  async executeInstallWithProgress(stage: PipelineStage, onProgress?: (count: number) => void): Promise<CommandResult> {
    if (!this.manager || !this.manager.isContainerBooted) {
      throw new Error('Container is not booted');
    }

    const fullCommand = [stage.command, ...(stage.args || [])].join(' ');
    this.logger?.(`⚡ Executing: ${fullCommand}${stage.cwd ? ` (in ${stage.cwd})` : ''}`);

    const startTime = Date.now();

    try {
      const process = await (this.manager as any).container.spawn(stage.command, stage.args || [], {
        cwd: stage.cwd,
      });

      let loadedDeps = 0;
      const output: string[] = [];

      // Read output stream
      process.output.pipeTo(new WritableStream({
        write(data) {
          output.push(data);
          // Try to parse JSON events
          try {
            const json = JSON.parse(data);
            if (json.type === 'package-installed') {
              loadedDeps++;
              onProgress?.(loadedDeps);
            }
          } catch (e) {
            // Ignore non-json lines
          }
        },
      }));

      const exitCode = await process.exit;
      const duration = Date.now() - startTime;

      return {
        success: exitCode === 0,
        stdout: output.join(''),
        stderr: '', // WebContainer combines output
        exitCode,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        stdout: '',
        stderr: `Command execution failed: ${error}`,
        exitCode: -1,
        duration,
      };
    }
  }

  async runPipeline(): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    this.aborted = false;

    const stages = [
      { key: 'install', defaultCommand: 'npm', defaultArgs: ['install'] },
      { key: 'build', defaultCommand: 'npm', defaultArgs: ['run', 'build'] },
      { key: 'test', defaultCommand: 'npm', defaultArgs: ['test'] },
      { key: 'mutation', defaultCommand: 'npx', defaultArgs: ['stryker', 'run'] },
    ];

    for (const { key, defaultCommand, defaultArgs } of stages) {
      if (this.aborted) {
        results.push({
          stage: key,
          success: false,
          result: {
            success: false,
            stdout: '',
            stderr: 'Pipeline aborted',
            exitCode: -1,
            duration: 0,
          },
          aborted: true,
        });
        continue;
      }

      const stageConfig = this.config[key as keyof PipelineConfig];
      let stage: PipelineStage = stageConfig || {
        name: key,
        command: defaultCommand,
        args: defaultArgs,
        timeout: key === 'install' ? 300000 : key === 'build' ? 600000 : key === 'test' ? 900000 : 1200000,
      };

      // Use npm install for install stage
      if (key === 'install' && !stageConfig) {
        stage = {
          name: 'install',
          command: 'npm',
          args: ['install'],
          timeout: 600000, // 10 minutes for large installs
        };
      }

      this.logger?.(`🔄 Starting ${stage.name} stage...`);

      // Add progress monitoring for long-running commands
      let progressInterval: NodeJS.Timeout | undefined;
      let loadedDeps = 0;
      let totalDeps = 0;
      if (stage.name === 'install') {
        // Count total dependencies
        try {
          const countResult = await this.manager.captureOutput('node', ['-e', "console.log(Object.keys(require('./package.json').dependencies || {}).length + Object.keys(require('./package.json').devDependencies || {}).length)"], stage.cwd || '.');
          const cleanResult = countResult.trim().replace(/\x1b\[[0-9;]*m/g, '');
          totalDeps = parseInt(cleanResult) || 0;
        } catch (error) {
          this.logger?.(`Debug: error counting dependencies: ${error}`);
          // Ignore errors, use 0
        }
        this.logger?.(`📦 Installing dependencies... (0 of ${totalDeps})`);
        // Start a progress indicator
        progressInterval = setInterval(() => {
          this.logger?.(`⏳ Installing dependencies (in progress...) (${loadedDeps} of ${totalDeps})`);
        }, 5000); // Log every 5 seconds
      }

      try {
        const result = await this.executeStage(stage);
        if (progressInterval) clearInterval(progressInterval);
        this.logger?.(`✅ ${stage.name} completed in ${result.duration}ms (Exit code: ${result.exitCode})`);

        if (result.stdout) {
          this.logger?.(`${stage.name} stdout: ${result.stdout.substring(0, 500)}${result.stdout.length > 500 ? '...' : ''}`);
        }
        if (result.stderr) {
          this.logger?.(`${stage.name} stderr: ${result.stderr.substring(0, 500)}${result.stderr.length > 500 ? '...' : ''}`);
        }

        results.push({
          stage: key,
          success: result.success,
          result,
          aborted: false,
        });

        // Abort on failure unless it's mutation test (optional)
        if (!result.success && key !== 'mutation') {
          this.logger?.(`❌ ${stage.name} failed, aborting pipeline`);
          this.aborted = true;
        } else if (result.success) {
          this.logger?.(`✅ ${stage.name} succeeded`);
        }
      } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        this.logger?.(`💥 ${stage.name} threw exception: ${error}`);
        results.push({
          stage: key,
          success: false,
          result: {
            success: false,
            stdout: '',
            stderr: `Stage execution failed: ${error}`,
            exitCode: -1,
            duration: 0,
          },
          aborted: false,
        });
        this.aborted = true;
      }
    }

    return results;
  }

  private async executeStage(stage: PipelineStage): Promise<CommandResult> {
    return await this.manager.executeCommand(stage.command, stage.args || [], stage.cwd);
  }

  abort(): void {
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
