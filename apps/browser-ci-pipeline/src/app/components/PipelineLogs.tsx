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

// High-tech Orange theme color: #FF6B00 -> H: 25, S: 100%, L: 50%
// Alternating backgrounds using HSL for contrast
const getBackgroundClass = (index: number) => {
  const hue = 25;
  // Alternating between lighter and darker variants
  const saturation = index % 2 === 0 ? '5%' : '10%';
  const lightness = index % 2 === 0 ? '8%' : '12%';
  return `bg-[hsl(${hue},${saturation},${lightness})]`;
};

// Dynamic text color based on background luminance for contrast
const getTextContrastClass = (index: number) => {
  // Use light text for all alternating backgrounds for consistent contrast
  return 'text-[#f0f0f0]';
};

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
            <Terminal size={18} className="text-orange-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400 font-mono">
                CI Pipeline Logs
              </span>
              {currentStage && (
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tighter">
                  Active Stage: {currentStage}
                </span>
              )}
            </div>
          </div>
          {currentStage && (
            <div className="flex items-center space-x-2 bg-orange-900/30 px-3 py-1.5 rounded-full border border-orange-800/50">
              <RefreshCw size={12} className="animate-spin text-orange-400" />
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
                disabled={false}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 border shadow-sm ${
                  isActive
                    ? 'bg-[var(--color-earth-primary)] text-white border-[var(--color-earth-primary)] shadow-[0_0_15px_rgba(95,113,97,0.4)] scale-105 opacity-100'
                    : isAvailable
                    ? 'bg-stone-800/80 text-stone-100 border-stone-700 hover:bg-stone-700 hover:border-stone-600 hover:shadow-md opacity-100'
                    : 'bg-stone-900/40 text-stone-600 border-stone-800 hover:border-stone-700 transition-opacity'
                }`}
              >
                {cat}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="px-3 py-1 text-[10px] text-orange-400 font-black uppercase tracking-widest hover:text-orange-300 hover:underline transition-colors"
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
              let Icon = Info;

              if (log.includes('[SUCCESS]')) {
                Icon = CheckCircle2;
              } else if (
                log.includes('[FAILURE]') ||
                log.includes('[CRITICAL]')
              ) {
                Icon = XCircle;
              } else if (log.includes('[WARNING]')) {
                Icon = AlertTriangle;
              } else if (log.includes('[COMMANDS]')) {
                Icon = Code;
              } else if (log.includes('[INTERNAL]')) {
                Icon = Cpu;
              } else if (
                log.includes('[NETWORK]') ||
                log.includes('[GitHub]')
              ) {
                Icon = Globe;
              } else if (log.includes('[INSTALL]')) {
                Icon = Package;
              } else if (log.includes('[BUILD]')) {
                Icon = Hammer;
              } else if (log.includes('[TESTS]')) {
                Icon = FlaskConical;
              } else if (log.includes('[STAGE] Starting Stage:')) {
                Icon = FastForward;
              }

              const bgClass = getBackgroundClass(i);
              const textClass = getTextContrastClass(i);

              return (
                <div
                  key={i}
                  className={`group flex items-start px-6 py-2.5 hover:bg-white/[0.04] transition-all duration-200 border-l-4 border-transparent hover:border-[var(--color-earth-primary)] ${bgClass}`}
                >
                  <div className="w-10 flex-shrink-0 flex justify-center pt-1.5">
                    <Icon
                      size={16}
                      className="text-slate-400 group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="w-12 flex-shrink-0 text-right pr-6 select-none pt-1.5">
                    <span className="text-stone-500 font-mono text-[10px] tabular-nums group-hover:text-stone-400 transition-colors">
                      {String(i + 1).padStart(3, '0')}
                    </span>
                  </div>
                  <div
                    className={`flex-1 min-w-0 ${textClass} break-words whitespace-pre-wrap pt-0.5 font-medium tracking-tight`}
                  >
                    {log.replace(
                      /\[(SUCCESS|FAILURE|CRITICAL|WARNING|COMMANDS|INTERNAL|NETWORK|GitHub|INSTALL|BUILD|TESTS|STAGE)\]\s*(\[(PASS|FAIL|RUNNING|SUMMARY)\]\s*)?/,
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
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-500">Process Running</span>
          </div>
        )}
      </div>
    </div>
  );
}
