import {
  GitPullRequest,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { PR } from '../app';

interface PRListProps {
  prs: PR[];
  selectedPR: PR | null;
  onSelectPR: (pr: PR) => void;
}

export function PRList({ prs, selectedPR, onSelectPR }: PRListProps) {
  return (
    <div className="bg-white rounded-earth border border-[var(--color-earth-border)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-2 duration-500">
      <div className="p-5 border-b border-[var(--color-earth-border)] bg-[var(--color-earth-bg)]/50 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-[var(--color-earth-text)] flex items-center space-x-2">
          <GitPullRequest
            size={18}
            className="text-[var(--color-earth-muted)]"
          />
          <span>Pull Requests</span>
        </h2>
        <span className="bg-[var(--color-earth-border)] text-[var(--color-earth-muted)] text-xs font-bold px-2 py-1 rounded-full">
          {prs.length}
        </span>
      </div>
      <div className="divide-y divide-[var(--color-earth-border)]">
        {prs.map((pr) => {
          const isSelected = selectedPR?.id === pr.id;
          return (
            <div
              key={pr.id}
              className={`p-5 cursor-pointer transition-earth hover:bg-stone-50 ${
                isSelected
                  ? 'bg-[var(--color-earth-bg)] border-l-4 border-l-[var(--color-earth-primary)]'
                  : ''
              }`}
              onClick={() => onSelectPR(pr)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-bold text-[var(--color-earth-primary)]">
                      #{pr.number}
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-earth-text)] truncate">
                      {pr.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          pr.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pr.status === 'failure'
                            ? 'bg-red-100 text-red-800'
                            : pr.status === 'running'
                            ? 'bg-amber-100/80 text-amber-900'
                            : 'bg-[var(--color-earth-bg)] text-stone-600'
                        }`}
                      >
                        {pr.status === 'success' && <CheckCircle2 size={12} />}
                        {pr.status === 'failure' && <XCircle size={12} />}
                        {pr.status === 'running' && (
                          <Loader2 size={12} className="animate-spin" />
                        )}
                        <span>{pr.status}</span>
                      </span>
                    </div>
                    {pr.lastRun && (
                      <div className="flex items-center text-xs text-[var(--color-earth-muted)] space-x-1">
                        <Clock size={12} />
                        <span>{pr.lastRun.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {prs.length === 0 && (
          <div className="p-10 text-center text-[var(--color-earth-muted)] italic">
            No open pull requests found.
          </div>
        )}
      </div>
    </div>
  );
}
