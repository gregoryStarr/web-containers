import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: '#585b7066',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e1e2e] border-t border-gray-700 shadow-2xl">
      {/* Terminal header bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 bg-[#181825] cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm">⬛</span>
          <span className="text-sm font-medium text-gray-300">
            WebContainer Terminal
          </span>
          {isReady && (
            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
          {!isReady && container && (
            <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
              Connecting...
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-white text-sm transition-colors">
          {isCollapsed ? '▲ Expand' : '▼ Collapse'}
        </button>
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="transition-all duration-200 overflow-hidden"
        style={{
          height: isCollapsed ? 0 : '280px',
          padding: isCollapsed ? 0 : '8px',
        }}
      />
    </div>
  );
}
