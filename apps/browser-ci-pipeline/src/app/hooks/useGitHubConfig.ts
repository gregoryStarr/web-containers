/**
 * GitHub Configuration Hook
 *
 * Copyright (c) 2024 Gregory Starr
 * @license BSL-1.1
 */

import { useState, useCallback, useEffect } from 'react';
import { GitHubIntegrationService } from '@org/github-integration';
import type { GitHubConfig } from '../types';

interface UseGitHubConfigReturn {
  githubConfig: GitHubConfig;
  setGithubConfig: React.Dispatch<React.SetStateAction<GitHubConfig>>;
  gitOwner: string;
  setGitOwner: React.Dispatch<React.SetStateAction<string>>;
  gitRepo: string;
  setGitRepo: React.Dispatch<React.SetStateAction<string>>;
  availableRepos: string[];
  setAvailableRepos: React.Dispatch<React.SetStateAction<string[]>>;
  isFetchingRepos: boolean;
  handleFetchRepos: () => Promise<void>;
}

export function useGitHubConfig(): UseGitHubConfigReturn {
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>({
    token: import.meta.env.VITE_GITHUB_TOKEN || '',
    owner: '',
    repo: '',
  });

  const [gitOwner, setGitOwner] = useState('');
  const [gitRepo, setGitRepo] = useState('');
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);

  // Clear gitRepo when owner changes
  useEffect(() => {
    if (gitOwner !== githubConfig.owner) {
      setGitRepo('');
      setGithubConfig((prev) => ({ ...prev, repo: '' }));
    }
  }, [gitOwner, githubConfig.owner]);

  // Clear gitOwner and gitRepo when token is cleared
  useEffect(() => {
    if (!githubConfig.token) {
      setGitOwner('');
      setGitRepo('');
      setAvailableRepos([]);
    }
  }, [githubConfig.token]);

  const handleFetchRepos = useCallback(async () => {
    if (!githubConfig.token || !gitOwner || isFetchingRepos) {
      return;
    }
    setIsFetchingRepos(true);
    try {
      const github = new GitHubIntegrationService(
        githubConfig.token,
        gitOwner,
        '',
        () => {}
      );
      const repos = await github.fetchRepos(gitOwner);
      setAvailableRepos(repos.map((r: any) => r.name));
    } catch (err: any) {
      console.error('Failed to fetch repos:', err);
      setAvailableRepos([]);
    } finally {
      setIsFetchingRepos(false);
    }
  }, [githubConfig.token, gitOwner, isFetchingRepos]);

  return {
    githubConfig,
    setGithubConfig,
    gitOwner,
    setGitOwner,
    gitRepo,
    setGitRepo,
    availableRepos,
    setAvailableRepos,
    isFetchingRepos,
    handleFetchRepos,
  };
}
