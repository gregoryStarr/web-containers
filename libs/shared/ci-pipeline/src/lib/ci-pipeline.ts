/**
 * CI Pipeline Orchestrator
 *
 * Copyright (c) 2024 Gregory Starr
 * @license BSL-1.1
 *
 * Orchestrates CI pipeline execution in WebContainers
 */

import { WebContainerManager, CommandResult } from '@org/webcontainer-manager';
import { GitHubIntegrationService } from '@org/github-integration';

/**
 * Strips ANSI escape codes from string (npm colors, etc)
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

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

export interface PipelineOptions {
  installCommand?: string;
  buildCommand?: string;
  testCommand?: string;
  cwd?: string;
}

export type LogCategory =
  | 'COMMANDS'
  | 'FILESYSTEM'
  | 'NETWORK'
  | 'INTERNAL'
  | 'INSTALL'
  | 'BUILD'
  | 'TESTS';

export interface LoggingConfig {
  verbose: boolean;
  categories: LogCategory[];
}

export class CIPipelineOrchestrator {
  private github: GitHubIntegrationService;
  private manager: WebContainerManager;
  private aborted = false;
  private logger?: (message: string) => void;
  private onStageChange?: (stage: string) => void;

  constructor(
    github: GitHubIntegrationService,
    manager: WebContainerManager,
    logger?: (message: string) => void,
    onStageChange?: (stage: string) => void,
    _logConfig: LoggingConfig = { verbose: false, categories: [] }
  ) {
    this.github = github;
    this.manager = manager;
    this.logger = logger;
    this.onStageChange = onStageChange;
  }

  private log(category: LogCategory, message: string) {
    // Strip ANSI codes from npm/command output before logging
    const cleanMessage = stripAnsi(message);
    // Always log command output for debugging - don't require verbose mode
    this.logger?.(`[${category}] ${cleanMessage}`);
  }

  private clean(message: string): string {
    return stripAnsi(message);
  }

  async runPipeline(
    prNumber: number,
    options: PipelineOptions = {}
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    this.aborted = false;

    try {
      this.onStageChange?.('Initializing...');
      this.logger?.(`[INTERNAL] Starting CI pipeline for PR #${prNumber}`);
      this.log('INTERNAL', 'Initializing CI pipeline orchestrator...');

      // 1. Fetch PR details to get the head ref
      this.logger?.('[NETWORK] Fetching PR details...');
      this.log(
        'NETWORK',
        `GET https://api.github.com/repos/.../pulls/${prNumber}`
      );
      const prData = await this.github.fetchPR(prNumber);
      const headSha = prData.head.sha;
      const headRef = prData.head.ref;
      this.logger?.(
        `[INTERNAL] PR #${prNumber} branch: "${headRef}", SHA: ${headSha.substring(
          0,
          7
        )}`
      );
      this.log('INTERNAL', `PR head SHA: ${headSha}`);

      // 2. Fetch repository files and mount them
      this.onStageChange?.('Mounting files...');
      this.logger?.('[NETWORK] Fetching repository files...');
      this.log(
        'NETWORK',
        `Fetching tree for commit: ${headSha.substring(0, 7)}`
      );
      const containerFiles = await this.github.createContainerFilesFromRepo(
        headSha
      );

      const fileCount = Object.keys(containerFiles).length;
      if (fileCount === 0) {
        this.logger?.(
          '⚠️ WARNING: No files were mounted to the WebContainer - pipeline will likely fail'
        );
        this.log('FILESYSTEM', 'ERROR: No files fetched or mounted');
      } else {
        this.logger?.('[FILESYSTEM] Mounting files in WebContainer...');
        this.log('FILESYSTEM', `Mounting ${fileCount} top-level items to root`);
      }
      await this.manager.container?.mount(containerFiles);
      if (fileCount > 0) {
        this.logger?.('[SUCCESS] Files mounted successfully');
      }

      // 3. Define stages
      const stages = [
        {
          key: 'install',
          name: 'Install dependencies',
          command: options.installCommand || 'npm install',
          timeout: 300000,
        },
        {
          key: 'build',
          name: 'Build project',
          command: options.buildCommand || 'npm run build',
          timeout: 600000,
        },
        {
          key: 'test',
          name: 'Run tests',
          command: options.testCommand || 'npm test',
          timeout: 900000,
          required: true, // Will be skipped if no test script
        },
      ];

      // Track if test/build stage should be skipped
      let skipTestStage = false;
      let skipBuildStage = false;
      let hasTestScript = false;
      let hasBuildScript = false;

      // 4. Run stages
      for (const { key, name, command, timeout } of stages) {
        // Skip build stage if no build script exists - mark as FAILED
        if (key === 'build' && skipBuildStage) {
          this.logger?.(
            `\n[STAGE] Skipping: ${name} (no build script in package.json)`
          );
          results.push({
            stage: key,
            success: false,
            result: {
              success: false,
              stdout: '',
              stderr: 'Skipped - no build script found in package.json',
              exitCode: 1,
              duration: 0,
            },
            aborted: false,
          });
          // Don't abort - continue to test stage
          continue;
        }

        // Skip test stage if no test script exists - mark as FAILED
        if (key === 'test' && skipTestStage) {
          this.logger?.(
            `\n[STAGE] Skipping: ${name} (no test script in package.json)`
          );
          results.push({
            stage: key,
            success: false,
            result: {
              success: false,
              stdout: '',
              stderr: 'Skipped - no test script found in package.json',
              exitCode: 1,
              duration: 0,
            },
            aborted: false,
          });
          continue;
        }

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

        this.onStageChange?.(name);
        this.logger?.(`\n[STAGE] Starting Stage: ${name}`);
        this.log('COMMANDS', `Preparing to run: ${command}`);

        let outputCategory: LogCategory = 'INTERNAL';
        if (key === 'install') {
          outputCategory = 'INSTALL';
          this.log(
            'INTERNAL',
            'Checking for lockfiles and pre-install hooks...'
          );
        } else if (key === 'build') {
          outputCategory = 'BUILD';
          this.log('INTERNAL', 'Scanning for build scripts in package.json...');
        } else if (key === 'test') {
          outputCategory = 'TESTS';
        }

        const result = await this.executeCommandWithTimeout(
          command,
          options.cwd,
          timeout,
          (data) => {
            // Always log categorical output for debugging
            this.log(outputCategory, data);

            // Special handling for the TEST stage to provide live updates even if not verbose
            if (key === 'test') {
              const lines = data.split('\n');
              for (const line of lines) {
                if (!line.trim()) continue;
                const cleanLine = this.clean(line);

                // Identify test results and starts
                if (cleanLine.includes('PASS') || cleanLine.includes('✓')) {
                  this.logger?.(`[TESTS] [PASS] ${cleanLine.trim()}`);
                } else if (
                  cleanLine.includes('FAIL') ||
                  cleanLine.includes('✕')
                ) {
                  this.logger?.(`[TESTS] [FAIL] ${cleanLine.trim()}`);
                } else if (cleanLine.includes('RUNS')) {
                  this.logger?.(`[TESTS] [RUNNING] ${cleanLine.trim()}`);
                } else if (
                  cleanLine.includes('Test Suites') ||
                  cleanLine.includes('Tests:')
                ) {
                  this.logger?.(`[TESTS] [SUMMARY] ${cleanLine.trim()}`);
                } else {
                  // General test output
                  this.logger?.(`[TESTS] ${cleanLine.trim()}`);
                }
              }
            }
          }
        );

        this.log(
          'COMMANDS',
          `Stage "${name}" finished with exit code ${result.exitCode} (${result.duration}ms)`
        );

        if (result.stderr) {
          this.logger?.(`[WARNING] ${name} produced stderr output:`);
          this.logger?.(result.stderr);
          this.log(
            'INTERNAL',
            `Full stderr captured (${result.stderr.length} bytes)`
          );
        }

        results.push({
          stage: key,
          success: result.success,
          result,
          aborted: false,
        });

        if (result.success) {
          this.logger?.(`[SUCCESS] Stage "${name}" completed successfully.`);

          // After install, check if test/build scripts exist
          if (key === 'install') {
            try {
              hasTestScript = await this.manager.hasTestScript();
              if (!hasTestScript) {
                skipTestStage = true;
                this.logger?.(
                  `[INFO] No test script found in package.json - test stage will be skipped`
                );
              }
            } catch (err) {
              this.logger?.(
                `[WARNING] Could not check for test script: ${err}`
              );
            }

            try {
              hasBuildScript = await this.manager.hasBuildScript();
              if (!hasBuildScript) {
                skipBuildStage = true;
                this.logger?.(
                  `[INFO] No build script found in package.json - build stage will be skipped`
                );
              }
            } catch (err) {
              this.logger?.(
                `[WARNING] Could not check for build script: ${err}`
              );
            }
          }
        } else {
          this.logger?.(
            `[FAILURE] Stage "${name}" failed with exit code ${result.exitCode}.`
          );
          this.log(
            'INTERNAL',
            `Stage failed - stdout: ${result.stdout.substring(0, 500)}`
          );
          this.aborted = true;
        }
      }
    } catch (error: any) {
      this.logger?.(`[CRITICAL] Pipeline execution halted: ${error.message}`);
      throw error;
    } finally {
      this.onStageChange?.('');
    }

    return results;
  }

  private async executeCommandWithTimeout(
    fullCommand: string,
    cwd?: string,
    timeoutDuration: number = 300000,
    onOutput?: (data: string) => void
  ): Promise<CommandResult> {
    const [command, ...args] = fullCommand.split(' ');

    const executePromise = this.manager.executeCommand(
      command,
      args,
      cwd,
      onOutput
    );

    const timeoutPromise = new Promise<CommandResult>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `Command "${fullCommand}" timed out after ${timeoutDuration}ms`
            )
          ),
        timeoutDuration
      );
    });

    return (await Promise.race([
      executePromise,
      timeoutPromise,
    ])) as CommandResult;
  }

  forceNextStage() {
    // This was used in a previous version, keeping if needed but currently runPipeline is sequential
    this.logger?.(
      '⏩ Manual skip requested (not implemented in current sequential runner)'
    );
  }

  abort(): void {
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }

  async exportBuildArtifact(signed: boolean = false): Promise<Blob | null> {
    if (!this.manager) {
      return null;
    }

    this.logger?.(
      `[EXPORT] Creating ${signed ? 'signed' : 'unsigned'} build artifact...`
    );

    const artifact = await this.manager.createBuildArtifact();

    if (!artifact) {
      this.logger?.(`[EXPORT] No build artifact found. Run build first.`);
      return null;
    }

    // For signed, we'd need additional processing (not implemented yet)
    if (signed) {
      this.logger?.(
        `[EXPORT] Signing not yet implemented, downloading unsigned artifact`
      );
    }

    return artifact;
  }
}
