import { useState, useEffect, useRef } from 'react';
import { PRList } from './components/PRList';
import { PRDetail } from './components/PRDetail';
import { StatusIndicator } from './components/StatusIndicator';
import {
  GitHubIntegrationService,
  PRData,
} from '../../../../libs/shared/github-integration/src/index.js';
import { WebContainerManager } from '../../../../libs/shared/webcontainer-manager/src/index.js';
import { CIPipelineOrchestrator } from '../../../../libs/shared/ci-pipeline/src/index.js';
import { DebugLogSidebar } from './components/DebugLogSidebar';
import { SettingsPanel, loadSettings } from './components/SettingsPanel';
import type { AppSettings } from './components/SettingsPanel';
import { WebContainerTerminal } from './components/WebContainerTerminal';

export interface PR extends PRData {
  status: 'pending' | 'running' | 'success' | 'failure';
  logs: string[];
  lastRun?: Date;
  failureReason?: string;
}

export function App() {
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(import.meta.env.VITE_GITHUB_TOKEN || '');
  const [owner, setOwner] = useState('gregoryStarr');
  const [repo, setRepo] = useState('Web-Containers');
  const [githubService, setGithubService] =
    useState<GitHubIntegrationService | null>(null);
  const [runningPRs, setRunningPRs] = useState<Set<number>>(new Set());
  const [ciLogs, setCiLogs] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [currentStageKey, setCurrentStageKey] = useState<string>('');
  const [isLogSidebarOpen, setIsLogSidebarOpen] = useState(false);
  const pipelineRef = useRef<CIPipelineOrchestrator | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [containerInstance, setContainerInstance] = useState<
    InstanceType<typeof WebContainerManager>['container'] | null
  >(null);
  const [containerStatus, setContainerStatus] = useState<
    'offline' | 'booting' | 'online' | 'busy'
  >('offline');
  const managerRef = useRef<WebContainerManager | null>(null);

  useEffect(() => {
    if (token && owner && repo) {
      setGithubService(
        new GitHubIntegrationService(token, owner, repo, addLog)
      );
    } else {
      setGithubService(null);
    }
  }, [token, owner, repo]);

  // Auto-boot WebContainer on mount
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setContainerStatus('booting');
      try {
        const manager = new WebContainerManager(addLog);
        await manager.bootContainer();
        if (cancelled) return;
        managerRef.current = manager;
        setContainerInstance(manager.container);
        setContainerStatus('online');
        addLog('✅ WebContainer booted and ready');
      } catch (err) {
        if (cancelled) return;
        setContainerStatus('offline');
        addLog(`❌ Failed to boot WebContainer: ${err}`);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPRs = async () => {
    if (!githubService) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedPRs = await githubService.pollPRs();
      const prsWithStatus: PR[] = fetchedPRs.map((pr) => ({
        ...pr,
        status: 'pending' as const,
        logs: [],
      }));
      setPrs(prsWithStatus);
    } catch (err) {
      console.error('PR fetch error:', err);
      setError(
        err instanceof Error
          ? `${err.message}. Check repository details and token permissions.`
          : 'Failed to fetch PRs'
      );
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message: string) => {
    setCiLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);

    // Extract current stage from log messages
    if (
      message.includes('Starting: Install dependencies') ||
      message.includes('Starting install stage')
    ) {
      setCurrentStage('Installing dependencies...');
      setCurrentStageKey('install');
    } else if (
      message.includes('Starting: Build project') ||
      message.includes('Starting build stage')
    ) {
      setCurrentStage('Building project...');
      setCurrentStageKey('build');
    } else if (
      message.includes('Starting: Run tests') ||
      message.includes('Starting test stage')
    ) {
      setCurrentStage('Running tests...');
      setCurrentStageKey('test');
    } else if (
      message.includes('Starting: Run mutation tests') ||
      message.includes('Starting mutation stage')
    ) {
      setCurrentStage('Running mutation tests...');
      setCurrentStageKey('mutation');
    } else if (message.includes('completed') && message.includes('succeeded')) {
      setCurrentStage('');
      setCurrentStageKey('');
    } else if (message.includes('failed')) {
      setCurrentStage('Failed');
      setCurrentStageKey('');
    }
  };

  const skipCurrentStage = () => {
    if (pipelineRef.current && currentStageKey) {
      pipelineRef.current.confirmCurrentStage(currentStageKey);
    }
  };

  const runCI = async (pr: PR) => {
    if (!githubService) return;
    if (!managerRef.current || containerStatus !== 'online') {
      addLog(
        '❌ WebContainer is not ready yet. Please wait for it to finish booting.'
      );
      return;
    }

    setRunningPRs((prev) => new Set(prev).add(pr.id));
    setCurrentStage('Initializing...');
    setContainerStatus('busy');
    try {
      // Update PR status
      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: 'running' as const,
                logs: [],
                failureReason: undefined,
              }
            : p
        )
      );

      const manager = managerRef.current;

      // Fetch and mount repository files (full codebase for CI)
      addLog('🚀 Starting CI for repo: ' + owner + '/' + repo);
      addLog('📥 Fetching repository files...');
      const containerFiles = await githubService.createContainerFilesFromRepo();
      addLog(
        '📁 Fetched ' +
          Object.keys(containerFiles).length +
          ' files for mounting'
      );
      addLog('🔧 Mounting files in WebContainer...');
      await manager.container?.mount(containerFiles);
      addLog('✅ Files mounted successfully');

      // Build pipeline config from settings
      const pm = settings.packageManager || 'npm';
      const installArgs: Record<string, string[]> = {
        npm: ['install', '--no-audit', '--no-fund', '--ignore-scripts'],
        yarn: ['install', '--ignore-engines'],
        pnpm: ['install', '--no-frozen-lockfile'],
      };
      const cwdOpt = settings.workingDirectory
        ? { cwd: settings.workingDirectory }
        : {};

      const pipelineConfig: Record<
        string,
        { name: string; command: string; args: string[]; cwd?: string }
      > = {};

      // Always apply package manager (even without custom cwd)
      pipelineConfig.install = {
        name: 'install',
        command: pm,
        args: installArgs[pm],
        ...cwdOpt,
      };

      if (settings.buildCommand) {
        const parts = settings.buildCommand.trim().split(/\s+/);
        pipelineConfig.build = {
          name: 'build',
          command: parts[0],
          args: parts.slice(1),
          ...cwdOpt,
        };
      } else {
        pipelineConfig.build = {
          name: 'build',
          command: pm,
          args: ['run', 'build'],
          ...cwdOpt,
        };
      }

      pipelineConfig.test = {
        name: 'test',
        command: pm,
        args: ['test'],
        ...cwdOpt,
      };

      // Run pipeline
      const pipeline = new CIPipelineOrchestrator(
        manager,
        pipelineConfig,
        addLog
      );
      pipelineRef.current = pipeline;
      const results = await pipeline.runPipeline();

      // Collect logs
      const allLogs: string[] = [];
      for (const result of results) {
        allLogs.push(`=== ${result.stage.toUpperCase()} ===`);
        allLogs.push(result.result.stdout);
        if (result.result.stderr) {
          allLogs.push(`STDERR: ${result.result.stderr}`);
        }
        allLogs.push(
          `Exit code: ${result.result.exitCode}, Duration: ${result.result.duration}ms`
        );
        allLogs.push('');
      }

      // Update PR with results
      const failedStage = results.find((r) => !r.success);
      const finalStatus = failedStage ? 'failure' : 'success';
      const failureReason = failedStage
        ? `Stage ${failedStage.stage} failed: ${
            failedStage.result.stderr ||
            (failedStage.result.exitCode
              ? `Exit code ${failedStage.result.exitCode}`
              : 'Unknown error')
          }`
        : undefined;

      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: finalStatus,
                logs: allLogs,
                lastRun: new Date(),
                failureReason,
              }
            : p
        )
      );

      // No teardown — container stays booted for reuse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: 'failure' as const,
                logs: [...p.logs, `Error: ${errorMessage}`],
                lastRun: new Date(),
                failureReason: errorMessage,
              }
            : p
        )
      );
    } finally {
      setRunningPRs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pr.id);
        return newSet;
      });
      setCurrentStage('');
      setContainerStatus('online');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                WebContainer CI Platform
              </h1>
              <button
                onClick={() => setIsLogSidebarOpen(true)}
                className="text-gray-500 hover:text-blue-600 transition-colors flex items-center space-x-1 text-sm border px-3 py-1 rounded-full"
              >
                <span>📋</span>
                <span>Debug Logs</span>
              </button>
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
              />
            </div>
            <StatusIndicator status={containerStatus} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            GitHub Repository Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="password"
              placeholder="GitHub Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Owner (e.g., facebook)"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Repository (e.g., react)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchPRs}
              disabled={!githubService || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Fetch PRs'}
            </button>
          </div>
          {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PRList
              prs={prs}
              selectedPR={selectedPR}
              onSelectPR={setSelectedPR}
            />
          </div>

          <div className="lg:col-span-2">
            {selectedPR ? (
              <PRDetail
                pr={selectedPR}
                onRunCI={runCI}
                onSkip={skipCurrentStage}
                isRunning={runningPRs.has(selectedPR.id)}
                logs={ciLogs}
                currentStage={currentStage}
              />
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center">
                  {prs.length === 0
                    ? 'Configure repository and fetch PRs to get started'
                    : 'Select a PR to view details and run CI'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <DebugLogSidebar
        isOpen={isLogSidebarOpen}
        onClose={() => setIsLogSidebarOpen(false)}
        logs={ciLogs}
      />

      {settings.terminalEnabled && containerInstance && (
        <WebContainerTerminal container={containerInstance} />
      )}
    </div>
  );
}

export default App;
