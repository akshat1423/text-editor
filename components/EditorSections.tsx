import React from 'react';
import { Wand2, StopCircle, AlertCircle, Sparkles, Settings, Check, HelpCircle, Save, FileText, FileDown } from 'lucide-react';
import Toolbar from './Toolbar';
import ProseMirrorEditor from './ProseMirrorEditor';
import type { EditorController } from '../hooks/useEditorController';

export const ShortcutTooltip = ({ shortcut, description }: { shortcut: string; description: string }) => (
  <div className="flex items-center justify-between gap-3 text-xs mb-1 last:mb-0">
    <span className="text-slate-500 dark:text-slate-400">{description}</span>
    <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
      {shortcut}
    </kbd>
  </div>
);

export const HeaderSection: React.FC<{ controller: EditorController }> = ({ controller }) => {
  const {
    settings,
    title,
    setTitle,
    setTitleEdited,
    isGenerating,
    isReviewing,
    state,
    saveDocument,
    exportToDocx,
    exportToPdf,
    handleGenerateImage,
    showSettings,
    setShowSettings,
    handleGenerate,
    handleStop,
  } = controller;

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
                <span>Reviewing ({state.context.selectedIndex + 1}/{state.context.candidates.length})</span>
              </div>
            )}

            <button onClick={saveDocument} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Save document"><Save className="w-5 h-5" /></button>
            <button onClick={exportToDocx} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Export as DOCX"><FileText className="w-5 h-5" /></button>
            <button onClick={exportToPdf} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Export as PDF"><FileDown className="w-5 h-5" /></button>

            <div className="relative group">
              <button className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><HelpCircle className="w-5 h-5" /></button>
              <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">Keyboard Shortcuts</div>
                <ShortcutTooltip shortcut="Ctrl+1" description="Write 1 sentence" />
                <ShortcutTooltip shortcut="Ctrl+2" description="Write paragraph" />
                <ShortcutTooltip shortcut="Ctrl+3" description="Generate image" />
                <ShortcutTooltip shortcut="Ctrl+[ / ]" description="Cycle variants (Review)" />
                <ShortcutTooltip shortcut="/" description="Open slash menu" />
              </div>
            </div>

            <button onClick={handleGenerateImage} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Generate image"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><circle cx="12" cy="7" r="4"/></svg></button>

            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Settings"><Settings className="w-5 h-5" /></button>

            <button onClick={isGenerating ? handleStop : () => handleGenerate('continue')} className={`group flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm ${isGenerating ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 border border-slate-200 dark:border-slate-700' : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5'}`}>
              {isGenerating ? (<><StopCircle className="w-4 h-4" />Stop</>) : (<><Wand2 className="w-4 h-4" />Continue</>)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const EditorSurface: React.FC<{ controller: EditorController }> = ({ controller }) => {
  const {
    settings,
    editorRef,
    isGenerating,
    isReviewing,
    handleEditorShortcut,
    onInteraction,
    onContentChange,
    showSlashMenuAt,
    hideSlashMenu,
    handleMarkToggle,
    handleBulletList,
    handleOrderedList,
    handleBlockquote,
    handleCodeBlock,
    handleGenerateImage,
    handleInsertRule,
    handleUndo,
    handleRedo,
    charCount,
    wordCount,
  } = controller;

  return (
    <main className="flex-1 overflow-y-auto relative scroll-smooth">
      <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
        <div className={`rounded-2xl shadow-sm border min-h-[60vh] relative transition-colors duration-300 ${settings.darkMode ? 'bg-slate-900/70 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
            <Toolbar
            settings={settings}
              onToggleMark={handleMarkToggle}
              onBulletList={handleBulletList}
              onOrderedList={handleOrderedList}
              onBlockquote={handleBlockquote}
              onCodeBlock={handleCodeBlock}
              onInsertImage={handleGenerateImage}
            onInsertRule={handleInsertRule}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <div className="px-6 md:px-10 py-10 overflow-auto max-h-[60vh]">
            <ProseMirrorEditor
              ref={editorRef}
              initialContent="<p>The dawn broke over the horizon, painting the sky in hues of violent violet and burning orange</p>"
              isReadOnly={isGenerating}
              isGenerating={isGenerating}
              isReviewing={isReviewing}
              onShortcut={handleEditorShortcut}
              onInteraction={onInteraction}
              onContentChange={onContentChange}
              onSlashTrigger={showSlashMenuAt}
              onSlashDismiss={hideSlashMenu}
            />
          </div>

          <div className={`border-t px-6 md:px-10 py-3 text-sm text-right ${settings.darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
            {charCount.toLocaleString()} characters • {wordCount.toLocaleString()} words
          </div>
        </div>

      </div>
    </main>
  );
};

export const SlashMenuOverlay: React.FC<{ controller: EditorController }> = ({ controller }) => {
  const { slashMenu, settings, handleSlashOption } = controller;
  if (!slashMenu.visible) return null;

  return (
    <div className="fixed z-50" style={{ top: slashMenu.y, left: slashMenu.x }}>
      <div className={`w-64 rounded-2xl border shadow-xl ${settings.darkMode ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="px-4 py-2 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">Quick actions</div>
        <button onClick={() => handleSlashOption('continue')} className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 flex flex-col">
          <span className="text-sm font-semibold">Continue writing</span>
          <span className="text-xs text-slate-500">Ask Chronicle AI to keep going</span>
        </button>
        <button onClick={() => handleSlashOption('image')} className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 flex flex-col">
          <span className="text-sm font-semibold">Generate image</span>
          <span className="text-xs text-slate-500">Create an illustration from selected text</span>
        </button>
      </div>
    </div>
  );
};

export const ErrorToast: React.FC<{ controller: EditorController }> = ({ controller }) => {
  if (!controller.isError) return null;
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-red-200 dark:border-red-800 animate-fade-in-up z-50">
      <AlertCircle className="w-4 h-4" />
      <span>{controller.state.context.error}</span>
      <button onClick={() => controller.send({ type: 'STOP' })} className="ml-2 hover:underline font-medium">Dismiss</button>
    </div>
  );
};
