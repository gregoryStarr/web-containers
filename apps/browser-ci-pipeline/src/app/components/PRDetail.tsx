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
  ExternalLink,
  Download,
} from 'lucide-react';
import { PR } from '../types';

interface PRDetailProps {
  pr: PR;
  onRunCI: (pr: PR) => Promise<void>;
  onSkip?: () => void;
  onMerge?: (pr: PR, deleteBranch: boolean) => Promise<void>;
  onMergeAndDeploy?: (pr: PR, deleteBranch: boolean) => Promise<void>;
  isRunning: boolean;
  isMerging: boolean;
  mergeError: string | null;
  onClearMergeError: () => void;
}

export function PRDetail({
  pr,
  onRunCI,
  onSkip,
  onMerge,
  onMergeAndDeploy,
  isRunning,
  isMerging: parentIsMerging,
  mergeError,
  onClearMergeError,
}: PRDetailProps) {
  const [deleteBranchAfterMerge, setDeleteBranchAfterMerge] = useState(true);
  const [localIsMerging, setLocalIsMerging] = useState(false);
  const [exportType, setExportType] = useState<'unsigned' | 'signed'>(
    'unsigned'
  );
  const [isExporting, setIsExporting] = useState(false);

  const isMerging = parentIsMerging || localIsMerging;

  const handleExportArtifact = async () => {
    // This will be implemented via a callback prop
    // For now, just log - actual implementation needs orchestrator access
    setIsExporting(true);
    try {
      // TODO: Call orchestrator to create and download artifact
      console.log('Exporting artifact as:', exportType);
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-2">
      <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--color-earth-border)] overflow-hidden">
        <div className="p-4">
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex items-center space-x-3 text-[var(--color-earth-muted)] mb-3">
                <span className="text-[10px] font-black bg-stone-900 text-white px-2 py-0.5 rounded-md uppercase tracking-widest shadow-md">
                  PR #{pr.number}
                </span>
                <ChevronRight size={14} className="text-stone-300" />
                <div className="flex items-center space-x-1.5 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 text-[10px] font-bold text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="truncate max-w-sm font-mono">
                    {pr.head?.ref || 'unknown'}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight leading-tight mb-4">
                {pr.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-md transition-all duration-300 ${
                    pr.status === 'success'
                      ? 'bg-orange-500 text-white shadow-orange-500/20'
                      : pr.status === 'failure'
                      ? 'bg-rose-500 text-white shadow-rose-500/20'
                      : pr.status === 'running'
                      ? 'bg-amber-500 text-white shadow-amber-500/20'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {pr.status === 'success' && <CheckCircle2 size={14} />}
                  {pr.status === 'failure' && <XCircle size={14} />}
                  {pr.status === 'running' && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  )}
                  <span>Status: {pr.status}</span>
                </span>

                {pr.lastRun && (
                  <span className="flex items-center text-xs text-[var(--color-earth-muted)] font-medium">
                    <Info size={14} className="mr-1 text-stone-400" />
                    Last run: {pr.lastRun.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    // @ts-expect-error - Umami is loaded via script tag
                    if (window.umami) {
                      // @ts-expect-error - Umami is loaded via script tag
                      window.umami.track('run-ci-pipeline');
                    }
                    onRunCI(pr);
                  }}
                  disabled={isRunning || isMerging}
                  className="flex items-center space-x-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-stone-900/20 hover:-translate-y-0.5 active:scale-95"
                >
                  {isRunning ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} className="fill-current" />
                  )}
                  <span>
                    {isRunning ? 'Executing Pipeline...' : 'Run CI Pipeline'}
                  </span>
                </button>

                {isRunning && onSkip && (
                  <button
                    onClick={onSkip}
                    className="flex items-center space-x-3 bg-white hover:bg-stone-50 text-amber-600 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 border-amber-100 shadow-sm hover:shadow-md active:scale-95"
                    title="Force the current stage to complete successfully"
                  >
                    <SkipForward size={18} fill="currentColor" />
                    <span>Skip Stage</span>
                  </button>
                )}
              </div>

              {pr.status === 'success' && !isRunning && (
                <div className="flex flex-wrap items-center gap-6 bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMerge}
                      disabled={isMerging}
                      className="flex items-center space-x-3 bg-white hover:bg-stone-50 text-stone-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 border-stone-200 shadow-sm hover:shadow-md"
                    >
                      <GitMerge size={18} />
                      <span>Standard Merge</span>
                    </button>
                    <button
                      onClick={handleMergeAndDeploy}
                      disabled={isMerging}
                      className="flex items-center space-x-3 bg-[var(--color-earth-primary)] hover:brightness-110 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-[var(--color-earth-primary)]/20"
                    >
                      <Rocket size={18} />
                      <span>Merge & Ship</span>
                    </button>
                    {pr.htmlUrl && (
                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 bg-stone-800 hover:bg-stone-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-stone-900/20"
                      >
                        <ExternalLink size={18} />
                        <span>View PR</span>
                      </a>
                    )}
                    {/* Export Artifact Button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleExportArtifact}
                        disabled={isExporting}
                        className="flex items-center space-x-3 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-stone-900/20"
                      >
                        {isExporting ? (
                          <RefreshCw className="animate-spin" size={18} />
                        ) : (
                          <Download size={18} />
                        )}
                        <span>Export</span>
                      </button>
                      <div className="flex items-center gap-2 bg-stone-800 px-3 py-2 rounded-xl">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`export-${pr.id}`}
                            value="unsigned"
                            checked={exportType === 'unsigned'}
                            onChange={() => setExportType('unsigned')}
                            className="accent-orange-500"
                          />
                          <span className="text-[10px] font-bold text-stone-300 uppercase">
                            Unsigned
                          </span>
                        </label>
                        <span className="text-stone-500">|</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`export-${pr.id}`}
                            value="signed"
                            checked={exportType === 'signed'}
                            onChange={() => setExportType('signed')}
                            className="accent-orange-500"
                          />
                          <span className="text-[10px] font-bold text-stone-300 uppercase">
                            Signed
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center space-x-3 cursor-pointer group px-4 py-2 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-rose-200 transition-colors">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteBranchAfterMerge}
                        onChange={(e) =>
                          setDeleteBranchAfterMerge(e.target.checked)
                        }
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-stone-200 transition-all checked:bg-rose-500 checked:border-rose-500"
                      />
                      <Trash2
                        size={12}
                        className="absolute left-[4px] opacity-0 peer-checked:opacity-100 text-white transition-opacity"
                      />
                    </div>
                    <span className="text-[10px] font-black text-stone-400 group-hover:text-rose-500 uppercase tracking-widest transition-earth">
                      Delete Origin
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pr.failureReason && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[32px] p-8 flex items-start space-x-6 animate-in slide-in-from-top-4 duration-500 shadow-sm">
          <div className="p-4 bg-rose-500 rounded-2xl shadow-lg">
            <XCircle className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-rose-900 text-lg font-black uppercase tracking-wider mb-2">
              Pipeline Execution Failed
            </h3>
            <p className="text-rose-700 font-medium leading-relaxed">
              {pr.failureReason}
            </p>
          </div>
        </div>
      )}

      {mergeError && (
        <div className="bg-amber-50 border-2 border-amber-100 rounded-[32px] p-8 flex items-start space-x-6 animate-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <GitMerge size={80} className="text-amber-900" />
          </div>
          <div className="p-4 bg-stone-900 rounded-2xl shadow-lg shrink-0">
            <GitMerge className="text-amber-400" size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-900 text-lg font-black uppercase tracking-wider">
                Branch Conciliation Error
              </h3>
              <button
                onClick={onClearMergeError}
                className="p-2 bg-stone-900/5 hover:bg-stone-900/10 rounded-full transition-colors group"
                title="Dismiss error"
              >
                <XCircle
                  size={20}
                  className="text-stone-400 group-hover:text-stone-600"
                />
              </button>
            </div>
            <p className="text-amber-800 font-bold leading-relaxed whitespace-pre-wrap selection:bg-amber-200">
              {mergeError}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
