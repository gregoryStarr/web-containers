import { useState, useRef, useEffect } from 'react';

export interface AppSettings {
  terminalEnabled: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  workingDirectory: string;
  buildCommand: string;
}

const SETTINGS_KEY = 'browser-ci-pipeline-settings';

const defaultSettings: AppSettings = {
  terminalEnabled: false,
  packageManager: 'npm',
  workingDirectory: '',
  buildCommand: '',
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
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    onSettingsChange(next);
    saveSettings(next);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-1 text-sm border px-3 py-1 rounded-full"
        title="Settings"
      >
        <span>⚙️</span>
        <span>Settings</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
            Pipeline Settings
          </h3>

          {/* Terminal Toggle */}
          <label className="flex items-center justify-between mb-4 cursor-pointer">
            <span className="text-sm text-gray-600">Enable Terminal</span>
            <div
              onClick={() =>
                update({ terminalEnabled: !settings.terminalEnabled })
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${
                settings.terminalEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.terminalEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </label>
          {/* Package Manager */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Package Manager
            </label>
            <select
              value={settings.packageManager}
              onChange={(e) =>
                update({
                  packageManager: e.target
                    .value as AppSettings['packageManager'],
                })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="npm">npm</option>
              <option value="yarn">yarn</option>
              <option value="pnpm">pnpm</option>
            </select>
          </div>

          {/* Working Directory */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={settings.workingDirectory}
              onChange={(e) => update({ workingDirectory: e.target.value })}
              placeholder="e.g. packages/app (default: root)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty for project root
            </p>
          </div>

          {/* Build Command */}
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">
              Build Command
            </label>
            <input
              type="text"
              value={settings.buildCommand}
              onChange={(e) => update({ buildCommand: e.target.value })}
              placeholder="e.g. npm run build (default)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Override the default build command
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
