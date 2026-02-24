import React from 'react';
import { Github, Settings } from 'lucide-react';
import { CILogo } from '../CILogo';
import type { AppStatus } from '../../types';

interface AppHeaderProps {
  status: AppStatus;
  owner?: string;
  repo?: string;
  onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  status,
  owner,
  repo,
  onOpenSettings,
}) => {
  const isOnline = status === 'online';

  return (
    <header className="flex-shrink-0 z-40 bg-white/70 backdrop-blur-xl border-b border-[var(--color-earth-border)] px-8 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-5">
        <div className="group cursor-pointer transition-all duration-500 hover:rotate-6 hover:scale-110 text-stone-900">
          <CILogo size={44} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tight text-stone-900 leading-none flex items-center">
            CI{' '}
            <span className="ml-1.5 px-2 py-0.5 bg-[var(--color-earth-primary)] text-white text-[10px] rounded-md tracking-widest uppercase">
              Pipeline
            </span>
          </h1>
          <div className="flex items-center space-x-2.5 mt-2">
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute w-3 h-3 rounded-full opacity-40 animate-ping ${
                  isOnline ? 'bg-orange-500' : 'bg-amber-500'
                }`}
              />
              <div
                className={`relative w-2 h-2 rounded-full ${
                  isOnline
                    ? 'bg-orange-500'
                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                }`}
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Network {status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* GitHub Context */}
        <div className="hidden lg:flex items-center space-x-3 bg-stone-100/80 px-5 py-2.5 rounded-2xl border border-stone-200/50 shadow-inner">
          <div className="p-1 bgColor-white rounded-md shadow-sm">
            <Github size={14} className="text-stone-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">
              Active Scope
            </span>
            <span className="text-[11px] font-bold text-stone-700 tracking-tight">
              {owner && repo ? `${owner}/${repo}` : 'Disconnected'}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-3 bg-stone-50 hover:bg-white rounded-2xl border border-stone-200 shadow-sm transition-all duration-300 text-stone-500 hover:text-stone-900 hover:shadow-md hover:-translate-y-0.5 group relative"
        >
          <Settings
            size={20}
            className="group-hover:rotate-45 transition-transform duration-500"
          />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-earth-primary)] rounded-full border-2 border-white scale-0 group-hover:scale-100 transition-transform shadow-sm" />
        </button>
      </div>
    </header>
  );
};
