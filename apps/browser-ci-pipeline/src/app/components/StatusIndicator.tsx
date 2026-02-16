interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'booting' | 'busy';
}

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online' },
  offline: { color: 'bg-red-500', label: 'Offline' },
  booting: { color: 'bg-yellow-500', pulse: true, label: 'Booting...' },
  busy: { color: 'bg-yellow-500', label: 'Busy' },
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${config.color} ${
          'pulse' in config && config.pulse ? 'animate-pulse' : ''
        }`}
      ></div>
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  );
}
