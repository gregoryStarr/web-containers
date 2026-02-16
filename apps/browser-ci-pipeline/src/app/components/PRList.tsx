import { PR } from '../app';

interface PRListProps {
  prs: PR[];
  selectedPR: PR | null;
  onSelectPR: (pr: PR) => void;
}

export function PRList({ prs, selectedPR, onSelectPR }: PRListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Pull Requests</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {prs.map((pr) => (
          <div
            key={pr.id}
            className={`p-4 cursor-pointer hover:bg-gray-50 ${
              selectedPR?.id === pr.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
            onClick={() => onSelectPR(pr)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  #{pr.number} {pr.title}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    pr.status === 'success' ? 'bg-green-100 text-green-800' :
                    pr.status === 'failure' ? 'bg-red-100 text-red-800' :
                    pr.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {pr.status}
                  </span>
                  {pr.lastRun && (
                    <span className="ml-2 text-xs text-gray-500">
                      {pr.lastRun.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}