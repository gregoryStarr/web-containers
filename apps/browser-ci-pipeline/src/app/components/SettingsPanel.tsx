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
  logCategories: ['COMMANDS', 'FILESYSTEM', 'NETWORK', 'INTERNAL'],
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
    const next = { ...settings, ...partial };
    onSettingsChange(next);
    saveSettings(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pr-8 pt-20 pointer-events-none">
      <div
        ref={panelRef}
        className="w-80 bg-white rounded-earth shadow-2xl border border-[var(--color-earth-border)] pointer-events-auto p-6 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            <Settings size={18} className="text-[var(--color-earth-primary)]" />
            <h3 className="text-sm font-bold tracking-tight text-[var(--color-earth-text)]">
              Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Terminal Toggle */}
          <div
            className="flex items-center justify-between cursor-pointer group"
            onClick={() =>
              update({ terminalEnabled: !settings.terminalEnabled })
            }
          >
            <div className="flex items-center space-x-2">
              <TerminalIcon
                size={16}
                className="text-[var(--color-earth-muted)]"
              />
              <span className="text-sm font-semibold text-stone-700">
                Enable Terminal
              </span>
            </div>
            <div className="transition-earth text-[var(--color-earth-primary)]">
              {settings.terminalEnabled ? (
                <ToggleRight
                  size={28}
                  className="fill-[var(--color-earth-primary)] text-white"
                />
              ) : (
                <ToggleLeft size={28} className="text-stone-300" />
              )}
            </div>
          </div>

          {/* Package Manager */}
          <div>
            <label className="flex items-center space-x-2 text-xs font-bold text-[var(--color-earth-muted)] uppercase tracking-wider mb-2">
              <Package size={14} />
              <span>Package Manager</span>
            </label>
            <select
              value={settings.packageManager}
              onChange={(e) =>
                update({
                  packageManager: e.target
                    .value as AppSettings['packageManager'],
                })
              }
              className="w-full px-3 py-2 text-sm border border-[var(--color-earth-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-earth-primary)] bg-stone-50 transition-earth font-medium"
            >
              <option value="npm">npm</option>
              <option value="yarn">yarn</option>
              <option value="pnpm">pnpm</option>
            </select>
          </div>

          {/* Working Directory */}
          <div>
            <label className="flex items-center space-x-2 text-xs font-bold text-[var(--color-earth-muted)] uppercase tracking-wider mb-2">
              <Folder size={14} />
              <span>Working Directory</span>
            </label>
            <input
              type="text"
              value={settings.workingDirectory}
              onChange={(e) => update({ workingDirectory: e.target.value })}
              placeholder="e.g. packages/app"
              className="w-full px-3 py-2 text-sm border border-[var(--color-earth-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-earth-primary)] bg-stone-50 transition-earth font-mono"
            />
            <p className="text-[10px] text-[var(--color-earth-muted)] mt-1.5 italic font-medium">
              Defaults to root if empty
            </p>
          </div>

          {/* Build Command */}
          <div>
            <label className="flex items-center space-x-2 text-xs font-bold text-[var(--color-earth-muted)] uppercase tracking-wider mb-2">
              <TerminalIcon size={14} />
              <span>Build Command</span>
            </label>
            <input
              type="text"
              value={settings.buildCommand}
              onChange={(e) => update({ buildCommand: e.target.value })}
              placeholder="e.g. npm run build"
              className="w-full px-3 py-2 text-sm border border-[var(--color-earth-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-earth-primary)] bg-stone-50 transition-earth font-mono"
            />
            <p className="text-[10px] text-[var(--color-earth-muted)] mt-1.5 italic font-medium">
              Overrides the default npm run build
            </p>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <div
              className="flex items-center justify-between cursor-pointer group mb-4"
              onClick={() =>
                update({ verboseLogging: !settings.verboseLogging })
              }
            >
              <div className="flex items-center space-x-2">
                <ToggleLeft
                  size={16}
                  className="text-[var(--color-earth-muted)]"
                />
                <span className="text-sm font-semibold text-stone-700">
                  Verbose Logging
                </span>
              </div>
              <div className="transition-earth text-[var(--color-earth-primary)]">
                {settings.verboseLogging ? (
                  <ToggleRight
                    size={24}
                    className="fill-[var(--color-earth-primary)] text-white"
                  />
                ) : (
                  <ToggleLeft size={24} className="text-stone-300" />
                )}
              </div>
            </div>

            {settings.verboseLogging && (
              <div className="space-y-2 pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
                {['COMMANDS', 'FILESYSTEM', 'NETWORK', 'INTERNAL'].map(
                  (cat) => (
                    <label
                      key={cat}
                      className="flex items-center space-x-2 cursor-pointer group"
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
                        className="w-3.5 h-3.5 rounded border-stone-300 text-[var(--color-earth-primary)] focus:ring-[var(--color-earth-primary)] transition-earth"
                      />
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider group-hover:text-stone-700 transition-colors">
                        {cat}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
