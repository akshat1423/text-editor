import React from 'react';
import { UserSettings } from '../types';

interface Props {
  imageFlow: 'idle' | 'select' | 'loading';
  imageError: string | null;
  settings: UserSettings;
  onStart: () => void;
  onCancel: () => void;
}

const ImageFlowPanel: React.FC<Props> = ({ imageFlow, imageError, settings, onStart, onCancel }) => {
  if (imageFlow === 'idle') return null;

  return (
    <div className="absolute bottom-6 left-6 z-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-w-sm shadow-xl backdrop-blur">
      {imageFlow === 'select' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Generate illustrative image</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Highlight the text that should guide the image, then click generate.</p>
          {imageError && <div className="text-xs text-red-500">{imageError}</div>}
          <div className="flex gap-2">
            <button onClick={onStart} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">Generate image</button>
            <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200">Cancel</button>
          </div>
        </div>
      )}
      {imageFlow === 'loading' && (
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-slate-200 via-white to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">Crafting image…</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini 2.5 Flash Image</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageFlowPanel;
