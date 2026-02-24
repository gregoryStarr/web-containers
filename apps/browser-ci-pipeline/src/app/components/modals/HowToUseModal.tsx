import React from 'react';
import { BookOpen, X } from 'lucide-react';
import type { HowToUseStep } from '../../types';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const howToUseSteps: HowToUseStep[] = [
  {
    step: '01',
    title: 'Authenticate',
    desc: 'Enter your GitHub personal access token in the Source Control panel. ',
    subDesc:
      'Navigate to your personal settings, by clicking on your profile photo in the upper right corner and selecting Settings. In the left sidebar, click Personal access tokens. Click Generate new token. In the "Note" field enter a descriptive name for your token. To set an expiration for your token, select Expiration, then choose a default option or click Custom to enter a date. Select the scopes you\'d like to grant this token. Keep in mind, to use your token to access repositories from the command line, you should select repo. Click Generate token. Optionally, click the clipboard icon to copy the new token',
  },
  {
    step: '02',
    title: 'Connect',
    desc: 'Select the organization and repository you want to monitor.',
    subDesc: '',
  },
  {
    step: '03',
    title: 'Sync',
    desc: 'Click "Sync Repository" to fetch the latest pull requests.',
    subDesc: '',
  },
  {
    step: '04',
    title: 'Run Pipeline',
    desc: 'Select a PR and click "Run CI Pipeline" to execute your build tasks.',
    subDesc: '',
  },
];

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-stone-100 rounded-xl">
                <BookOpen size={20} className="text-stone-600" />
              </div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest text-sm">
                How to Use
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            {howToUseSteps.map((item) => (
              <div
                key={item.step}
                className="flex space-x-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors"
              >
                <div className="text-lg font-black text-[var(--color-earth-primary)] opacity-30">
                  {item.step}
                </div>
                <div>
                  <div className="text-sm font-black text-stone-900">
                    {item.title}
                  </div>
                  <div className="text-xs font-bold text-stone-500 mt-0.5">
                    {item.desc}
                  </div>
                  <div className="text-xs font-normal text-stone-500 mt-0.5 opacity-70">
                    {item.subDesc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
