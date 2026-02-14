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



  async runPipeline(): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    this.aborted = false;

    const stages = [
      { key: 'install', defaultCommand: 'yarn', defaultArgs: ['install'] },
      { key: 'build', defaultCommand: 'npm', defaultArgs: ['run', 'build'] },
      { key: 'test', defaultCommand: 'npm', defaultArgs: ['test'] },
      { key: 'mutation', defaultCommand: 'npx', defaultArgs: ['stryker', 'run'] },
    ];

    // Log pipeline steps
    const stepNames = stages.map(s => {
      switch(s.key) {
        case 'install': return 'Install dependencies';
        case 'build': return 'Build project';
        case 'test': return 'Run tests';
        case 'mutation': return 'Run mutation tests';
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

      // Use yarn install for install stage
      if (key === 'install' && !stageConfig) {
        stage = {
          name: 'install',
          command: 'yarn',
          args: ['install'],
        };
      }

      const stepName = key === 'install' ? 'Install dependencies' :
                      key === 'build' ? 'Build project' :
                      key === 'test' ? 'Run tests' :
                      key === 'mutation' ? 'Run mutation tests' : stage.name;
      this.logger?.(`🔄 Starting: ${stepName}`);

      // Log start of install
      if (stage.name === 'install') {
        this.logger?.(`📦 Installing dependencies...`);
      }

      try {
        const result = await this.executeStage(stage);
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
          this.logger?.(`❌ Failed: ${stage.name}, aborting pipeline`);
          this.aborted = true;
        } else if (result.success) {
          const stepName = key === 'install' ? 'Install dependencies' :
                          key === 'build' ? 'Build project' :
                          key === 'test' ? 'Run tests' :
                          key === 'mutation' ? 'Run mutation tests' : stage.name;
          this.logger?.(`✅ Completed: ${stepName}`);
        }
      } catch (error) {
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
