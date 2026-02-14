import { PR } from '../app';

interface PRDetailProps {
  pr: PR;
  onRunCI: (pr: PR) => Promise<void>;
  isRunning: boolean;
}

export function PRDetail({ pr, onRunCI, isRunning }: PRDetailProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                #{pr.number} {pr.title}
              </h2>
              <div className="mt-2 flex items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  pr.status === 'success' ? 'bg-green-100 text-green-800' :
                  pr.status === 'failure' ? 'bg-red-100 text-red-800' :
                  pr.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pr.status}
                </span>
                {pr.lastRun && (
                  <span className="ml-4 text-sm text-gray-500">
                    Last run: {pr.lastRun.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onRunCI(pr)}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {isRunning ? 'Running CI...' : 'Run CI'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">CI Logs</h3>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {pr.logs.join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}