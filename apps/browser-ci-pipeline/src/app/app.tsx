import { useState, useEffect, useCallback } from 'react';
import {
  Github,
  Settings,
  RefreshCw,
  Layout,
  Database,
  ChevronDown,
  List,
  Info,
  ExternalLink,
  BookOpen,
  Heart,
  X,
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
import { CILogo } from './components/CILogo';

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
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
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
      const fetchedPRData = await services.github.pollPRs();
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
      if (selectedPR?.id === pr.id) setSelectedPR(null);
    } catch (error: any) {
      console.error('Merge failed:', error);
      setMergeError(error.message || 'An unknown error occurred during merge');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9F9F4] text-[var(--color-earth-text)] overflow-hidden font-sans selection:bg-[var(--color-earth-secondary)] selection:text-[var(--color-earth-text)]">
      {/* Premium Header */}
      <header className="flex-shrink-0 z-40 bg-white/70 backdrop-blur-xl border-b border-[var(--color-earth-border)] px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-5">
          <div className="group cursor-pointer transition-all duration-500 hover:rotate-6 hover:scale-110 text-stone-900">
            <CILogo size={44} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 leading-none flex items-center">
              CI{' '}
              <span className="ml-1.5 px-2 py-0.5 bg-[var(--color-earth-primary)] text-white text-[10px] rounded-md tracking-widest uppercase">
                Pipeline
              </span>
            </h1>
            <div className="flex items-center space-x-2.5 mt-2">
              <div className="relative flex items-center justify-center">
                <div
                  className={`absolute w-3 h-3 rounded-full opacity-40 animate-ping ${
                    status === 'online' ? 'bg-orange-500' : 'bg-amber-500'
                  }`}
                />
                <div
                  className={`relative w-2 h-2 rounded-full ${
                    status === 'online'
                      ? 'bg-orange-500'
                      : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  }`}
                />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Network {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* GitHub Context */}
          <div className="hidden lg:flex items-center space-x-3 bg-stone-100/80 px-5 py-2.5 rounded-2xl border border-stone-200/50 shadow-inner">
            <div className="p-1 bgColor-white rounded-md shadow-sm">
              <Github size={14} className="text-stone-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">
                Active Scope
              </span>
              <span className="text-[11px] font-bold text-stone-700 tracking-tight">
                {githubConfig.owner && githubConfig.repo
                  ? `${githubConfig.owner}/${githubConfig.repo}`
                  : 'Disconnected'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-stone-50 hover:bg-white rounded-2xl border border-stone-200 shadow-sm transition-all duration-300 text-stone-500 hover:text-stone-900 hover:shadow-md hover:-translate-y-0.5 group relative"
          >
            <Settings
              size={20}
              className="group-hover:rotate-45 transition-transform duration-500"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-earth-primary)] rounded-full border-2 border-white scale-0 group-hover:scale-100 transition-transform shadow-sm" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#1e202250] ">
          <div className="mx-auto p-3 space-y-3">
            {/* Repository Configuration */}
            <section className="bg-white rounded-[24px] border border-[var(--color-earth-border)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-5 relative">
              <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-[0.03]">
                <Database size={120} className="text-stone-900" />
              </div>

              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-[var(--color-earth-bg)] rounded-2xl border border-[var(--color-earth-border)]">
                  <Database
                    size={24}
                    className="text-[var(--color-earth-primary)]"
                  />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-black text-stone-900 tracking-tight">
                    Source Control
                  </h2>
                  <p className="text-sm text-stone-500 font-medium">
                    Configure your GitHub connection to sync pull requests
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                    Authorization Token
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={githubConfig.token}
                      onChange={(e) =>
                        setGithubConfig((prev) => ({
                          ...prev,
                          token: e.target.value,
                        }))
                      }
                      className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 outline-none shadow-sm"
                      placeholder="ghp_..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                    Owner / Organization
                  </label>
                  <div className="relative group">
                    <select
                      value={githubConfig.owner}
                      onChange={(e) =>
                        setGithubConfig((prev) => ({
                          ...prev,
                          owner: e.target.value,
                        }))
                      }
                      className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 outline-none shadow-sm appearance-none cursor-pointer pr-12"
                    >
                      <option value="" disabled>
                        Select Organization
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
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-stone-400 group-hover:text-stone-600 transition-colors">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                    Repository Name
                  </label>
                  <div className="relative group">
                    <select
                      value={githubConfig.repo}
                      onChange={(e) =>
                        setGithubConfig((prev) => ({
                          ...prev,
                          repo: e.target.value,
                        }))
                      }
                      className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 outline-none shadow-sm appearance-none cursor-pointer pr-10"
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
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400 group-hover:text-stone-600 transition-colors">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={fetchPRs}
                    className="w-full bg-stone-900 border-2 border-stone-900 hover:bg-stone-800 hover:border-stone-800 text-stone-100 font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
                    disabled={!githubConfig.owner || !githubConfig.repo}
                  >
                    <RefreshCw
                      size={12}
                      className={status === 'busy' ? 'animate-spin' : ''}
                    />
                    <span>Sync Repository</span>
                  </button>
                </div>
              </div>
            </section>
            {/* PR Detail (Top) */}
            {selectedPR ? (
              <section>
                <PRDetail
                  pr={selectedPR}
                  onRunCI={handleRunCI}
                  onMerge={handleMergePR}
                  isRunning={isRunning}
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
            {/* PR List (Bottom) */}
            <section className="pt-3 border-t border-[var(--color-earth-border)]/30">
              <PRList
                prs={prs}
                onSelectPR={(pr) => setSelectedPR(pr)}
                selectedPR={selectedPR}
              />
            </section>
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
        {isTerminalEnabled && (
          <WebContainerTerminal
            container={services.webcontainer?.container || null}
          />
        )}
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

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-stone-200 px-10 py-4 flex items-center justify-between z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
            <span>&copy; {new Date().getFullYear()}</span>
            <span className="w-1 h-1 bg-stone-300 rounded-full" />
            <span>
              {new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors flex items-center space-x-1.5"
            >
              <Info size={12} />
              <span>About</span>
            </button>
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors flex items-center space-x-1.5"
            >
              <BookOpen size={12} />
              <span>How to Use</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-bold text-stone-400">
          <span>Made with</span>
          <Heart
            size={12}
            className="text-rose-500 fill-rose-500 animate-pulse"
          />
          <span>by</span>
          <a
            href="https://github.com/gregoryStarr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-600 hover:text-stone-900 transition-colors flex items-center space-x-1"
          >
            <span>Gregory Starr</span>
            <ExternalLink size={10} />
          </a>
          <span className="mx-1 text-stone-300">|</span>
          <a
            href="https://stackblitz.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-earth-primary)] font-black hover:opacity-80 transition-opacity"
          >
            StackBlitz WebContainers
          </a>
        </div>
      </footer>

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setIsAboutOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-stone-100 rounded-xl">
                    <Info size={20} className="text-stone-600" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest text-sm">
                    About CI Pipeline
                  </h3>
                </div>
                <button
                  onClick={() => setIsAboutOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <p className="text-stone-600 text-sm leading-relaxed font-medium">
                  The CI Pipeline Platform is a browser-based continuous
                  integration tool powered by StackBlitz WebContainers. It
                  allows you to run your build and test pipelines directly in
                  your browser with full filesystem and terminal support.
                </p>
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">
                    Author Information
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-stone-900">
                        Astralis One
                      </div>
                      <div className="text-xs font-bold text-stone-500">
                        Engineer: Gregory Starr
                      </div>
                    </div>
                    <a
                      href="https://github.com/gregoryStarr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white rounded-xl shadow-sm border border-stone-200 hover:border-stone-900 transition-all group"
                    >
                      <Github
                        size={20}
                        className="text-stone-400 group-hover:text-stone-900 transition-colors"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How to Use Modal */}
      {isHowToUseOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setIsHowToUseOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-stone-100 rounded-xl">
                    <BookOpen size={20} className="text-stone-600" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest text-sm">
                    How to Use
                  </h3>
                </div>
                <button
                  onClick={() => setIsHowToUseOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  {
                    step: '01',
                    title: 'Authenticate',
                    desc: 'Enter your GitHub personal access token in the Source Control panel.',
                  },
                  {
                    step: '02',
                    title: 'Connect',
                    desc: 'Select the organization and repository you want to monitor.',
                  },
                  {
                    step: '03',
                    title: 'Sync',
                    desc: 'Click "Sync Repository" to fetch the latest pull requests.',
                  },
                  {
                    step: '04',
                    title: 'Run Pipeline',
                    desc: 'Select a PR and click "Run CI Pipeline" to execute your build tasks.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex space-x-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    <div className="text-lg font-black text-[var(--color-earth-primary)] opacity-30">
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-black text-stone-900">
                        {item.title}
                      </div>
                      <div className="text-xs font-bold text-stone-500 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
