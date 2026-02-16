import { PR } from '../app';

interface PRDetailProps {
  pr: PR;
  onRunCI: (pr: PR) => Promise<void>;
  onSkip?: () => void;
  isRunning: boolean;
  logs: string[];
  currentStage?: string;
}

export function PRDetail({
  pr,
  onRunCI,
  onSkip,
  isRunning,
  logs,
  currentStage,
}: PRDetailProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                #{pr.number} {pr.title}
              </h2>
              <div className="mt-2 flex items-center">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    pr.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : pr.status === 'failure'
                      ? 'bg-red-100 text-red-800'
                      : pr.status === 'running'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {pr.status}
                </span>
                {pr.lastRun && (
                  <span className="ml-4 text-sm text-gray-500">
                    Last run: {pr.lastRun.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="mt-4 flex space-x-3">
                {isRunning && onSkip && (
                  <button
                    onClick={onSkip}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                    title="Force the current stage to complete successfully"
                  >
                    Force Next Stage
                  </button>
                )}
                <button
                  onClick={() => onRunCI(pr)}
                  disabled={isRunning}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                >
                  {isRunning && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{isRunning ? 'Running CI...' : 'Run CI'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pr.status === 'failure' && pr.failureReason && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Build Failed</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{pr.failureReason}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">CI Logs</h3>
            {isRunning && currentStage && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600 font-medium">
                  {currentStage}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {logs.length > 0
              ? logs.join('\n')
              : 'No logs yet. Run CI to see output.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
