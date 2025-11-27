import React from 'react';

interface Props {
  isReviewing: boolean;
}

const Footer: React.FC<Props> = ({ isReviewing }) => {
  return (
    <footer className={`flex-none py-2 border-t text-xs transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <div className="flex gap-4">
          <span className="flex items-center gap-1" title="Generate one line"><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded border dark:border-slate-700 font-sans">Ctrl+1</kbd> Line</span>
          <span className="flex items-center gap-1" title="Generate paragraph"><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded border dark:border-slate-700 font-sans">Ctrl+2</kbd> Paragraph</span>
        </div>
        <div className="flex gap-4">
          {isReviewing && (
            <span className="flex items-center gap-1 animate-pulse text-indigo-500"><kbd className="bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded border border-indigo-200 dark:border-indigo-800 font-sans">Ctrl+[ / ]</kbd> Cycle Variants</span>
          )}
          {!isReviewing && (
            <span className="opacity-50">Start typing to write...</span>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
