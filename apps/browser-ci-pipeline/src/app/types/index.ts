/**
 * CI Pipeline Application Types
 * Shared TypeScript types for the browser-ci-pipeline application
 */

export interface PR {
  id: string;
  number: number;
  title: string;
  htmlUrl?: string;
  status: 'idle' | 'running' | 'success' | 'failure';
  lastRun?: Date;
  failureReason?: string;
  head?: {
    ref: string;
    sha: string;
  };
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export type AppStatus = 'online' | 'offline' | 'booting' | 'busy';

export interface PipelineSettings {
  packageManager: 'npm' | 'yarn' | 'pnpm';
  workingDirectory: string;
  buildCommand: string;
  verboseLogging: boolean;
  logCategories: string[];
}

export interface Services {
  github: import('@org/github-integration').GitHubIntegrationService | null;
  webcontainer: import('@org/webcontainer-manager').WebContainerManager | null;
  orchestrator: import('@org/ci-pipeline').CIPipelineOrchestrator | null;
}

export interface PipelineOptions {
  installCommand: string;
  buildCommand: string;
  testCommand: string;
}

export interface HowToUseStep {
  step: string;
  title: string;
  desc: string;
  subDesc: string;
}
