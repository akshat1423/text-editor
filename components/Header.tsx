import React from 'react';
import { Sparkles, Check, HelpCircle, Save, FileText, FileDown, StopCircle, Wand2, Settings } from 'lucide-react';
import { UserSettings } from '../types';

interface Props {
  title: string;
  setTitle: (t: string) => void;
  titleEdited: boolean;
  setTitleEdited: (v: boolean) => void;
  settings: UserSettings;
  setShowSettings: (v: boolean) => void;
  isGenerating: boolean;
  isReviewing: boolean;
  stateContext?: any;
  saveDocument: () => void;
  exportToDocx: () => void;
  exportToPdf: () => void;
  onGenerateToggle: () => void;
  onStop: () => void;
}

const Header: React.FC<Props> = ({ title, setTitle, setTitleEdited, settings, setShowSettings, isGenerating, isReviewing, stateContext, saveDocument, exportToDocx, exportToPdf, onGenerateToggle, onStop }) => {
  return (
    <header className={`flex-none backdrop-blur-md border-b z-20 transition-colors ${settings.darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
              placeholder="Untitled document"
              className={`w-full bg-transparent text-lg md:text-xl font-semibold focus:outline-none ${settings.darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isGenerating && (
              <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-sm font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Writing...</span>
              </div>
            )}
            {isReviewing && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                <Check className="w-4 h-4" />
                <span>Reviewing ({stateContext?.selectedIndex + 1}/{stateContext?.candidates?.length})</span>
              </div>
            )}
            <button onClick={saveDocument} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Save document"><Save className="w-5 h-5" /></button>
            <button onClick={exportToDocx} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Export as DOCX"><FileText className="w-5 h-5" /></button>
            <button onClick={exportToPdf} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Export as PDF"><FileDown className="w-5 h-5" /></button>
            <div className="relative group">
              <button className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><HelpCircle className="w-5 h-5" /></button>
            </div>
            <button onClick={() => setShowSettings(true)} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Settings"><Settings className="w-5 h-5" /></button>
            <button onClick={isGenerating ? onStop : onGenerateToggle} className={`group flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm ${isGenerating ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 border border-slate-200 dark:border-slate-700' : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5'}`}>
              {isGenerating ? (<><StopCircle className="w-4 h-4" /> Stop</>) : (<><Wand2 className="w-4 h-4" /> Continue</>)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
