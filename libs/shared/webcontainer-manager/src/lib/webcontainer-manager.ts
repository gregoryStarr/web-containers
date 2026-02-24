import { WebContainer, FileSystemTree } from '@webcontainer/api';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// Module-level singleton — WebContainer.boot() can only be called once per page
let bootPromise: Promise<WebContainer> | null = null;

export class WebContainerManager {
  private _container: WebContainer | null = null;
  private isBooted = false;
  private logger?: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger;
  }

  async bootContainer(files: FileSystemTree = {}): Promise<void> {
    if (this.isBooted) {
      this.logger?.('Container already booted on this manager instance, skipping.');
      return;
    }

    try {
      if (!bootPromise) {
        this.logger?.('📦 Booting WebContainer (first boot)...');
        bootPromise = WebContainer.boot();
      } else {
        this.logger?.('📦 Reusing existing WebContainer instance...');
      }
      this._container = await bootPromise;
      if (Object.keys(files).length > 0) {
        await this._container.mount(files);
      }
      this.isBooted = true;
    } catch (error) {
      bootPromise = null; // Allow retry on failure
      throw new Error(`Failed to boot WebContainer: ${error}`);
    }
  }

  async cleanFileSystem(): Promise<void> {
    if (!this._container || !this.isBooted) {
      throw new Error('Container is not booted');
    }
    this.logger?.('🧹 Clearing filesystem...');
    try {
      const files = await this._container.fs.readdir('/');
      for (const file of files) {
        if (file === '.' || file === '..') continue;
        // Recursive delete
        await this._container.fs.rm(file, { recursive: true });
      }
      this.logger?.('✅ Filesystem cleared');
    } catch (error) {
      this.logger?.(`⚠️ Failed to clear filesystem: ${error}`);
      // Don't throw, just warn
    }
  }

  async installDependencies(command: string, args: string[] = [], onOutput?: (data: string) => void): Promise<CommandResult> {
    if (!this._container || !this.isBooted) {
      throw new Error('Container is not booted');
    }

    try {
      this.logger?.('Checking for existing node_modules...');
      const files = await this._container.fs.readdir('node_modules');
      if (files.length > 0) {
        this.logger?.('Skipping installation: node_modules already exists');
        return {
          success: true,
          stdout: 'Skipped installation (node_modules exists)',
          stderr: '',
          exitCode: 0,
          duration: 0
        };
      }
    } catch (error) {
      // node_modules does not exist, proceed with install
      this.logger?.('node_modules not found, proceeding with installation...');
    }

    // Write .npmrc to disable engine-strict checks (WebContainer runs Node 18,
    // but some transitive deps like minimatch@10 declare Node >=20)
    try {
      this.logger?.('📝 Writing .npmrc with engine-strict=false for Node 18 compatibility...');
      await this._container.fs.writeFile('.npmrc', 'engine-strict=false\n');
    } catch (err) {
      this.logger?.(`⚠️ Could not write .npmrc: ${err}`);
    }

    return this.executeCommand(command, args, undefined, onOutput);
  }



  async executeCommand(command: string, args: string[] = [], cwd?: string, onOutput?: (data: string) => void): Promise<CommandResult> {
    if (!this._container || !this.isBooted) {
      throw new Error('Container is not booted');
    }

    const fullCommand = [command, ...args].join(' ');
    this.logger?.(`⚡ Executing: ${fullCommand}${cwd ? ` (in ${cwd})` : ''}`);

    const startTime = Date.now();

    try {
      // Use jsh to ensure environment is set up correctly
      const process = await this._container.spawn('jsh', ['-c', [command, ...args].join(' ')], {
        cwd,
        env: { CI: 'true' },
      });

      const output: string[] = [];

      // Collect output (combined stdout/stderr in WebContainer)
      const outputStreamPromise = process.output.pipeTo(new WritableStream({
        write: (data) => {
          output.push(data);
          this.logger?.(data);
          if (onOutput) onOutput(data);
        },
      }));

      const exitCode = await process.exit;
      
      // Ensure we finished reading all output
      await outputStreamPromise;

      const duration = Date.now() - startTime;
      console.log('Output:', output.join(''));
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
    console.log('Output:', result.stdout);
    return result.stdout;
  }

  async teardown(): Promise<void> {
    console.log('Teardown');
    if (this._container) {
      // WebContainer doesn't have explicit teardown, but we can reset state
      this._container = null;
      this.isBooted = false;
    }
  }

  get isContainerBooted(): boolean {
    return this.isBooted;
  }

  public get container(): WebContainer | null {
    return this._container;
  }
}


 