import { X, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PRMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prUrl: string;
  prNumber: number;
}

export function PRMergeModal({
  isOpen,
  onClose,
  prUrl,
  prNumber,
}: PRMergeModalProps) {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Reset iframe when modal opens
      setIframeKey((prev) => prev + 1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Transform GitHub PR URL to the merge URL format
  const mergeUrl = prUrl.replace('/pull/', '/pull/') + '/merge';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-stone-900 rounded-2xl shadow-lg">
              <ExternalLink className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 uppercase tracking-wider">
                Merge PR #{prNumber}
              </h2>
              <p className="text-sm text-stone-500 font-medium">
                Review and merge directly on GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white hover:bg-stone-100 rounded-2xl border border-stone-200 shadow-sm transition-all duration-200 hover:scale-105"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 min-h-0 bg-stone-100">
          <iframe
            key={iframeKey}
            src={mergeUrl}
            className="w-full h-[60vh] border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            title={`GitHub PR #${prNumber} merge page`}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-stone-100 bg-white">
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ExternalLink size={16} />
            <span>Open in GitHub</span>
          </a>
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex items-center space-x-3 bg-stone-100 hover:bg-stone-200 text-stone-700 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 border-stone-200"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center space-x-3 bg-[var(--color-earth-primary)] hover:brightness-110 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-lg"
            >
              <ExternalLink size={16} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
