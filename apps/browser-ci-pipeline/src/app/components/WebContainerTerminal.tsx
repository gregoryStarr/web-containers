import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Terminal as TerminalIcon,
  ChevronUp,
  ChevronDown,
  Monitor,
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import type { WebContainer } from '@webcontainer/api';

interface WebContainerTerminalProps {
  container: WebContainer | null;
}

export function WebContainerTerminal({ container }: WebContainerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellWriterRef = useRef<WritableStreamDefaultWriter | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: '#0a0a0a', // deep charcoal
        foreground: '#f3f4f6', // gray-100
        cursor: '#FF6B00', // vibrant orange
        selectionBackground: 'rgba(255, 107, 0, 0.3)',
        black: '#000000',
        red: '#ef4444',
        green: '#FF6B00', // Override green with orange for high-tech highlight
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f3f4f6',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Spawn jsh shell
    const startShell = async () => {
      try {
        const shellProcess = await container.spawn('jsh', {
          terminal: { cols: term.cols, rows: term.rows },
        });

        // Pipe shell output to xterm
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              term.write(data);
            },
          })
        );

        // Pipe xterm input to shell
        const writer = shellProcess.input.getWriter();
        shellWriterRef.current = writer;

        term.onData((data) => {
          writer.write(data);
        });

        setIsReady(true);
      } catch (err) {
        term.writeln(`\r\n\x1b[31mFailed to start shell: ${err}\x1b[0m`);
      }
    };

    startShell();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      shellWriterRef.current?.close().catch(() => {
        /* ignore */
      });
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      shellWriterRef.current = null;
      setIsReady(false);
    };
  }, [container]);

  // Re-fit when collapsed state changes
  useEffect(() => {
    if (!isCollapsed && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isCollapsed]);

  return (
    <div className="bg-[var(--color-forest-dark)] border-t border-orange-900 shadow-2xl transition-earth">
      {/* Terminal header bar */}
      <div
        className="flex items-center justify-between px-6 py-2 bg-stone-900 cursor-pointer select-none group"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-orange-500">
            <TerminalIcon size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">
              Live Terminal
            </span>
          </div>
          {isReady ? (
            <div className="flex items-center space-x-1.5 text-orange-400 bg-orange-900/30 px-3 py-1 rounded-full border border-orange-800/50">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                Connected
              </span>
            </div>
          ) : container ? (
            <div className="flex items-center space-x-1.5 text-amber-400 bg-amber-900/30 px-3 py-1 rounded-full border border-amber-800/50">
              <RefreshCwIcon size={10} className="animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                Initializing...
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center space-x-2 text-stone-500 group-hover:text-stone-300 transition-earth">
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isCollapsed ? 'Expand' : 'Collapse'}
          </span>
          {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          height: isCollapsed ? 0 : '320px',
          padding: isCollapsed ? 0 : '12px 24px 24px 24px',
        }}
      />
    </div>
  );
}

function RefreshCwIcon({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}
