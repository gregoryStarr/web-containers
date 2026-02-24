import { useState, useEffect } from 'react';
import { GitHubIntegrationService } from '@org/github-integration';
import { WebContainerManager } from '@org/webcontainer-manager';
import { CIPipelineOrchestrator } from '@org/ci-pipeline';
import type { Services, AppStatus, PipelineSettings } from '../types';

interface UseServicesReturn {
  services: Services;
  status: AppStatus;
  setStatus: React.Dispatch<React.SetStateAction<AppStatus>>;
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  currentStage: string;
  setCurrentStage: React.Dispatch<React.SetStateAction<string>>;
}

export function useServices(
  githubConfig: { token: string; owner: string; repo: string },
  pipelineSettings: PipelineSettings
): UseServicesReturn {
  const [status, setStatus] = useState<AppStatus>('offline');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [services, setServices] = useState<Services>({
    github: null,
    webcontainer: null,
    orchestrator: null,
  });

  // Initialize services on mount
  useEffect(() => {
    const initServices = async () => {
      if (status !== 'offline') return;
      setStatus('booting');

      const webcontainer = new WebContainerManager();
      await webcontainer.bootContainer();

      const github = new GitHubIntegrationService(
        githubConfig.token,
        githubConfig.owner,
        githubConfig.repo,
        (msg: string) => setLogs((prev) => [...prev, `[GitHub] ${msg}`])
      );

      const orchestrator = new CIPipelineOrchestrator(
        github,
        webcontainer,
        (msg: string) => {
          setLogs((prev) => [...prev, msg]);
        },
        (stage: string) => setCurrentStage(stage),
        {
          verbose: pipelineSettings.verboseLogging,
          categories: pipelineSettings.logCategories as any[],
        }
      );

      setServices({ github, webcontainer, orchestrator });
      setStatus('online');
    };

    initServices();
  }, [githubConfig.token, status]);

  // Update GitHub service when owner/repo changes
  useEffect(() => {
    if (services.webcontainer) {
      const github = new GitHubIntegrationService(
        githubConfig.token,
        githubConfig.owner,
        githubConfig.repo,
        () => {}
      );

      const orchestrator = new CIPipelineOrchestrator(
        github,
        services.webcontainer,
        (msg: string) => {
          setLogs((prev) => [...prev, msg]);
        },
        (stage: string) => setCurrentStage(stage),
        {
          verbose: pipelineSettings.verboseLogging,
          categories: pipelineSettings.logCategories as any[],
        }
      );
      setServices((prev) => ({ ...prev, github, orchestrator }));
    }
  }, [
    githubConfig.owner,
    githubConfig.repo,
    githubConfig.token,
    services.webcontainer,
    pipelineSettings.verboseLogging,
    pipelineSettings.logCategories,
  ]);

  return {
    services,
    status,
    setStatus,
    logs,
    setLogs,
    currentStage,
    setCurrentStage,
  };
}
