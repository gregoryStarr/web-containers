import { CheckCircle2, Loader2, Signal } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'booting' | 'busy';
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const configs = {
    online: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      icon: <CheckCircle2 size={14} />,
      label: 'System Ready',
    },
    offline: {
      color: 'text-stone-400',
      bg: 'bg-stone-50',
      border: 'border-stone-100',
      icon: <Signal size={14} />,
      label: 'Offline',
    },
    booting: {
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: <Loader2 size={14} className="animate-spin" />,
      label: 'Initializing',
    },
    busy: {
      color: 'text-[var(--color-earth-primary)]',
      bg: 'bg-[var(--color-earth-secondary)]/20',
      border: 'border-[var(--color-earth-secondary)]/30',
      icon: <Loader2 size={14} className="animate-spin" />,
      label: 'Processing',
    },
  };

  const config = configs[status];

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${config.border} ${config.bg} transition-earth shadow-sm`}
    >
      <span className={config.color}>{config.icon}</span>
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${config.color.replace(
          'text-',
          'text-opacity-80 text-'
        )}`}
      >
        {config.label}
      </span>
    </div>
  );
}
