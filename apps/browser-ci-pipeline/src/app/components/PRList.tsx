import {
  GitPullRequest,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { PR } from '../app';

interface PRListProps {
  prs: PR[];
  selectedPR: PR | null;
  onSelectPR: (pr: PR) => void;
}

export function PRList({ prs, selectedPR, onSelectPR }: PRListProps) {
  return (
    <div className="bg-white rounded-[32px] border border-[var(--color-earth-border)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-5 border-b border-stone-100 bg-stone-50/30 flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-stone-900 flex items-center space-x-2.5">
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-stone-100">
            <GitPullRequest
              size={18}
              className="text-[var(--color-earth-primary)]"
            />
          </div>
          <span>Active Pull Requests</span>
        </h2>
        <span className="bg-stone-900 text-stone-100 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest">
          {prs.length} Open
        </span>
      </div>
      <div className="divide-y divide-stone-50">
        {prs.map((pr) => {
          const isSelected = selectedPR?.id === pr.id;
          return (
            <div
              key={pr.id}
              className={`p-4 cursor-pointer transition-all duration-300 group ${
                isSelected
                  ? 'bg-stone-50/80 ring-2 ring-inset ring-[var(--color-earth-primary)]'
                  : 'hover:bg-stone-50'
              }`}
              onClick={() => onSelectPR(pr)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-[11px] font-black text-[var(--color-earth-primary)] bg-[var(--color-earth-bg)] px-2 py-0.5 rounded-md">
                      #{pr.number}
                    </span>
                    <p className="text-md font-bold text-stone-800 truncate group-hover:text-stone-900 transition-colors tracking-tight">
                      {pr.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm transition-all duration-200 ${
                          pr.status === 'success'
                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20'
                            : pr.status === 'failure'
                            ? 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20'
                            : pr.status === 'running'
                            ? 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/20'
                            : 'bg-stone-100 text-stone-400'
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
                      <div className="flex items-center text-[10px] font-black text-stone-400 uppercase tracking-widest space-x-2">
                        <Clock size={12} />
                        <span>{pr.lastRun.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`ml-4 transition-all duration-300 ${
                    isSelected
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="p-2 bg-stone-900 rounded-full shadow-md">
                    <ChevronRight size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {prs.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-stone-50 rounded-full border border-stone-100">
              <GitPullRequest size={32} className="text-stone-200" />
            </div>
            <p className="text-stone-400 font-medium italic">
              No open pull requests found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
