import { useState, useEffect, useCallback } from 'react';
import {
  Github,
  Settings,
  ClipboardList,
  RefreshCw,
  Layout,
  Database,
  ChevronDown,
} from 'lucide-react';
import { PRList } from './components/PRList';
import { PRDetail } from './components/PRDetail';
import { StatusIndicator } from './components/StatusIndicator';
import { GitHubIntegrationService } from '@org/github-integration';
import { WebContainerManager } from '@org/webcontainer-manager';
import { CIPipelineOrchestrator } from '@org/ci-pipeline';
import { SettingsPanel } from './components/SettingsPanel';
import { WebContainerTerminal } from './components/WebContainerTerminal';
import { PipelineLogs } from './components/PipelineLogs';

export interface PR {
  id: string; // Internal ID for list selection
  number: number;
  title: string;
  status: 'idle' | 'running' | 'success' | 'failure';
  lastRun?: Date;
  failureReason?: string;
  head?: {
    ref: string;
    sha: string;
  };
}

export default function App() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<
    'online' | 'offline' | 'booting' | 'busy'
  >('offline');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [isTerminalEnabled, setIsTerminalEnabled] = useState(true);
  const [availableOwners, setAvailableOwners] = useState<string[]>([]);
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [githubConfig, setGithubConfig] = useState({
    token: import.meta.env.VITE_GITHUB_TOKEN || '',
    owner: 'gregoryStarr',
    repo: 'Web-Containers',
  });

  const [pipelineSettings, setPipelineSettings] = useState({
    packageManager: 'npm' as 'npm' | 'yarn' | 'pnpm',
    workingDirectory: '.',
    buildCommand: 'npm run build',
    verboseLogging: false,
    logCategories: ['COMMANDS', 'FILESYSTEM', 'NETWORK', 'INTERNAL'],
  });

  const [services, setServices] = useState<{
    github: GitHubIntegrationService | null;
    webcontainer: WebContainerManager | null;
    orchestrator: CIPipelineOrchestrator | null;
  }>({
    github: null,
    webcontainer: null,
    orchestrator: null,
  });

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

      // Fetch available owners
      try {
        const user = await github.fetchUser();
        const orgs = await github.fetchOrgs();
        setAvailableOwners([user.login, ...orgs.map((o) => o.login)]);
      } catch (err: any) {
        // Handle error
      }
    };

    initServices();
  }, [githubConfig.token, status]); // Added status to dependency array to prevent re-init if status changes

  // Update GitHub service when owner/repo changes
  useEffect(() => {
    if (services.github && services.webcontainer) {
      // We need a way to update owner/repo in the service without recreating it if possible,
      // but since they are private, we might need to recreate the service or orchestrator
      // For now, let's at least not re-boot the webcontainer.
      const github = new GitHubIntegrationService(
        githubConfig.token,
        githubConfig.owner,
        githubConfig.repo,
        () => {} // No debug logging for GitHub service
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
    services.webcontainer, // Added webcontainer to dependencies
    pipelineSettings.verboseLogging, // Added pipeline settings to dependencies
    pipelineSettings.logCategories, // Added pipeline settings to dependencies
  ]);

  // Fetch repos when owner changes
  useEffect(() => {
    const fetchRepos = async () => {
      if (!services.github || !githubConfig.owner) {
        setAvailableRepos([]);
        return;
      }
      try {
        const repos = await services.github.fetchRepos(githubConfig.owner);
        setAvailableRepos(repos.map((r) => r.name));
      } catch (err: any) {
        console.error('Failed to fetch repos:', err);
      }
    };
    fetchRepos();
  }, [services.github, githubConfig.owner]);

  const fetchPRs = useCallback(async () => {
    if (!services.github) {
      return;
    }

    setStatus('busy');
    try {
      const fetchedPRData = await services.github.fetchPullRequests();
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
  }, [services.github]); // Removed githubConfig.owner, githubConfig.repo as they are implicitly handled by services.github

  useEffect(() => {
    if (services.github) {
      fetchPRs();
    }
  }, [services.github, fetchPRs]);

  const handleRunCI = async (pr: PR) => {
    if (!services.orchestrator || isRunning) return;

    setIsRunning(true);
    setStatus('busy');
    setLogs([]);

    setPrs((prev) =>
      prev.map((p) => (p.id === pr.id ? { ...p, status: 'running' } : p))
    );
    if (selectedPR?.id === pr.id) {
      setSelectedPR((prev) => (prev ? { ...prev, status: 'running' } : null));
    }

    try {
      await services.orchestrator.runPipeline(pr.number, {
        installCommand: `${pipelineSettings.packageManager} install`,
        buildCommand: pipelineSettings.buildCommand,
        testCommand: `${pipelineSettings.packageManager} test`,
      });

      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id ? { ...p, status: 'success', lastRun: new Date() } : p
        )
      );
      if (selectedPR?.id === pr.id) {
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
      if (selectedPR?.id === pr.id) {
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
      }
    } finally {
      setIsRunning(false);
      setStatus('online');
      setCurrentStage('');
    }
  };

  const handleMergePR = async (pr: PR, deleteBranch: boolean) => {
    if (!services.github || isMerging) return;
    setIsMerging(true);
    try {
      await services.github.mergePR(
        pr.number,
        `Merge pull request #${pr.number} from ${pr.head?.ref}`
      );
      if (deleteBranch && pr.head?.ref) {
        await services.github.deleteBranch(pr.head.ref);
      }
      fetchPRs();
      if (selectedPR?.id === pr.id) setSelectedPR(null);
    } catch (error: any) {
      console.error('Merge failed:', error);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-earth-bg)] overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-[var(--color-earth-border)] flex items-center justify-between px-8 z-30 flex-shrink-0 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="bg-[var(--color-earth-primary)] p-2 rounded-lg text-white shadow-soft transition-earth group-hover:scale-105">
              <Github size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-earth-text)]">
              Browser CI{' '}
              <span className="text-[var(--color-earth-primary)] font-black">
                Pipeline
              </span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold text-[var(--color-earth-muted)] hover:bg-[var(--color-earth-secondary)]/10 hover:text-[var(--color-earth-primary)] transition-earth"
            >
              <Settings size={16} />
              <span>Pipeline Settings</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <StatusIndicator status={status} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left Column: Repository Config + PRs (Stacked Vertically) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30">
          <div className="max-w-4xl mx-auto p-8 space-y-8">
            {/* Repository Configuration */}
            <section className="bg-white rounded-earth border border-[var(--color-earth-border)] shadow-sm overflow-hidden p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Database
                  size={20}
                  className="text-[var(--color-earth-primary)]"
                />
                <h2 className="text-lg font-bold text-[var(--color-earth-text)] tracking-tight">
                  Repository Configuration
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-earth-muted)]">
                    GitHub Token
                  </label>
                  <input
                    type="password"
                    value={githubConfig.token}
                    onChange={(e) =>
                      setGithubConfig((prev) => ({
                        ...prev,
                        token: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--color-earth-bg)] border border-[var(--color-earth-border)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-earth-primary)] transition-earth"
                    placeholder="ghp_..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-earth-muted)]">
                    Owner
                  </label>
                  <div className="relative">
                    <select
                      value={githubConfig.owner}
                      onChange={(e) =>
                        setGithubConfig((prev) => ({
                          ...prev,
                          owner: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--color-earth-bg)] border border-[var(--color-earth-border)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-earth-primary)] transition-earth pr-10 appearance-none"
                    >
                      <option value="" disabled>
                        Select Owner
                      </option>
                      {!availableOwners.includes(githubConfig.owner) &&
                        githubConfig.owner && (
                          <option value={githubConfig.owner}>
                            {githubConfig.owner}
                          </option>
                        )}
                      {availableOwners.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-earth-muted)]">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-earth-muted)]">
                    Repository
                  </label>
                  <div className="relative">
                    <select
                      value={githubConfig.repo}
                      onChange={(e) =>
                        setGithubConfig((prev) => ({
                          ...prev,
                          repo: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--color-earth-bg)] border border-[var(--color-earth-border)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-earth-primary)] transition-earth pr-10 appearance-none"
                    >
                      <option value="" disabled>
                        Select Repository
                      </option>
                      {!availableRepos.includes(githubConfig.repo) &&
                        githubConfig.repo && (
                          <option value={githubConfig.repo}>
                            {githubConfig.repo}
                          </option>
                        )}
                      {availableRepos.map((repo) => (
                        <option key={repo} value={repo}>
                          {repo}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-earth-muted)]">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-[14px]" />{' '}
                  {/* Spacer for label alignment */}
                  <button
                    onClick={fetchPRs}
                    disabled={status === 'busy'}
                    className="w-full flex items-center justify-center space-x-2 bg-[var(--color-earth-primary)] hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-earth shadow-sm"
                  >
                    <RefreshCw
                      size={18}
                      className={status === 'busy' ? 'animate-spin' : ''}
                    />
                    <span>Fetch PRs</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Pull Requests Selection Section */}
            <div className="grid grid-cols-1 gap-8">
              <section>
                <PRList
                  prs={prs}
                  selectedPR={selectedPR}
                  onSelectPR={setSelectedPR}
                />
              </section>

              {selectedPR ? (
                <section>
                  <PRDetail
                    pr={selectedPR}
                    isRunning={isRunning}
                    isMerging={isMerging}
                    onRunCI={handleRunCI}
                    onSkip={() => services.orchestrator?.forceNextStage()}
                    onMerge={handleMergePR}
                  />
                </section>
              ) : (
                <section className="bg-white/50 border-2 border-dashed border-[var(--color-earth-border)] rounded-earth p-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-stone-100/50 rounded-full">
                    <Layout size={48} className="text-stone-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-500">
                      No PR Selected
                    </h3>
                    <p className="text-stone-400 max-w-xs mt-2 font-medium">
                      Select a pull request from the list above to view details
                      and run the CI pipeline.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Full-Height Logs Panel */}
        <aside className="w-[450px] flex-shrink-0 flex flex-col relative z-20 h-full">
          <PipelineLogs
            logs={logs}
            isVisible={true}
            currentStage={isRunning ? currentStage : undefined}
          />
        </aside>
      </main>

      {/* Terminal Overlay (Bottom) */}
      <div className="z-40">
        <WebContainerTerminal
          container={services.webcontainer?.container || null}
        />
      </div>

      {/* Overlays */}
      {/* DebugLogSidebar component removed */}

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
        onSettingsChange={(settings) => {
          setIsTerminalEnabled(settings.terminalEnabled);
          setPipelineSettings({
            packageManager: settings.packageManager,
            workingDirectory: settings.workingDirectory,
            buildCommand: settings.buildCommand,
            verboseLogging: settings.verboseLogging,
            logCategories: settings.logCategories,
          });
        }}
      />
    </div>
  );
}
