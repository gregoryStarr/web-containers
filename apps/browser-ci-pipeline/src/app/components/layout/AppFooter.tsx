import React from 'react';
import { Info, BookOpen, Heart, ExternalLink } from 'lucide-react';

interface AppFooterProps {
  onOpenAbout: () => void;
  onOpenHowToUse: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenAbout,
  onOpenHowToUse,
}) => {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <footer className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-stone-200 px-10 py-4 flex items-center justify-between z-30">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
          <span>&copy; {currentYear}</span>
          <span className="w-1 h-1 bg-stone-300 rounded-full" />
          <span>{currentDate}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenAbout}
            className="text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors flex items-center space-x-1.5"
          >
            <Info size={12} />
            <span>About</span>
          </button>
          <button
            onClick={onOpenHowToUse}
            className="text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors flex items-center space-x-1.5"
          >
            <BookOpen size={12} />
            <span>How to Use</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-[10px] font-bold text-stone-400">
        <span>Made with</span>
        <Heart
          size={12}
          className="text-rose-500 fill-rose-500 animate-pulse"
        />
        <span>by</span>
        <a
          href="https://github.com/gregoryStarr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-600 hover:text-stone-900 transition-colors flex items-center space-x-1"
        >
          <span>Gregory Starr</span>
          <ExternalLink size={10} />
        </a>
        <span className="mx-1 text-stone-300">|</span>
        <a
          href="https://stackblitz.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-earth-primary)] font-black hover:opacity-80 transition-opacity"
        >
          StackBlitz WebContainers
        </a>
      </div>
    </footer>
  );
};
