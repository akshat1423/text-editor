import React, { useRef, useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { 
  Wand2, StopCircle, AlertCircle, PenLine, Sparkles, 
  Settings, ChevronLeft, ChevronRight, Check, HelpCircle, Save, FileText, FileDown,
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  Quote, List as ListIcon, ListOrdered, SquareCode, Image as ImageIcon,
  Minus, Undo2, Redo2
} from 'lucide-react';
import ProseMirrorEditor, { ProseMirrorEditorHandle } from './components/ProseMirrorEditor';
import { editorMachine } from './machines/editorMachine';
import { generateVariants, generateImageFromContext, generateTitleFromContent } from './services/geminiService';
import { UserSettings, GenerationMode } from './types';

const ShortcutTooltip = ({ shortcut, description }: { shortcut: string, description: string }) => (
  <div className="flex items-center justify-between gap-3 text-xs mb-1 last:mb-0">
    <span className="text-slate-500 dark:text-slate-400">{description}</span>
    <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
      {shortcut}
    </kbd>
  </div>
);

type IconButtonComponent = React.ComponentType<{ className?: string }>;

const App: React.FC = () => {
  const [state, send] = useMachine(editorMachine);
  const editorRef = useRef<ProseMirrorEditorHandle>(null);
  
  // App State
  const [settings, setSettings] = useState<UserSettings>({
    tone: 'creative',
    length: 'medium',
    variantCount: 4,
    darkMode: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    try {
      return localStorage.getItem('chronicle-font') || 'raleway';
    } catch (e) {
      return 'raleway';
    }
  });
  const [slashMenu, setSlashMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [imageFlow, setImageFlow] = useState<'idle' | 'select' | 'loading'>('idle');
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Streaming Refs
  const isStreamingRef = useRef(false);
  const streamQueueRef = useRef<string[]>([]);
  const streamFinishedRef = useRef(false);
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track start position of generation for replacement
  const startPosRef = useRef<number>(0);

  const toolbarButtonBase = 'h-10 w-10 flex items-center justify-center rounded-xl border text-sm transition-colors duration-200';
  const toolbarButtonClass = settings.darkMode
    ? `${toolbarButtonBase} border-slate-700 text-slate-200 hover:bg-slate-800`
    : `${toolbarButtonBase} border-slate-200 text-slate-600 hover:bg-slate-100`;
  const renderToolbarButton = (Icon: IconButtonComponent, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} title={label} className={toolbarButtonClass}>
      <Icon className="w-4 h-4" />
    </button>
  );

  const showSlashMenuAt = (coords: { x: number; y: number }) => {
    setSlashMenu({ visible: true, x: coords.x, y: coords.y });
  };

  const hideSlashMenu = () => setSlashMenu(prev => prev.visible ? { ...prev, visible: false } : prev);

  const handleMarkToggle = (mark: string) => {
    // Debug: log requested mark and whether editor ref exists
    // eslint-disable-next-line no-console
      console.log('[Toolbar] handleMarkToggle', { mark, hasEditor: !!editorRef.current });
    editorRef.current?.toggleMark(mark);
  };

  const handleBulletList = () => editorRef.current?.toggleBulletList();
  const handleOrderedList = () => editorRef.current?.toggleOrderedList();
  const handleBlockquote = () => editorRef.current?.toggleBlockquote();
  const handleCodeBlock = () => editorRef.current?.toggleCodeBlock();
  const handleSinkList = () => editorRef.current?.sinkList();
  const handleLiftList = () => editorRef.current?.liftList();
  const handleInsertLink = () => {
    const href = prompt('Enter link URL');
    if (href) {
      editorRef.current?.insertLink(href);
    }
  };
  const handleRemoveLink = () => editorRef.current?.insertLink();
  const handleInsertImage = () => {
    const url = prompt('Enter image URL');
    if (url) {
      editorRef.current?.insertImage(url);
    }
  };
  const handleInsertRule = () => editorRef.current?.insertHorizontalRule();
  const handleUndo = () => editorRef.current?.undo();
  const handleRedo = () => editorRef.current?.redo();

  const startImageFlow = () => {
    hideSlashMenu();
    setImageError(null);
    setImageFlow('select');
  };

  const cancelImageFlow = () => {
    setImageFlow('idle');
    setImageError(null);
  };

  const handleStartImageGeneration = async () => {
    const selectionRaw = editorRef.current?.getSelectionText() || '';
    let selectionText = selectionRaw.trim();

    if (!selectionText) {
      const fallbackHtml = editorRef.current?.getContent() || '';
      const temp = document.createElement('div');
      temp.innerHTML = fallbackHtml;
      const plain = temp.textContent?.trim() || '';
      const words = plain.split(/\s+/).filter(Boolean);
      selectionText = words.slice(Math.max(0, words.length - 60)).join(' ');
    }

    if (!selectionText) {
      alert('Please add some text to your document before generating an image.');
      return;
    }
    setImageFlow('loading');
    setImageError(null);
    try {
      const imageData = await generateImageFromContext(selectionText);
      editorRef.current?.insertImage(imageData);
      setImageFlow('idle');
    } catch (error: any) {
      setImageError(error?.message || 'Failed to generate image');
      setImageFlow('select');
    }
  };

  const handleSlashOption = (option: 'continue' | 'image') => {
    if (option === 'continue') {
      hideSlashMenu();
      handleGenerate('continue');
    } else {
      startImageFlow();
    }
  };

  // Apply Dark Mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Typewriter Effect Logic
  const startTypewriter = () => {
    if (typewriterIntervalRef.current) return;
    typewriterIntervalRef.current = setInterval(() => {
       if (streamQueueRef.current.length > 0) {
           const char = streamQueueRef.current.shift();
           if (char) {
               editorRef.current?.insertText(char);
           }
       } else {
           if (streamFinishedRef.current) {
               stopTypewriter();
               // Do NOT send SUCCESS here if we want to wait for all variants in handleGenerate.
               // We only stop the animation.
           }
       }
    }, 12); // slightly faster for responsiveness
  };

  const stopTypewriter = () => {
      if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
          typewriterIntervalRef.current = null;
      }
  };

  const handleGenerate = async (mode: GenerationMode = 'continue') => {
    if (!editorRef.current) return;
    
    // Accept any pending review before starting new
    if (state.matches('reviewing')) {
        send({ type: 'ACCEPT' });
        // Small delay to ensure state update
        await new Promise(r => setTimeout(r, 0));
    }

    const currentText = editorRef.current.getContent();
    startPosRef.current = editorRef.current.getSelectionStart();

    streamQueueRef.current = [];
    streamFinishedRef.current = false;
    isStreamingRef.current = true;

    send({ type: 'GENERATE', mode });
    startTypewriter();

    try {
      // Pass callback to stream the FIRST variant immediately
      const variants = await generateVariants(currentText, settings, mode, (token) => {
          if (!isStreamingRef.current) return;
          streamQueueRef.current.push(...token.split(''));
      });

      // All variants fetched.
      streamFinishedRef.current = true;
      
      // Wait for typewriter to empty queue before transitioning machine
      const checkDone = setInterval(() => {
          if (streamQueueRef.current.length === 0) {
              clearInterval(checkDone);
              // Calculate final range based on where we started and where we ended
              const endPos = editorRef.current?.getSelectionStart() || startPosRef.current;
              
                send({ 
                  type: 'SUCCESS', 
                  candidates: variants,
                  range: { from: startPosRef.current, to: endPos }
                } as any);
          }
      }, 50);

    } catch (error: any) {
      isStreamingRef.current = false;
      stopTypewriter();
      send({ type: 'ERROR', error: error.message || 'Failed to generate text' });
    }
  };

  const handleStop = () => {
    isStreamingRef.current = false;
    streamFinishedRef.current = true; 
    streamQueueRef.current = [];
    stopTypewriter();
    send({ type: 'STOP' });
  };

  const handleEditorShortcut = (action: 'generate' | 'line' | 'paragraph' | 'prev' | 'next') => {
      // debug: log shortcut calls
      // eslint-disable-next-line no-console
      console.log('[Shortcut] handleEditorShortcut', action);
      switch(action) {
          case 'generate':
              if (state.matches('generating')) handleStop();
              else handleGenerate('continue');
              break;
          case 'line':
              handleGenerate('line');
              break;
          case 'paragraph':
              handleGenerate('paragraph');
              break;
          case 'prev':
              if (state.matches('reviewing')) safeCycle('prev');
              break;
          case 'next':
              if (state.matches('reviewing')) safeCycle('next');
              break;
      }
  };

  const safeCycle = (direction: 'next' | 'prev') => {
      if (!state.matches('reviewing')) return;
      
      const { candidates, selectedIndex, generationRange } = state.context;
      if (candidates.length <= 1 || !generationRange) return;
      
      const nextIdx = direction === 'next' 
        ? (selectedIndex + 1) % candidates.length 
        : (selectedIndex - 1 + candidates.length) % candidates.length;
      const nextText = candidates[nextIdx];
      
      const fromPos = generationRange.from;
      const toPos = generationRange.to;
      
      editorRef.current?.replaceRange(fromPos, toPos, nextText);
      send({ type: direction === 'next' ? 'NEXT_VARIANT' : 'PREV_VARIANT' });
  };

  const isGenerating = state.matches('generating');
  const isReviewing = state.matches('reviewing');
  const isError = state.matches('error');

  // Document title and persistence state
  const [title, setTitle] = useState<string>('');
  const [titleEdited, setTitleEdited] = useState<boolean>(false);

  const generateTitleIfNeeded = (content: string) => {
    if (titleEdited) return;
    const plain = content.replace(/\s+/g, ' ').trim();
    const words = plain.split(/\s+/).filter(Boolean);
    if (words.length >= 15 && !title) {
      (async () => {
        try {
          const aiTitle = await generateTitleFromContent(content);
          if (aiTitle) {
            setTitle(aiTitle);
          } else {
            const t = words.slice(0, Math.min(6, words.length)).join(' ');
            setTitle(t);
          }
        } catch (e) {
          const t = words.slice(0, Math.min(6, words.length)).join(' ');
          setTitle(t);
        }
      })();
    }
  };

  const saveDocument = () => {
    const content = editorRef.current?.getContent() || '';
    const docTitle = title || (content.split(/\s+/).filter(Boolean).slice(0,6).join(' ') || 'Untitled');
    const doc = { title: docTitle, content, savedAt: Date.now() };
    try {
      const existing = JSON.parse(localStorage.getItem('chronicle-docs') || '[]');
      existing.push(doc);
      localStorage.setItem('chronicle-docs', JSON.stringify(existing));
      localStorage.setItem('chronicle-last', JSON.stringify(doc));
      // quick feedback
      alert('Saved to localStorage');
    } catch (e) {
      console.error(e);
      alert('Failed to save locally');
    }
  };

  const exportToDocx = () => {
    const content = editorRef.current?.getContent() || '';
    const docTitle = title || 'Document';
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${docTitle}</h1><div>${content}</div></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${docTitle.replace(/[^a-z0-9]/gi,'_')}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportToPdf = () => {
    // Simple print-to-PDF fallback: open new window and print
    const content = editorRef.current?.getContent() || '';
    const docTitle = title || 'Document';
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${docTitle}</title></head><body><h1>${docTitle}</h1><div>${content}</div></body></html>`);
    w.document.close();
    // Give it a moment to render, then call print
    setTimeout(() => {
      w.print();
    }, 300);
  };

  useEffect(() => {
    // Persist selected font
    try { localStorage.setItem('chronicle-font', selectedFont); } catch (e) {}
  }, [selectedFont]);

  return (
    <div className={`flex flex-col h-screen overflow-auto selection:bg-indigo-100 selection:text-indigo-900 ${settings.darkMode ? 'bg-slate-900 text-slate-100 selection:bg-indigo-900 selection:text-white' : 'bg-slate-50 text-slate-900' } ${selectedFont === 'inter' ? 'font-inter' : selectedFont === 'lora' ? 'font-lora' : 'font-raleway'}`}>
      
      {/* Header */}
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
              {/* Save / Export moved into header actions */}
              <button
                onClick={saveDocument}
                className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Save document"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={exportToDocx}
                className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Export as DOCX"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={exportToPdf}
                className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Export as PDF"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <div className="relative group">
                <button
                  className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">Keyboard Shortcuts</div>
                    <ShortcutTooltip shortcut="Ctrl+1" description="Write 1 sentence" />
                    <ShortcutTooltip shortcut="Ctrl+2" description="Write paragraph" />
                    <ShortcutTooltip shortcut="Ctrl+[ / ]" description="Cycle variants (Review)" />
                </div>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-colors ${settings.darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Settings"
              >
                  <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={isGenerating ? handleStop : () => handleGenerate('continue')}
                className={`
                  group flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm
                  ${isGenerating 
                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 border border-slate-200 dark:border-slate-700' 
                    : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Continue
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-header removed — title and actions consolidated in main header */}
        </div>
      </header>

      {/* Settings Modal/Panel */}
      {showSettings && (
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
                                onClick={() => setSettings(s => ({...s, tone: t as any}))}
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
                                onClick={() => setSettings(s => ({...s, length: l as any}))}
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
                            onChange={(e) => setSettings(s => ({...s, variantCount: parseInt(e.target.value)}))}
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
                        onClick={() => setSettings(s => ({...s, darkMode: !s.darkMode}))}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative flex">
          {/* Editor */}
          <main className="flex-1 overflow-y-auto relative scroll-smooth">
            <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
                <div className={`rounded-2xl shadow-sm border min-h-[60vh] relative transition-colors duration-300 
                  ${settings.darkMode ? 'bg-slate-900/70 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                    <div className={`w-full flex flex-wrap items-center gap-2 border-b ${settings.darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-100'} px-4 md:px-8 py-3`}
                    >
                      {/* Paragraph / Heading buttons removed per user request */}
                      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {renderToolbarButton(Bold, 'Bold', () => handleMarkToggle('strong'))}
                        {renderToolbarButton(Italic, 'Italic', () => handleMarkToggle('em'))}
                        {renderToolbarButton(Underline, 'Underline', () => handleMarkToggle('underline'))}
                        {renderToolbarButton(Strikethrough, 'Strikethrough', () => handleMarkToggle('strike'))}
                        {renderToolbarButton(Subscript, 'Subscript', () => handleMarkToggle('subscript'))}
                        {renderToolbarButton(Superscript, 'Superscript', () => handleMarkToggle('superscript'))}
                      </div>
                      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {renderToolbarButton(ListIcon, 'Bulleted list', handleBulletList)}
                        {renderToolbarButton(ListOrdered, 'Numbered list', handleOrderedList)}
                        {renderToolbarButton(Quote, 'Block quote', handleBlockquote)}
                        {renderToolbarButton(SquareCode, 'Code block', handleCodeBlock)}
                      </div>
                      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Inline code, indent/outdent, and link buttons removed per UI cleanup */}
                        {renderToolbarButton(ImageIcon, 'Insert image', handleInsertImage)}
                        {renderToolbarButton(Minus, 'Horizontal rule', handleInsertRule)}
                      </div>
                      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {renderToolbarButton(Undo2, 'Undo', handleUndo)}
                        {renderToolbarButton(Redo2, 'Redo', handleRedo)}
                      </div>
                    </div>

                    <div className="px-6 md:px-10 py-10 overflow-auto max-h-[60vh]">
                      <ProseMirrorEditor 
                        ref={editorRef} 
                        initialContent="<p>The dawn broke over the horizon, painting the sky in hues of violent violet and burning orange</p>"
                        isReadOnly={isGenerating}
                        isGenerating={isGenerating}
                        isReviewing={isReviewing}
                        onShortcut={handleEditorShortcut}
                        onInteraction={() => {
                          if (isReviewing) send({ type: 'ACCEPT' });
                          const content = editorRef.current?.getContent() || '';
                          generateTitleIfNeeded(content);
                        }}
                        onContentChange={(content) => {
                          // content is HTML; derive plain text for accurate word/char counts
                          const temp = document.createElement('div');
                          temp.innerHTML = content || '';
                          const plain = temp.textContent || temp.innerText || '';
                          setCharCount(plain.length);
                          const words = plain.trim().split(/\s+/).filter(Boolean);
                          setWordCount(words.length);
                        }}
                        onSlashTrigger={showSlashMenuAt}
                        onSlashDismiss={hideSlashMenu}
                      />
                    </div>
                    <div className={`border-t px-6 md:px-10 py-3 text-sm text-right ${settings.darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                      {charCount.toLocaleString()} characters • {wordCount.toLocaleString()} words
                    </div>
                </div>
                    {imageFlow !== 'idle' && (
                      <div className="absolute bottom-6 left-6 z-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-w-sm shadow-xl backdrop-blur">
                        {imageFlow === 'select' && (
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Generate illustrative image</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Highlight the text that should guide the image, then click generate.</p>
                            {imageError && <div className="text-xs text-red-500">{imageError}</div>}
                            <div className="flex gap-2">
                              <button onClick={handleStartImageGeneration} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">Generate image</button>
                              <button onClick={cancelImageFlow} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200">Cancel</button>
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
                    )}
            </div>
          </main>

          {slashMenu.visible && (
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
          )}

          {/* Review Sidebar / Panel */}
          {isReviewing && state.context.candidates.length > 1 && (
             <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 animate-fade-in-up">
                 <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 items-center">
                     <button onClick={() => safeCycle('prev')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Previous Variant (Ctrl+[)">
                         <ChevronLeft className="w-5 h-5" />
                     </button>
                     <div className="text-xs font-bold text-slate-400">
                         {state.context.selectedIndex + 1} / {state.context.candidates.length}
                     </div>
                     <button onClick={() => safeCycle('next')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Next Variant (Ctrl+])">
                         <ChevronRight className="w-5 h-5" />
                     </button>
                 </div>
                 
                 <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] p-2 rounded-lg shadow-lg text-center opacity-70">
                     Hit any key<br/>to accept
                 </div>
             </div>
          )}
      </div>

      {/* Footer Shortcuts Help */}
      <footer className={`flex-none py-2 border-t text-xs transition-colors duration-300 ${settings.darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}>
          <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
              <div className="flex gap-4">
                  <span className="flex items-center gap-1" title="Generate continuation"><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded border dark:border-slate-700 font-sans">Ctrl+Enter</kbd> Continue</span>
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

      {isError && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-red-200 dark:border-red-800 animate-fade-in-up z-50">
             <AlertCircle className="w-4 h-4" />
             <span>{state.context.error}</span>
             <button onClick={() => send({ type: 'STOP' })} className="ml-2 hover:underline font-medium">Dismiss</button>
         </div>
      )}

    </div>
  );
};

export default App;