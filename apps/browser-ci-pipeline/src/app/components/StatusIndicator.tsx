interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy';
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const color = status === 'online' ? 'bg-green-500' :
                status === 'busy' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <span className="text-sm text-gray-600 capitalize">{status}</span>
    </div>
  );
}