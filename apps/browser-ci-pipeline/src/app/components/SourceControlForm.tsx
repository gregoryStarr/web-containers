import React from 'react';
import { RefreshCw, ChevronDown, Database } from 'lucide-react';
import type { AppStatus } from '../types';

interface SourceControlFormProps {
  token: string;
  onTokenChange: (value: string) => void;
  gitOwner: string;
  onOwnerChange: (value: string) => void;
  gitRepo: string;
  onRepoChange: (value: string) => void;
  availableRepos: string[];
  isFetchingRepos: boolean;
  onFetchRepos: () => void;
  onSyncPRs: () => void;
  status: AppStatus;
  disabled?: boolean;
}

export const SourceControlForm: React.FC<SourceControlFormProps> = ({
  token,
  onTokenChange,
  gitOwner,
  onOwnerChange,
  gitRepo,
  onRepoChange,
  availableRepos,
  isFetchingRepos,
  onFetchRepos,
  onSyncPRs,
  status,
  disabled = false,
}) => {
  const isOwnerDisabled = disabled || !token;
  const isRepoDisabled = disabled || !gitOwner;
  const canSync = gitOwner && gitRepo && !disabled;

  return (
    <section className="bg-white rounded-[24px] border border-[var(--color-earth-border)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-5 relative">
      <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-[0.03]">
        <Database size={120} className="text-stone-900" />
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <div className="p-3 bg-[var(--color-earth-bg)] rounded-2xl border border-[var(--color-earth-border)]">
          <Database size={24} className="text-[var(--color-earth-primary)]" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Source Control
          </h2>
          <p className="text-sm text-stone-500 font-medium">
            Configure your GitHub connection to sync pull requests
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end relative z-10">
        {/* Token Input */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
            Authorization Token
          </label>
          <div className="relative group">
            <input
              type="password"
              value={window.location.hostname === 'localhost' ? token : ''}
              onChange={(e) => onTokenChange(e.target.value)}
              className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 outline-none shadow-sm"
              placeholder="ghp_..."
            />
          </div>
        </div>

        {/* Owner Input with Fetch Button */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
            Owner / Organization
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative group flex-1">
              <input
                type="text"
                value={gitOwner}
                disabled={isOwnerDisabled}
                onChange={(e) => onOwnerChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onFetchRepos();
                  }
                }}
                className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 outline-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={token ? 'e.g., gregoryStarr' : 'Enter token first'}
              />
            </div>
            <button
              type="button"
              onClick={onFetchRepos}
              disabled={!token || !gitOwner || isFetchingRepos}
              className="px-4 py-3 bg-stone-900 hover:bg-stone-800 border-2 border-stone-900 text-stone-100 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
            >
              {isFetchingRepos ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                'Fetch'
              )}
            </button>
          </div>
        </div>

        {/* Repository Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
            Repository Name
          </label>
          <div className="relative group">
            <select
              value={gitRepo}
              disabled={isRepoDisabled}
              onChange={(e) => onRepoChange(e.target.value)}
              className="w-full bg-stone-50/50 border-2 border-stone-100 hover:border-stone-200 focus:border-[var(--color-earth-primary)] focus:bg-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 outline-none shadow-sm appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                {token && gitOwner ? 'Select Repository' : 'Select owner first'}
              </option>
              {token && gitOwner && (
                <>
                  {!availableRepos.includes(gitRepo) && gitRepo && (
                    <option value={gitRepo}>{gitRepo}</option>
                  )}
                  {availableRepos.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo}
                    </option>
                  ))}
                </>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400 group-hover:text-stone-600 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <div>
          <button
            onClick={onSyncPRs}
            disabled={!canSync}
            className="w-full bg-stone-900 border-2 border-stone-900 hover:bg-stone-800 hover:border-stone-800 text-stone-100 font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={status === 'busy' ? 'animate-spin' : ''}
            />
            <span>Sync Repository</span>
          </button>
        </div>
      </div>
    </section>
  );
};
