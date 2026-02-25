/**
 * Pipeline Execution Hook
 *
 * Copyright (c) 2024 Gregory Starr
 * @license BSL-1.1
 */

import { useState, useCallback } from 'react';
import type { CIPipelineOrchestrator } from '@org/ci-pipeline';
import type { PR, AppStatus, PipelineSettings } from '../types';

interface UsePipelineReturn {
  isRunning: boolean;
  isExporting: boolean;
  isMerging: boolean;
  mergeError: string | null;
  setMergeError: React.Dispatch<React.SetStateAction<string | null>>;
  handleRunCI: (pr: PR) => Promise<void>;
  handleExportArtifact: (signed: boolean) => Promise<void>;
  handleMergePR: (pr: PR, deleteBranch: boolean) => Promise<void>;
}

export function usePipeline(
  orchestrator: CIPipelineOrchestrator | null,
  services: { github: any },
  pipelineSettings: PipelineSettings,
  setStatus: React.Dispatch<React.SetStateAction<AppStatus>>,
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setCurrentStage: React.Dispatch<React.SetStateAction<string>>,
  setPrs: React.Dispatch<React.SetStateAction<PR[]>>,
  setSelectedPR: React.Dispatch<React.SetStateAction<PR | null>>,
  fetchPRs: () => Promise<void>
): UsePipelineReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const handleExportArtifact = useCallback(
    async (signed: boolean) => {
      if (!orchestrator || isExporting || isRunning) return;

      setIsExporting(true);
      setLogs((prev) => [
        ...prev,
        `[EXPORT] Starting artifact export (${
          signed ? 'signed' : 'unsigned'
        })...`,
      ]);

      try {
        const artifact = await orchestrator.exportBuildArtifact(signed);

        if (artifact) {
          // Create download link
          const url = URL.createObjectURL(artifact);
          const a = document.createElement('a');
          a.href = url;
          a.download = `build-${
            signed ? 'signed' : 'unsigned'
          }-${Date.now()}.tar.gz`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setLogs((prev) => [
            ...prev,
            `[EXPORT] Artifact downloaded successfully!`,
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            `[EXPORT] Failed to create artifact. Make sure build has run successfully.`,
          ]);
        }
      } catch (error: any) {
        setLogs((prev) => [...prev, `[EXPORT] Error: ${error.message}`]);
      } finally {
        setIsExporting(false);
      }
    },
    [orchestrator, isExporting, isRunning, setLogs]
  );

  const handleRunCI = useCallback(
    async (pr: PR) => {
      if (!orchestrator || isRunning) return;

      setIsRunning(true);
      setStatus('busy');
      setLogs([]);

      setPrs((prev) =>
        prev.map((p) => (p.id === pr.id ? { ...p, status: 'running' } : p))
      );
      setSelectedPR((prev) => (prev ? { ...prev, status: 'running' } : null));

      try {
        const results = await orchestrator.runPipeline(pr.number, {
          installCommand: `${pipelineSettings.packageManager} install`,
          buildCommand: pipelineSettings.buildCommand,
          testCommand: `${pipelineSettings.packageManager} test`,
        });

        // runPipeline returns results but never throws on stage failure
        // Check the actual results to determine success/failure
        const failedStage = results.find((r) => !r.success);

        if (failedStage) {
          const failureMessage = `Stage "${failedStage.stage}" failed with exit code ${failedStage.result.exitCode}`;
          setPrs((prev) =>
            prev.map((p) =>
              p.id === pr.id
                ? {
                    ...p,
                    status: 'failure',
                    lastRun: new Date(),
                    failureReason: failureMessage,
                  }
                : p
            )
          );
          setSelectedPR((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'failure',
                  lastRun: new Date(),
                  failureReason: failureMessage,
                }
              : null
          );
        } else {
          setPrs((prev) =>
            prev.map((p) =>
              p.id === pr.id
                ? { ...p, status: 'success', lastRun: new Date() }
                : p
            )
          );
          setSelectedPR((prev) =>
            prev ? { ...prev, status: 'success', lastRun: new Date() } : null
          );
        }
      } catch (error: any) {
        setPrs((prev) =>
          prev.map((p) =>
            p.id === pr.id
              ? {
                  ...p,
                  status: 'failure',
                  lastRun: new Date(),
                  failureReason: error.message,
                }
              : p
          )
        );
        setSelectedPR((prev) =>
          prev
            ? {
                ...prev,
                status: 'failure',
                lastRun: new Date(),
                failureReason: error.message,
              }
            : null
        );
      } finally {
        setIsRunning(false);
        setStatus('online');
        setCurrentStage('');
      }
    },
    [
      orchestrator,
      isRunning,
      pipelineSettings,
      setStatus,
      setLogs,
      setCurrentStage,
      setPrs,
      setSelectedPR,
    ]
  );

  const handleMergePR = useCallback(
    async (pr: PR, deleteBranch: boolean) => {
      if (!services.github || isMerging) return;
      setIsMerging(true);
      setMergeError(null);
      try {
        await services.github.mergePR(
          pr.number,
          `Merge pull request #${pr.number} from ${pr.head?.ref}`
        );
        if (deleteBranch && pr.head?.ref) {
          await services.github.deleteBranch(pr.head.ref);
        }
        fetchPRs();
        if (pr.id === pr.id) setSelectedPR(null);
      } catch (error: any) {
        console.error('Merge failed:', error);
        setMergeError(
          error.message || 'An unknown error occurred during merge'
        );
      } finally {
        setIsMerging(false);
      }
    },
    [services.github, isMerging, setMergeError, fetchPRs, setSelectedPR]
  );

  return {
    isRunning,
    isExporting,
    isMerging,
    mergeError,
    setMergeError,
    handleRunCI,
    handleExportArtifact,
    handleMergePR,
  };
}
