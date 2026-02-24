import { useRef, useEffect } from 'react';
import {
  Settings,
  ChevronDown,
  Package,
  Folder,
  Terminal as TerminalIcon,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export interface AppSettings {
  terminalEnabled: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  workingDirectory: string;
  buildCommand: string;
  verboseLogging: boolean;
  logCategories: string[];
}

const SETTINGS_KEY = 'browser-ci-pipeline-settings';

const defaultSettings: AppSettings = {
  terminalEnabled: false,
  packageManager: 'npm',
  workingDirectory: '',
  buildCommand: '',
  verboseLogging: false,
  logCategories: [
    'COMMANDS',
    'FILESYSTEM',
    'NETWORK',
    'INTERNAL',
    'INSTALL',
    'BUILD',
    'TESTS',
  ],
};

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const update = (partial: Partial<AppSettings>) => {
    console.log('[DEBUG] SettingsPanel updating:', partial);
    const next = { ...settings, ...partial };
    console.log('[DEBUG] SettingsPanel next settings:', next);
    onSettingsChange(next);
    saveSettings(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pr-8 pt-24 pointer-events-none">
      <div
        ref={panelRef}
        className="w-96 bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[var(--color-earth-border)] pointer-events-auto p-8 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-stone-900 via-[var(--color-earth-primary)] to-stone-900" />

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-stone-900 rounded-xl shadow-lg">
              <Settings size={20} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-stone-900 uppercase tracking-widest text-xs">
              System Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-900"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        <div className="space-y-8">
          {/* Terminal Toggle */}
          <button
            className="w-full flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-stone-200 transition-all duration-300 group"
            onClick={() =>
              update({ terminalEnabled: !settings.terminalEnabled })
            }
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  settings.terminalEnabled
                    ? 'bg-stone-900 text-emerald-400'
                    : 'bg-white text-stone-400'
                }`}
              >
                <TerminalIcon size={18} />
              </div>
              <span className="text-sm font-bold text-stone-700">
                Interactive Terminal
              </span>
            </div>
            <div className="transition-all duration-500">
              {settings.terminalEnabled ? (
                <ToggleRight
                  size={32}
                  className="text-stone-900 fill-emerald-400"
                />
              ) : (
                <ToggleLeft size={32} className="text-stone-200" />
              )}
            </div>
          </button>

          <div className="grid grid-cols-1 gap-6">
            {/* Package Manager */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">
                <Package size={14} className="text-stone-300" />
                <span>Runtime Environment</span>
              </label>
              <select
                value={settings.packageManager}
                onChange={(e) =>
                  update({
                    packageManager: e.target
                      .value as AppSettings['packageManager'],
                  })
                }
                className="w-full bg-stone-50 border-2 border-stone-100 hover:border-stone-200 focus:border-stone-900 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 outline-none appearance-none cursor-pointer"
              >
                <option value="npm">npm (Recommended)</option>
                <option value="yarn">yarn</option>
                <option value="pnpm">pnpm</option>
              </select>
            </div>

            {/* Working Directory */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">
                <Folder size={14} className="text-stone-300" />
                <span>Working Directory</span>
              </label>
              <input
                type="text"
                value={settings.workingDirectory}
                onChange={(e) => update({ workingDirectory: e.target.value })}
                placeholder="Repository root"
                className="w-full bg-stone-50 border-2 border-stone-100 hover:border-stone-200 focus:border-stone-900 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 outline-none font-mono"
              />
            </div>

            {/* Build Command */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">
                <TerminalIcon size={14} className="text-stone-300" />
                <span>Pipeline Command</span>
              </label>
              <input
                type="text"
                value={settings.buildCommand}
                onChange={(e) => update({ buildCommand: e.target.value })}
                placeholder="Default: npm run build"
                className="w-full bg-stone-50 border-2 border-stone-100 hover:border-stone-200 focus:border-stone-900 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 outline-none font-mono"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100">
            <button
              className="w-full flex items-center justify-between p-4 bg-stone-900 rounded-2xl border border-stone-800 hover:bg-stone-800 transition-all duration-300 group shadow-lg shadow-stone-900/10 mb-4"
              onClick={() =>
                update({ verboseLogging: !settings.verboseLogging })
              }
            >
              <div className="flex items-center space-x-3 font-black uppercase tracking-widest text-[10px] text-white">
                <ToggleLeft
                  size={16}
                  className={
                    settings.verboseLogging
                      ? 'text-emerald-400'
                      : 'text-stone-500'
                  }
                />
                <span>Debug Diagnostics</span>
              </div>
              <div className="transition-all duration-500">
                {settings.verboseLogging ? (
                  <ToggleRight
                    size={24}
                    className="text-emerald-400 fill-emerald-400/20"
                  />
                ) : (
                  <ToggleLeft size={24} className="text-stone-600" />
                )}
              </div>
            </button>

            {settings.verboseLogging && (
              <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300 p-2 bg-stone-50 rounded-2xl border border-stone-100">
                {[
                  'COMMANDS',
                  'INSTALL',
                  'BUILD',
                  'TESTS',
                  'FILESYSTEM',
                  'NETWORK',
                  'INTERNAL',
                ].map((cat) => (
                  <label
                    key={cat}
                    className={`flex items-center space-x-2 cursor-pointer p-2 rounded-xl transition-all duration-200 ${
                      settings.logCategories.includes(cat)
                        ? 'bg-white shadow-sm ring-1 ring-stone-900/5'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.logCategories.includes(cat)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.logCategories, cat]
                          : settings.logCategories.filter((c) => c !== cat);
                        update({ logCategories: next });
                      }}
                      className="w-4 h-4 rounded-md border-stone-100 text-stone-900 focus:ring-stone-900 transition-all bg-stone-100"
                    />
                    <span
                      className={`text-[9px] font-black uppercase tracking-tight transition-colors ${
                        settings.logCategories.includes(cat)
                          ? 'text-stone-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
