import React from 'react';
import { Settings } from 'lucide-react';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  setSettings: (s: UserSettings | ((s: UserSettings) => UserSettings)) => void;
  selectedFont: string;
  setSelectedFont: (f: string) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<Props> = ({ settings, setSettings, selectedFont, setSelectedFont, onClose }) => {
  return (
    <div className="absolute top-16 right-0 m-4 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-30 animate-fade-in-up p-5">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4" /> Configure AI
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tone</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {['professional', 'creative', 'casual', 'academic'].map(t => (
              <button
                key={t}
                onClick={() => setSettings(s => ({ ...s, tone: t as any }))}
                className={`text-xs py-2 px-3 rounded-md border transition-all capitalize ${settings.tone === t
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Default Length</label>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 mt-2">
            {['short', 'medium', 'long'].map(l => (
              <button
                key={l}
                onClick={() => setSettings(s => ({ ...s, length: l as any }))}
                className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-all ${settings.length === l ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Variants</label>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min="1" max="4"
              value={settings.variantCount}
              onChange={(e) => setSettings(s => ({ ...s, variantCount: parseInt(e.target.value) }))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-sm font-medium w-6 text-slate-700 dark:text-slate-300">{settings.variantCount}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Font</label>
          <div className="mt-2">
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className={`w-full text-sm rounded-md border px-2 py-1 bg-transparent ${settings.darkMode ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700'}`}
            >
              <option value="raleway">Raleway (sans)</option>
              <option value="inter">Inter (sans)</option>
              <option value="lora">Lora (serif)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-sm text-slate-700 dark:text-slate-300">Dark Mode</span>
          <button
            onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
