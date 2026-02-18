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
  private skipResolvers: Map<string, (result: CommandResult) => void> = new Map();
  private logger?: (message: string) => void;

  constructor(manager: WebContainerManager, config: PipelineConfig, logger?: (message: string) => void) {
    this.manager = manager;
    this.config = config;
    this.logger = logger;
  }

  async runPipeline(): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    this.aborted = false;

    const stages = [
      { key: 'install', defaultCommand: 'npm', defaultArgs: ['install', '--no-audit', '--no-fund', '--ignore-scripts'] },
      { key: 'build', defaultCommand: 'npm', defaultArgs: ['run', 'build'] },
      { key: 'test', defaultCommand: 'npm', defaultArgs: ['test'] },
      // { key: 'mutation', defaultCommand: 'npx', defaultArgs: ['stryker', 'run'] },
    ];

    // Log pipeline steps
    const stepNames = stages.map(s => {
      switch(s.key) {
        case 'install': return 'Install dependencies';
        case 'build': return 'Build project';
        case 'test': return 'Run tests';
        // case 'mutation': return 'Run mutation tests';
        default: return s.key;
      }
    });
    this.logger?.(`🚀 Starting CI pipeline: ${stepNames.join(' → ')}`);

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



      const stepName = key === 'install' ? 'Install dependencies' :
                      key === 'build' ? 'Build project' :
                      key === 'test' ? 'Run tests' : stage.name;
      this.logger?.(`🔄 Starting: ${stepName}`);

      // Log start of install
      if (stage.name === 'install') {
        this.logger?.(`📦 Installing dependencies...`);
      }

      try {
        const timeoutDuration = stage.timeout || 300000;
        const executePromise = this.executeStage(stage);
        
        const timeoutPromise = new Promise<CommandResult>((_, reject) => {
          setTimeout(() => reject(new Error(`Stage ${stage.name} timed out after ${timeoutDuration}ms`)), timeoutDuration);
        });

        const manualSkipPromise = new Promise<CommandResult>((resolve) => {
          this.skipResolvers.set(stage.name, resolve);
        });

        const result = await Promise.race([executePromise, timeoutPromise, manualSkipPromise]);
        
        // Cleanup resolver
        this.skipResolvers.delete(stage.name);

        this.logger?.(`✅ ${stage.name} completed in ${result.duration}ms (Exit code: ${result.exitCode})`);

        if (result.stdout) {
          this.logger?.(`${stage.name} stdout: ${result.stdout.substring(0, 500)}${result.stdout.length > 500 ? '...' : ''}`);
        }
        if (result.stderr) {
          this.logger?.(`${stage.name} stderr: ${result.stderr.substring(0, 500)}${result.stderr.length > 500 ? '...' : ''}`);
        }



        this.logger?.(`${stage.name} result: ${result}`);
        results.push({
          stage: key,
          success: result.success,
          result,
          aborted: false,
        });

        // Abort on failure unless it's mutation test (optional)
        this.logger?.(`result.success ${result.success}`);
        if (!result.success && key !== 'mutation') {
          this.logger?.(`❌ Failed: ${stage.name}, aborting pipeline`);
          this.aborted = true;
        } else if (result.success) {
          const stepName = key === 'install' ? 'Install dependencies' :
                          key === 'build' ? 'Build project' :
                          key === 'test' ? 'Run tests' : stage.name;
          this.logger?.(`✅ Completed: ${stepName}`);
        }
      } catch (error) {
        throw error;
      }
    }

    return results;
  }

  confirmCurrentStage(stageName: string) {
    const resolve = this.skipResolvers.get(stageName);
    if (resolve) {
      resolve({
        success: true,
        stdout: 'Manually skipped/confirmed by user',
        stderr: '',
        exitCode: 0,
        duration: 0
      });
      this.logger?.(`⏩ Manually confirming stage: ${stageName}`);
    }
  }

  private async executeStage(stage: PipelineStage): Promise<CommandResult> {
    if (stage.name === 'install') {
      const result = await this.manager.installDependencies(stage.command, stage.args);
      
      if (result.success) {
        this.logger?.('📦 Installing typescript explicitly to ensure tsc availability...');
        // Bypass installDependencies check and force install typescript
        await this.manager.executeCommand('npm', ['install', 'typescript', '--no-save']);
      }
      
      return result;
    }
    return await this.manager.executeCommand(stage.command, stage.args || [], stage.cwd);
  }

  abort(): void {
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
