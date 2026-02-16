import { describe, it, expect, vi } from 'vitest';
import { CIPipelineOrchestrator } from './ci-pipeline';

// Mock WebContainerManager
const mockManager = {
  executeCommand: vi.fn(),
  captureOutput: vi.fn(),
  isContainerBooted: true,
} as any;

describe('CIPipelineOrchestrator', () => {
  it('should complete a simple pipeline successfully', async () => {
    // Mock successful command execution
    mockManager.executeCommand.mockResolvedValue({
      success: true,
      stdout: 'hello world',
      stderr: '',
      exitCode: 0,
      duration: 100,
    });

    const pipeline = new CIPipelineOrchestrator(mockManager, {
      test: {
        name: 'test',
        command: 'echo',
        args: ['hello'],
      },
    });

    const results = await pipeline.runPipeline();

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].stage).toBe('test');
    expect(results[0].result.stdout).toBe('hello world');
  });

  it('should abort pipeline on failure', async () => {
    // Mock failed command
    mockManager.executeCommand.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'command failed',
      exitCode: 1,
      duration: 50,
    });

    const pipeline = new CIPipelineOrchestrator(mockManager, {
      build: {
        name: 'build',
        command: 'failing-command',
      },
    });

    const results = await pipeline.runPipeline();

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].aborted).toBe(true);
  });

  it('should handle multiple stages', async () => {
    mockManager.executeCommand.mockResolvedValue({
      success: true,
      stdout: 'success',
      stderr: '',
      exitCode: 0,
      duration: 10,
    });

    const pipeline = new CIPipelineOrchestrator(mockManager, {
      build: {
        name: 'build',
        command: 'npm',
        args: ['run', 'build'],
      },
      test: {
        name: 'test',
        command: 'npm',
        args: ['test'],
      },
    });

    const results = await pipeline.runPipeline();

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });
});