import { useState, useEffect } from 'react';
import { PRList } from './components/PRList';
import { PRDetail } from './components/PRDetail';
import { StatusIndicator } from './components/StatusIndicator';
import { GitHubIntegrationService, PRData } from '../../../../libs/shared/github-integration/src/index.js';
import { WebContainerManager } from '../../../../libs/shared/webcontainer-manager/src/index.js';
import { CIPipelineOrchestrator } from '../../../../libs/shared/ci-pipeline/src/index.js';

export interface PR extends PRData {
  status: 'pending' | 'running' | 'success' | 'failure';
  logs: string[];
  lastRun?: Date;
}

export function App() {
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(import.meta.env.VITE_GITHUB_TOKEN || '');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [githubService, setGithubService] =
    useState<GitHubIntegrationService | null>(null);
  const [runningPRs, setRunningPRs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (token && owner && repo) {
      setGithubService(new GitHubIntegrationService(token, owner, repo));
    } else {
      setGithubService(null);
    }
  }, [token, owner, repo]);

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
      setError(err instanceof Error ? `${err.message}. Check repository details and token permissions.` : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  };

  const runCI = async (pr: PR) => {
    if (!githubService) return;

    setRunningPRs((prev) => new Set(prev).add(pr.id));

    try {
      // Update PR status
      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: 'running' as const,
                logs: ['Initializing CI pipeline...'],
              }
            : p
        )
      );

      // Create WebContainer and mount files
      const manager = new WebContainerManager();
      await manager.bootContainer();

      // Fetch and mount PR files
      const containerFiles = await githubService.createContainerFilesFromPR(
        pr.number
      );
      await manager.container?.mount(containerFiles);

      // Run pipeline
      const pipeline = new CIPipelineOrchestrator(manager, {});
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
      const finalStatus = results.every((r) => r.success)
        ? 'success'
        : 'failure';
      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: finalStatus,
                logs: allLogs,
                lastRun: new Date(),
              }
            : p
        )
      );

      // Cleanup
      await manager.teardown();
    } catch (err) {
      setPrs((prev) =>
        prev.map((p) =>
          p.id === pr.id
            ? {
                ...p,
                status: 'failure' as const,
                logs: [
                  ...p.logs,
                  `Error: ${
                    err instanceof Error ? err.message : 'Unknown error'
                  }`,
                ],
                lastRun: new Date(),
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              WebContainer CI Platform
            </h1>
            <StatusIndicator status={githubService ? 'online' : 'offline'} />
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
                isRunning={runningPRs.has(selectedPR.id)}
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
    </div>
  );
}

export default App;
