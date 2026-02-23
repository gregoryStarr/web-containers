import { useState } from 'react';
import {
  Play,
  SkipForward,
  GitMerge,
  Rocket,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { PR } from '../app';

interface PRDetailProps {
  pr: PR;
  onRunCI: (pr: PR) => Promise<void>;
  onSkip?: () => void;
  onMerge?: (pr: PR, deleteBranch: boolean) => Promise<void>;
  onMergeAndDeploy?: (pr: PR, deleteBranch: boolean) => Promise<void>;
  isRunning: boolean;
  isMerging: boolean;
}

export function PRDetail({
  pr,
  onRunCI,
  onSkip,
  onMerge,
  onMergeAndDeploy,
  isRunning,
  isMerging: parentIsMerging,
}: PRDetailProps) {
  const [deleteBranchAfterMerge, setDeleteBranchAfterMerge] = useState(true);
  const [localIsMerging, setLocalIsMerging] = useState(false);

  const isMerging = parentIsMerging || localIsMerging;

  const handleMerge = async () => {
    if (!onMerge) return;
    setLocalIsMerging(true);
    try {
      await onMerge(pr, deleteBranchAfterMerge);
    } finally {
      setLocalIsMerging(false);
    }
  };

  const handleMergeAndDeploy = async () => {
    if (!onMergeAndDeploy) return;
    setLocalIsMerging(true);
    try {
      await onMergeAndDeploy(pr, deleteBranchAfterMerge);
    } finally {
      setLocalIsMerging(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="bg-white rounded-earth shadow-sm border border-[var(--color-earth-border)] overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex items-center space-x-3 text-[var(--color-earth-muted)] mb-3">
                <span className="text-sm font-bold bg-stone-100 px-2 py-1 rounded">
                  #{pr.number}
                </span>
                <ChevronRight size={14} />
                <span className="text-sm font-medium truncate max-w-md">
                  {pr.head?.ref || 'unknown'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-earth-text)] tracking-tight mb-4">
                {pr.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                    pr.status === 'success'
                      ? 'bg-emerald-100/80 text-emerald-900'
                      : pr.status === 'failure'
                      ? 'bg-red-100/80 text-red-900'
                      : pr.status === 'running'
                      ? 'bg-amber-100/80 text-amber-900'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {pr.status === 'success' && <CheckCircle2 size={16} />}
                  {pr.status === 'failure' && <XCircle size={16} />}
                  {pr.status === 'running' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--color-earth-primary)] border-t-transparent"></div>
                  )}
                  <span>{pr.status}</span>
                </span>

                {pr.lastRun && (
                  <span className="flex items-center text-sm text-[var(--color-earth-muted)] font-medium">
                    <Info size={16} className="mr-1.5" />
                    Last run: {pr.lastRun.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--color-earth-border)] flex flex-wrap items-center gap-4">
              <button
                onClick={() => onRunCI(pr)}
                disabled={isRunning || isMerging}
                className="flex items-center space-x-2 bg-[var(--color-earth-primary)] hover:bg-[var(--color-earth-primary)]/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-earth shadow-sm"
              >
                {isRunning ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                <span>{isRunning ? 'Running...' : 'Run CI Pipeline'}</span>
              </button>

              {isRunning && onSkip && (
                <button
                  onClick={onSkip}
                  className="flex items-center space-x-2 bg-amber-50 text-amber-900 hover:bg-amber-100 px-6 py-2.5 rounded-lg text-sm font-bold transition-earth border border-amber-200"
                  title="Force the current stage to complete successfully"
                >
                  <SkipForward size={18} />
                  <span>Force Next Stage</span>
                </button>
              )}

              {pr.status === 'success' && !isRunning && (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-8 w-px bg-[var(--color-earth-border)] hidden md:block mx-1" />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMerge}
                      disabled={isMerging}
                      className="flex items-center space-x-2 bg-stone-800 hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-earth shadow-sm"
                    >
                      <GitMerge size={18} />
                      <span>Merge</span>
                    </button>
                    <button
                      onClick={handleMergeAndDeploy}
                      disabled={isMerging}
                      className="flex items-center space-x-2 bg-[var(--color-earth-primary)] hover:brightness-110 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-earth shadow-sm"
                    >
                      <Rocket size={18} />
                      <span>Merge & Deploy</span>
                    </button>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteBranchAfterMerge}
                        onChange={(e) =>
                          setDeleteBranchAfterMerge(e.target.checked)
                        }
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-stone-300 transition-all checked:bg-[var(--color-earth-primary)] checked:border-[var(--color-earth-primary)]"
                      />
                      <CheckCircle2
                        size={12}
                        className="absolute left-1 shadow-sm opacity-0 peer-checked:opacity-100 text-white transition-opacity"
                      />
                    </div>
                    <span className="text-sm font-bold text-[var(--color-earth-muted)] group-hover:text-[var(--color-earth-text)] transition-earth flex items-center space-x-1">
                      <Trash2 size={14} />
                      <span>Delete branch</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pr.failureReason && (
        <div className="bg-red-50 border border-red-200 rounded-earth p-6 flex items-start space-x-4 animate-in slide-in-from-top-2">
          <div className="p-2 bg-red-100/50 rounded-lg">
            <XCircle className="text-red-700" size={24} />
          </div>
          <div>
            <h3 className="text-red-900 font-bold mb-1">Pipeline Failed</h3>
            <p className="text-red-700 text-sm leading-relaxed">
              {pr.failureReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
