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

  constructor(manager: WebContainerManager, config: PipelineConfig) {
    this.manager = manager;
    this.config = config;
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
      const stage: PipelineStage = stageConfig || {
        name: key,
        command: defaultCommand,
        args: defaultArgs,
        timeout: key === 'install' ? 300000 : key === 'build' ? 600000 : key === 'test' ? 900000 : 1200000,
      };

      try {
        const result = await this.executeStage(stage);
        results.push({
          stage: key,
          success: result.success,
          result,
          aborted: false,
        });

        // Abort on failure unless it's mutation test (optional)
        if (!result.success && key !== 'mutation') {
          this.aborted = true;
        }
      } catch (error) {
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
