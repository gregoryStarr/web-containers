import { describe, it, expect, vi } from 'vitest';
import { CIPipelineOrchestrator } from './ci-pipeline';

// Mock GitHub service
const mockGithub = {
  getRepoFiles: vi.fn().mockResolvedValue({}),
  fetchPR: vi.fn(),
  pollPRs: vi.fn(),
  fetchRepos: vi.fn(),
  fetchUser: vi.fn(),
  fetchOrgs: vi.fn(),
} as any;

// Mock WebContainerManager
const mockManager = {
  bootContainer: vi.fn().mockResolvedValue(undefined),
  executeCommand: vi.fn(),
  mountFiles: vi.fn().mockResolvedValue(undefined),
  container: null,
} as any;

describe('CIPipelineOrchestrator', () => {
  it('should instantiate correctly', () => {
    const orchestrator = new CIPipelineOrchestrator(
      mockGithub,
      mockManager,
      undefined,
      undefined,
      { verbose: false, categories: [] }
    );
    expect(orchestrator).toBeDefined();
  });

  it('should instantiate with logger and stage callback', () => {
    const logger = vi.fn();
    const onStageChange = vi.fn();
    const orchestrator = new CIPipelineOrchestrator(
      mockGithub,
      mockManager,
      logger,
      onStageChange,
      { verbose: true, categories: ['COMMANDS', 'BUILD'] }
    );
    expect(orchestrator).toBeDefined();
  });
});