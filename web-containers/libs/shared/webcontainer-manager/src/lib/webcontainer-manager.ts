import { WebContainer } from '@webcontainer/api';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class WebContainerManager {
  private container: WebContainer | null = null;
  private isBooted = false;

  async bootContainer(files: Record<string, { file: { contents: string } }> = {}): Promise<void> {
    if (this.isBooted) {
      throw new Error('Container is already booted');
    }

    try {
      this.container = await WebContainer.boot();
      if (Object.keys(files).length > 0) {
        await this.container.mount(files);
      }
      this.isBooted = true;
    } catch (error) {
      throw new Error(`Failed to boot WebContainer: ${error}`);
    }
  }

  async executeCommand(command: string, args: string[] = [], cwd?: string): Promise<CommandResult> {
    if (!this.container || !this.isBooted) {
      throw new Error('Container is not booted');
    }

    const startTime = Date.now();

    try {
      const process = await this.container.spawn(command, args, {
        cwd,
      });

      const output: string[] = [];

      // Collect output (combined stdout/stderr in WebContainer)
      process.output.pipeTo(new WritableStream({
        write(data) {
          output.push(data);
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

  async captureOutput(command: string, args: string[] = [], cwd?: string): Promise<string> {
    const result = await this.executeCommand(command, args, cwd);
    return result.stdout;
  }

  async teardown(): Promise<void> {
    if (this.container) {
      // WebContainer doesn't have explicit teardown, but we can reset state
      this.container = null;
      this.isBooted = false;
    }
  }

  get isContainerBooted(): boolean {
    return this.isBooted;
  }

  get containerInstance(): WebContainer | null {
    return this.container;
  }
}
