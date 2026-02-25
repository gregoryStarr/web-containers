/**
 * Browser CI Pipeline
 *
 * Copyright (c) 2024 Gregory Starr
 * Business Source License 1.1
 *
 * NON-COMMERCIAL USE: This software is free for personal, educational,
 * and non-commercial use. Commercial use requires a license.
 *
 * @license BSL-1.1
 */

import { useState, useEffect, useRef } from 'react';
import { PRList } from './components/PRList';
import { PRDetail } from './components/PRDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { WebContainerTerminal } from './components/WebContainerTerminal';
import { PipelineLogs } from './components/PipelineLogs';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { SourceControlForm, AboutModal, HowToUseModal } from './components';
import { useGitHubConfig, useServices, usePRs, usePipeline } from './hooks';
import type { PipelineSettings, PR } from './types';

export default function App() {
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTerminalEnabled, setIsTerminalEnabled] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);

  // Pipeline Settings State
  const [pipelineSettings, setPipelineSettings] = useState<PipelineSettings>({
    packageManager: 'npm',
    workingDirectory: '.',
    buildCommand: 'npm run build',
    verboseLogging: false,
    logCategories: [
      'COMMANDS',
      'FILESYSTEM',
      'NETWORK',
      'INTERNAL',
      'INSTALL',
      'BUILD',
      'TESTS',
    ],
  });

  // Custom Hooks
  const {
    githubConfig,
    setGithubConfig,
    gitOwner,
    setGitOwner,
    gitRepo,
    setGitRepo,
    availableRepos,
    isFetchingRepos,
    handleFetchRepos,
  } = useGitHubConfig();

  const {
    services,
    status,
    setStatus,
    logs,
    setLogs,
    currentStage,
    setCurrentStage,
  } = useServices(githubConfig, pipelineSettings);

  const { prs, setPrs, selectedPR, setSelectedPR, fetchPRs } = usePRs(
    services.github,
    setStatus
  );

  const {
    isRunning,
    isExporting,
    isMerging,
    mergeError,
    setMergeError,
    handleRunCI,
    handleExportArtifact,
    handleMergePR,
  } = usePipeline(
    services.orchestrator,
    { github: services.github },
    pipelineSettings,
    setStatus,
    setLogs,
    setCurrentStage,
    setPrs,
    setSelectedPR,
    fetchPRs
  );

  // Debounced owner/repo state
  const [debouncedOwner, setDebouncedOwner] = useState('');
  const [debouncedRepo, setDebouncedRepo] = useState('');
  const ownerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const repoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce owner changes to avoid excessive API calls
  useEffect(() => {
    if (ownerTimeoutRef.current) {
      clearTimeout(ownerTimeoutRef.current);
    }
    ownerTimeoutRef.current = setTimeout(() => {
      setDebouncedOwner(gitOwner);
    }, 500);
    return () => {
      if (ownerTimeoutRef.current) {
        clearTimeout(ownerTimeoutRef.current);
      }
    };
  }, [gitOwner]);

  // Debounce repo changes
  useEffect(() => {
    if (repoTimeoutRef.current) {
      clearTimeout(repoTimeoutRef.current);
    }
    repoTimeoutRef.current = setTimeout(() => {
      setDebouncedRepo(gitRepo);
    }, 500);
    return () => {
      if (repoTimeoutRef.current) {
        clearTimeout(repoTimeoutRef.current);
      }
    };
  }, [gitRepo]);

  // Update githubConfig with debounced values
  useEffect(() => {
    setGithubConfig((prev) => ({
      ...prev,
      owner: debouncedOwner,
      repo: debouncedRepo,
    }));
  }, [debouncedOwner, debouncedRepo]);

  // Handlers - these update local state immediately for responsive UI
  const handleTokenChange = (value: string) => {
    setGithubConfig((prev) => ({ ...prev, token: value }));
  };

  const handleOwnerChange = (value: string) => {
    setGitOwner(value);
  };

  const handleRepoChange = (value: string) => {
    setGitRepo(value);
  };

  const handleSettingsChange = (settings: {
    terminalEnabled: boolean;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    workingDirectory: string;
    buildCommand: string;
    verboseLogging: boolean;
    logCategories: string[];
  }) => {
    setIsTerminalEnabled(settings.terminalEnabled);
    setPipelineSettings({
      packageManager: settings.packageManager,
      workingDirectory: settings.workingDirectory,
      buildCommand: settings.buildCommand,
      verboseLogging: settings.verboseLogging,
      logCategories: settings.logCategories,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9F9F4] text-[var(--color-earth-text)] overflow-hidden font-sans selection:bg-[var(--color-earth-secondary)] selection:text-[var(--color-earth-text)]">
      {/* Header */}
      <AppHeader
        status={status}
        owner={githubConfig.owner}
        repo={githubConfig.repo}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#1e202250]">
          <div className="mx-auto p-3 space-y-3">
            {/* Source Control Form */}
            <SourceControlForm
              token={githubConfig.token}
              onTokenChange={handleTokenChange}
              gitOwner={gitOwner}
              onOwnerChange={handleOwnerChange}
              gitRepo={gitRepo}
              onRepoChange={handleRepoChange}
              availableRepos={availableRepos}
              isFetchingRepos={isFetchingRepos}
              onFetchRepos={handleFetchRepos}
              onSyncPRs={fetchPRs}
              status={status}
            />

            {/* PR Detail */}
            {selectedPR ? (
              <section>
                <PRDetail
                  pr={selectedPR}
                  onRunCI={handleRunCI}
                  onMerge={handleMergePR}
                  isRunning={isRunning}
                  isExporting={isExporting}
                  onExportArtifact={handleExportArtifact}
                  isMerging={isMerging}
                  mergeError={mergeError}
                  onClearMergeError={() => setMergeError(null)}
                />
              </section>
            ) : (
              <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-white uppercase tracking-[0.1em] cursor-help shadow-sm transition-all duration-200 bg-stone-50 text-stone-400">
                <span>Select a PR to continue</span>
              </span>
            )}

            {/* PR List */}
            <section className="pt-3 border-t border-[var(--color-earth-border)]/30">
              <PRList
                prs={prs}
                onSelectPR={(pr: PR) => setSelectedPR(pr)}
                selectedPR={selectedPR}
              />
            </section>
          </div>
        </div>

        {/* Logs Panel */}
        <aside className="w-[450px] flex-shrink-0 flex flex-col relative z-20 h-full">
          <PipelineLogs
            logs={logs}
            isVisible={true}
            currentStage={isRunning ? currentStage : undefined}
            isExporting={isExporting}
          />
        </aside>
      </main>

      {/* Terminal Overlay */}
      <div className="z-40">
        {isTerminalEnabled && (
          <WebContainerTerminal
            container={services.webcontainer?.container || null}
          />
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={{
          terminalEnabled: isTerminalEnabled,
          packageManager: pipelineSettings.packageManager,
          workingDirectory: pipelineSettings.workingDirectory,
          buildCommand: pipelineSettings.buildCommand,
          verboseLogging: pipelineSettings.verboseLogging,
          logCategories: pipelineSettings.logCategories,
        }}
        onSettingsChange={handleSettingsChange}
      />

      {/* Footer */}
      <AppFooter
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
      />

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
      />
    </div>
  );
}
