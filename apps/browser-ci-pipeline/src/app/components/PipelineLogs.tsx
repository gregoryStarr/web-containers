import { useRef, useEffect } from 'react';
import { Terminal, RefreshCw } from 'lucide-react';

interface PipelineLogsProps {
  logs: string[];
  currentStage?: string;
  isVisible: boolean;
}

export function PipelineLogs({
  logs,
  currentStage,
  isVisible,
}: PipelineLogsProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--color-forest-dark)] border-l border-[var(--color-earth-border)] shadow-xl overflow-hidden animate-in slide-in-from-right duration-500">
      <div className="bg-stone-900/50 px-6 py-4 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Terminal size={18} className="text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400 font-mono">
              CI Pipeline Logs
            </span>
            {currentStage && (
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">
                Active Stage: {currentStage}
              </span>
            )}
          </div>
        </div>
        {currentStage && (
          <div className="flex items-center space-x-2 bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-800/50">
            <RefreshCw size={12} className="animate-spin text-emerald-400" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
        {logs.length > 0 ? (
          <div className="space-y-1.5">
            {logs.map((log, i) => {
              // Determine log style based on content
              let textClass = 'text-stone-300';
              if (log.includes('[SUCCESS]'))
                textClass = 'text-emerald-400 font-bold';
              else if (log.includes('[FAILURE]') || log.includes('[CRITICAL'))
                textClass = 'text-rose-400 font-bold';
              else if (log.includes('[WARNING]')) textClass = 'text-amber-400';
              else if (log.includes('[COMMANDS]'))
                textClass = 'text-sky-300 font-medium italic';
              else if (log.includes('[INTERNAL]'))
                textClass = 'text-stone-500 text-[11px]';
              else if (log.includes('[NETWORK]') || log.includes('[GitHub]'))
                textClass = 'text-indigo-300';
              else if (log.includes('🔄 Starting Stage:'))
                textClass =
                  'text-white font-black border-b border-stone-700 pb-0.5 mt-4 block';

              return (
                <div
                  key={i}
                  className={`${textClass} break-words hover:bg-white/5 transition-colors px-2 py-0.5 rounded flex items-start`}
                >
                  <span className="text-stone-600 mr-4 select-none inline-block w-8 text-right font-mono text-[11px] shrink-0 pt-0.5">
                    {i + 1}
                  </span>
                  <span>{log}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-stone-500 italic space-y-4">
            <Terminal size={48} className="opacity-20" />
            <p className="max-w-[200px] text-center text-sm not-italic font-sans font-medium">
              Pipeline logs will appear here during execution.
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-stone-900/80 border-t border-stone-800 flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest">
        <span>{logs.length} Lines</span>
        {currentStage && (
          <span className="text-emerald-500">Process Running</span>
        )}
      </div>
    </div>
  );
}
