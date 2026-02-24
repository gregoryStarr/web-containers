import React from 'react';
import { Github, Info, X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
                <Info size={20} className="text-stone-600" />
              </div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest text-sm">
                About CI Pipeline
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-6">
            <p className="text-stone-600 text-sm leading-relaxed font-medium">
              The CI Pipeline Platform is a browser-based continuous integration
              tool powered by StackBlitz WebContainers. It allows you to run
              your build and test pipelines directly in your browser with full
              filesystem and terminal support.
            </p>
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">
                Author Information
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-stone-900">
                    Astralis One
                  </div>
                  <div className="text-xs font-bold text-stone-500">
                    Engineer: Gregory Starr
                  </div>
                </div>
                <a
                  href="https://github.com/gregoryStarr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white rounded-xl shadow-sm border border-stone-200 hover:border-stone-900 transition-all group"
                >
                  <Github
                    size={20}
                    className="text-stone-400 group-hover:text-stone-900 transition-colors"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
