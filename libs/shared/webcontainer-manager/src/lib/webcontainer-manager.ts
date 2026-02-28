/**
 * WebContainer Manager
 *
 * Copyright (c) 2024 Gregory Starr
 * @license BSL-1.1
 *
 * Wraps StackBlitz WebContainer API for CI pipeline execution
 */

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
      this.logger?.(
        'Container already booted on this manager instance, skipping.'
      );
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

  async readFile(path: string): Promise<string | null> {
    if (!this._container || !this.isBooted) {
      return null;
    }
    try {
      const content = await this._container.fs.readFile(path, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }

  async hasTestScript(): Promise<boolean> {
    const packageJsonContent = await this.readFile('package.json');
    if (!packageJsonContent) {
      return false;
    }
    try {
      const pkg = JSON.parse(packageJsonContent);
      return !!(pkg.scripts && pkg.scripts.test);
    } catch {
      return false;
    }
  }

  async hasBuildScript(): Promise<boolean> {
    const packageJsonContent = await this.readFile('package.json');
    if (!packageJsonContent) {
      return false;
    }
    try {
      const pkg = JSON.parse(packageJsonContent);
      return !!(pkg.scripts && pkg.scripts.build);
    } catch {
      return false;
    }
  }

  async createBuildArtifact(
    dirs: string[] = ['dist', 'build', 'out']
  ): Promise<Blob | null> {
    if (!this._container || !this.isBooted) {
      return null;
    }

    // Find the first existing build directory
    let buildDir = '';
    for (const dir of dirs) {
      try {
        const files = await this._container.fs.readdir(dir);
        if (files.length > 0) {
          buildDir = dir;
          break;
        }
      } catch {
        // Directory doesn't exist, try next
      }
    }

    if (!buildDir) {
      this.logger?.(
        `⚠️ No build directory found (checked: ${dirs.join(', ')})`
      );
      return null;
    }

    this.logger?.(`📦 Creating artifact from ${buildDir}...`);

    try {
      // First, install archiver for proper zip creation
      const installResult = await this.executeCommand(
        'npm',
        ['install', 'archiver', '--save-dev'],
        undefined,
        () => {}
      );

      if (!installResult.success) {
        this.logger?.(`⚠️ Failed to install archiver: ${installResult.stderr}`);
        return await this.createSimpleJsonArtifact(buildDir);
      }

      // Create zip using node
      const zipCommand = `node -e "
        const archiver = require('archiver');
        const fs = require('fs');
        const output = fs.createWriteStream('/tmp/build.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => process.exit(0));
        archive.on('error', (err) => { console.error(err); process.exit(1); });
        
        archive.pipe(output);
        archive.directory('${buildDir}', false);
        archive.finalize();
      "`;

      const zipResult = await this.executeCommand('sh', ['-c', zipCommand]);

      if (zipResult.success) {
        // Read the zip file
        const zipContent = await this._container.fs.readFile('/tmp/build.zip');

        if (!zipContent) {
          return await this.createSimpleJsonArtifact(buildDir);
        }

        // Convert to Uint8Array
        const bytes =
          zipContent instanceof Uint8Array
            ? zipContent
            : new Uint8Array(zipContent);
        this.logger?.(`✅ Zip artifact created (${bytes.length} bytes)`);
        return new Blob([bytes], { type: 'application/zip' });
      }

      this.logger?.(`⚠️ Zip creation failed: ${zipResult.stderr}`);
      return await this.createSimpleJsonArtifact(buildDir);
    } catch (err) {
      this.logger?.(`⚠️ Error creating artifact: ${err}`);
      return await this.createSimpleJsonArtifact(buildDir);
    }
  }

  // Fallback: create a JSON manifest with file contents
  async createSimpleJsonArtifact(buildDir: string): Promise<Blob | null> {
    if (!this._container || !this.isBooted) {
      return null;
    }

    try {
      this.logger?.(`📦 Creating JSON artifact (fallback)...`);

      const files: Record<string, string> = {};

      const readDirRecursive = async (dir: string, basePath: string = '') => {
        if (!this._container?.fs) return;

        try {
          const entries = await this._container.fs.readdir(dir);
          for (const entry of entries) {
            const fullPath = basePath ? `${basePath}/${entry}` : entry;
            try {
              const content = await this._container.fs.readFile(
                `${dir}/${entry}`,
                'utf-8'
              );
              files[fullPath] = content;
            } catch {
              // It's a directory, recurse
              await readDirRecursive(`${dir}/${entry}`, fullPath);
            }
          }
        } catch (e) {
          // Ignore errors
        }
      };

      await readDirRecursive(buildDir);

      const manifest = JSON.stringify(files, null, 2);
      this.logger?.(
        `✅ JSON artifact created with ${Object.keys(files).length} files`
      );
      return new Blob([manifest], { type: 'application/json' });
    } catch (err) {
      this.logger?.(`⚠️ Fallback also failed: ${err}`);
      return null;
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

  async installDependencies(
    command: string,
    args: string[] = [],
    onOutput?: (data: string) => void
  ): Promise<CommandResult> {
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
          duration: 0,
        };
      }
    } catch (error) {
      // node_modules does not exist, proceed with install
      this.logger?.('node_modules not found, proceeding with installation...');
    }

    // Write .npmrc to disable engine-strict checks (WebContainer runs Node 18,
    // but some transitive deps like minimatch@10 declare Node >=20)
    try {
      this.logger?.(
        '📝 Writing .npmrc with engine-strict=false for Node 18 compatibility...'
      );
      await this._container.fs.writeFile('.npmrc', 'engine-strict=false\n');
    } catch (err) {
      this.logger?.(`⚠️ Could not write .npmrc: ${err}`);
    }

    return this.executeCommand(command, args, undefined, onOutput);
  }

  async executeCommand(
    command: string,
    args: string[] = [],
    cwd?: string,
    onOutput?: (data: string) => void
  ): Promise<CommandResult> {
    if (!this._container || !this.isBooted) {
      throw new Error('Container is not booted');
    }

    const fullCommand = [command, ...args].join(' ');
    this.logger?.(`⚡ Executing: ${fullCommand}${cwd ? ` (in ${cwd})` : ''}`);

    const startTime = Date.now();

    try {
      // Use jsh to ensure environment is set up correctly
      const process = await this._container.spawn(
        'jsh',
        ['-c', [command, ...args].join(' ')],
        {
          cwd,
          env: { CI: 'true' },
        }
      );

      const output: string[] = [];

      // Collect output (combined stdout/stderr in WebContainer)
      const outputStreamPromise = process.output.pipeTo(
        new WritableStream({
          write: (data) => {
            output.push(data);
            this.logger?.(data);
            if (onOutput) onOutput(data);
          },
        })
      );

      const exitCode = await process.exit;

      // Ensure we finished reading all output
      await outputStreamPromise;

      const duration = Date.now() - startTime;
      console.log(
        `[WebContainer] Command exit code: ${exitCode}, Output:`,
        output.join('')
      );
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

  async captureOutput(
    command: string,
    args: string[] = [],
    cwd?: string
  ): Promise<string> {
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
