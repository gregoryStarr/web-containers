import { useEffect, useRef } from 'react';

interface DebugLogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}

export function DebugLogSidebar({
  isOpen,
  onClose,
  logs,
}: DebugLogSidebarProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  return (
    <div
      className={`fixed inset-y-0 right-0 w-96 bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-white font-semibold flex items-center">
          <span className="mr-2">📋</span> Debug Logs
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-gray-300 space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic text-center mt-10">
            No logs yet...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="break-all hover:bg-gray-800 rounded px-1"
            >
              {log}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 text-center">
        {logs.length} lines captured
      </div>
    </div>
  );
}
