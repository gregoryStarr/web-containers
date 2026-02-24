import { useRef, useEffect, useState } from 'react';
import {
  Terminal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code,
  Cpu,
  Globe,
  FastForward,
  Info,
  Package,
  Hammer,
  FlaskConical,
  Terminal as TerminalIcon,
} from 'lucide-react';

interface PipelineLogsProps {
  logs: string[];
  isVisible: boolean;
  currentStage?: string;
}

const CATEGORIES = [
  'COMMANDS',
  'INSTALL',
  'BUILD',
  'TESTS',
  'FILESYSTEM',
  'NETWORK',
  'INTERNAL',
];

export function PipelineLogs({
  logs,
  isVisible,
  currentStage,
}: PipelineLogsProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleFilter = (cat: string) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.some((filter) => log.includes(`[${filter}]`));
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isVisible, filteredLogs]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--color-forest-dark)] border-l border-[var(--color-earth-border)] shadow-xl overflow-hidden animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="bg-stone-900/50 px-6 py-4 border-b border-stone-800 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-800/50">
          {CATEGORIES.map((cat) => {
            const isActive = activeFilters.includes(cat);
            const isAvailable = logs.some((log) => log.includes(`[${cat}]`));

            return (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                disabled={!isAvailable && !isActive}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 border shadow-sm ${
                  isActive
                    ? 'bg-[var(--color-earth-primary)] text-white border-[var(--color-earth-primary)] shadow-[0_0_15px_rgba(95,113,97,0.4)] scale-105'
                    : isAvailable
                    ? 'bg-stone-800/80 text-stone-100 border-stone-700 hover:bg-stone-700 hover:border-stone-600 hover:shadow-md'
                    : 'bg-stone-900/40 text-stone-600 border-transparent opacity-40 cursor-not-allowed'
                }`}
              >
                {cat}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="px-3 py-1 text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:text-emerald-300 hover:underline transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent bg-[#1e2022]"
      >
        {filteredLogs.length > 0 ? (
          <div className="flex flex-col min-w-full divide-y divide-white/5">
            {filteredLogs.map((log, i) => {
              let textClass = 'text-stone-300';
              let Icon = Info;
              let iconClass = 'text-stone-500';

              if (log.includes('[SUCCESS]')) {
                textClass = 'text-emerald-300 font-bold';
                Icon = CheckCircle2;
                iconClass = 'text-emerald-400';
              } else if (
                log.includes('[FAILURE]') ||
                log.includes('[CRITICAL')
              ) {
                textClass = 'text-rose-300 font-bold';
                Icon = XCircle;
                iconClass = 'text-rose-400';
              } else if (log.includes('[WARNING]')) {
                textClass = 'text-amber-200';
                Icon = AlertTriangle;
                iconClass = 'text-amber-400';
              } else if (log.includes('[COMMANDS]')) {
                textClass = 'text-sky-100 font-semibold italic';
                Icon = Code;
                iconClass = 'text-sky-300';
              } else if (log.includes('[INTERNAL]')) {
                textClass = 'text-stone-300 text-[11px] opacity-70';
                Icon = Cpu;
                iconClass = 'text-stone-500';
              } else if (
                log.includes('[NETWORK]') ||
                log.includes('[GitHub]')
              ) {
                textClass = 'text-indigo-100';
                Icon = Globe;
                iconClass = 'text-indigo-300';
              } else if (log.includes('[INSTALL]')) {
                textClass = 'text-stone-300';
                Icon = Package;
                iconClass = 'text-stone-400';
              } else if (log.includes('[BUILD]')) {
                textClass = 'text-zinc-300';
                Icon = Hammer;
                iconClass = 'text-zinc-400';
              } else if (log.includes('[TESTS]')) {
                textClass = 'text-slate-300';
                Icon = FlaskConical;
                iconClass = 'text-slate-400';
              } else if (log.includes('🔄 Starting Stage:')) {
                textClass =
                  'text-white font-black uppercase tracking-[0.2em] py-4 bg-white/10 shadow-lg my-2';
                Icon = FastForward;
                iconClass = 'text-white scale-125';
              }

              const isEven = i % 2 === 0;

              return (
                <div
                  key={i}
                  className={`group flex items-start px-6 py-2.5 hover:bg-white/[0.04] transition-all duration-200 border-l-4 border-transparent hover:border-[var(--color-earth-primary)] ${
                    isEven ? 'bg-white/[0.01]' : ''
                  }`}
                >
                  <div className="w-10 flex-shrink-0 flex justify-center pt-1">
                    <div
                      className={`p-1.5 rounded-lg bg-black/20 border border-white/5 group-hover:border-white/10 transition-colors ${iconClass
                        .replace('text-', 'bg-')
                        .replace('300', '900/20')}`}
                    >
                      <Icon
                        size={14}
                        className={`${iconClass} group-hover:scale-110 transition-transform`}
                      />
                    </div>
                  </div>
                  <div className="w-12 flex-shrink-0 text-right pr-6 select-none pt-1.5">
                    <span className="text-stone-700 font-mono text-[10px] tabular-nums group-hover:text-stone-500 transition-colors">
                      {String(i + 1).padStart(3, '0')}
                    </span>
                  </div>
                  <div
                    className={`flex-1 min-w-0 ${textClass} break-words whitespace-pre-wrap pt-0.5 font-medium tracking-tight`}
                  >
                    {log.replace(
                      /\[(SUCCESS|FAILURE|CRITICAL|WARNING|COMMANDS|INTERNAL|NETWORK|GitHub|INSTALL|BUILD|TESTS)\]\s*/,
                      ''
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-stone-500 italic space-y-4 py-20">
            <TerminalIcon size={48} className="opacity-20" />
            <p className="max-w-[200px] text-center text-sm not-italic font-sans font-medium">
              {logs.length > 0
                ? 'No logs match the selected filters.'
                : 'Pipeline logs will appear here during execution.'}
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-stone-900/80 border-t border-stone-800 flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest">
        <span>{filteredLogs.length} Lines</span>
        {currentStage && (
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500">Process Running</span>
          </div>
        )}
      </div>
    </div>
  );
}
