/**
 * Pull Requests Hook
 *
 * Copyright (c) 2024 Gregory Starr
 * @license BSL-1.1
 */

import { useState, useEffect, useCallback } from 'react';
import type { GitHubIntegrationService } from '@org/github-integration';
import type { PR, AppStatus } from '../types';

interface UsePRsReturn {
  prs: PR[];
  setPrs: React.Dispatch<React.SetStateAction<PR[]>>;
  selectedPR: PR | null;
  setSelectedPR: React.Dispatch<React.SetStateAction<PR | null>>;
  fetchPRs: () => Promise<void>;
}

export function usePRs(
  github: GitHubIntegrationService | null,
  setStatus: React.Dispatch<React.SetStateAction<AppStatus>>
): UsePRsReturn {
  const [prs, setPrs] = useState<PR[]>([]);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);

  const fetchPRs = useCallback(async () => {
    if (!github) {
      return;
    }

    setStatus('busy');
    try {
      const fetchedPRData = await github.pollPRs();
      const mappedPRs: PR[] = fetchedPRData.map((pr: any) => ({
        id: pr.number.toString(),
        number: pr.number,
        title: pr.title,
        status: 'idle',
        head: pr.head,
      }));
      setPrs(mappedPRs);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Fetch PRs error:', errorMsg);
    } finally {
      setStatus('online');
    }
  }, [github, setStatus]);

  useEffect(() => {
    if (github) {
      fetchPRs();
    }
  }, [github, fetchPRs]);

  return {
    prs,
    setPrs,
    selectedPR,
    setSelectedPR,
    fetchPRs,
  };
}
