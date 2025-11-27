import { useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { editorMachine } from '../machines/editorMachine';
import { generateVariants, generateTitleFromContent, summarizeContentToKeywords } from '../services/geminiService';
import { searchPexelsImage } from '../services/pexelsService';
import { UserSettings, GenerationMode } from '../types';
import type { ProseMirrorEditorHandle } from '../components/ProseMirrorEditor';

const PLACEHOLDER_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

export function useEditorController() {
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
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    try { return localStorage.getItem('chronicle-font') || 'raleway'; } catch (e) { return 'raleway'; }
  });
  const [slashMenu, setSlashMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false);
  const placeholderIdRef = useRef<string | null>(null);

  // Streaming Refs
  const isStreamingRef = useRef(false);
  const streamQueueRef = useRef<string[]>([]);
  const streamFinishedRef = useRef(false);
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPosRef = useRef<number>(0);

  useEffect(() => {
    try { localStorage.setItem('chronicle-font', selectedFont); } catch (e) {}
  }, [selectedFont]);

  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  const showSlashMenuAt = (coords: { x: number; y: number }) => setSlashMenu({ visible: true, x: coords.x, y: coords.y });
  const hideSlashMenu = () => setSlashMenu(prev => prev.visible ? { ...prev, visible: false } : prev);

  const startTypewriter = () => {
    if (typewriterIntervalRef.current) return;
    typewriterIntervalRef.current = setInterval(() => {
      if (streamQueueRef.current.length > 0) {
        const char = streamQueueRef.current.shift();
        if (char) editorRef.current?.insertText(char);
      } else if (streamFinishedRef.current) {
        stopTypewriter();
      }
    }, 12);
  };

  const stopTypewriter = () => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
  };

  const handleGenerate = async (mode: GenerationMode = 'continue') => {
    if (!editorRef.current) return;
    if (state.matches('reviewing')) { send({ type: 'ACCEPT' }); await new Promise(r => setTimeout(r, 0)); }

    const currentText = editorRef.current.getContent();
    startPosRef.current = editorRef.current.getSelectionStart();

    streamQueueRef.current = [];
    streamFinishedRef.current = false;
    isStreamingRef.current = true;

    send({ type: 'GENERATE', mode });
    startTypewriter();

    try {
      const variants = await generateVariants(currentText, settings, mode, (token) => {
        if (!isStreamingRef.current) return; streamQueueRef.current.push(...token.split(''));
      });

      streamFinishedRef.current = true;

      const checkDone = setInterval(() => {
        if (streamQueueRef.current.length === 0) {
          clearInterval(checkDone);
          const endPos = editorRef.current?.getSelectionStart() || startPosRef.current;
          send({ type: 'SUCCESS', candidates: variants, range: { from: startPosRef.current, to: endPos } } as any);
        }
      }, 50);
    } catch (error: any) {
      isStreamingRef.current = false; stopTypewriter(); send({ type: 'ERROR', error: error.message || 'Failed to generate text' });
    }
  };

  const handleStop = () => {
    isStreamingRef.current = false; streamFinishedRef.current = true; streamQueueRef.current = []; stopTypewriter(); send({ type: 'STOP' });
  };

  const handleEditorShortcut = (action: 'generate' | 'line' | 'paragraph' | 'prev' | 'next' | 'image') => {
    switch(action) {
      case 'generate': if (state.matches('generating')) handleStop(); else handleGenerate('continue'); break;
      case 'line': handleGenerate('line'); break;
      case 'paragraph': handleGenerate('paragraph'); break;
      case 'prev': if (state.matches('reviewing')) safeCycle('prev'); break;
      case 'next': if (state.matches('reviewing')) safeCycle('next'); break;
      case 'image': handleGenerateImage(); break;
    }
  };

  const safeCycle = (direction: 'next' | 'prev') => {
    if (!state.matches('reviewing')) return;
    const { candidates, selectedIndex, generationRange } = state.context;
    if (candidates.length <= 1 || !generationRange) return;
    const nextIdx = direction === 'next' ? (selectedIndex + 1) % candidates.length : (selectedIndex - 1 + candidates.length) % candidates.length;
    const nextText = candidates[nextIdx];
    const fromPos = generationRange.from; const toPos = generationRange.to;
    editorRef.current?.replaceRange(fromPos, toPos, nextText);
    send({ type: direction === 'next' ? 'NEXT_VARIANT' : 'PREV_VARIANT' });
  };

  const handleMarkToggle = (mark: string) => { editorRef.current?.toggleMark(mark); };
  const handleBulletList = () => editorRef.current?.toggleBulletList();
  const handleOrderedList = () => editorRef.current?.toggleOrderedList();
  const handleBlockquote = () => editorRef.current?.toggleBlockquote();
  const handleCodeBlock = () => editorRef.current?.toggleCodeBlock();
  const handleInsertImage = () => { const url = prompt('Enter image URL'); if (url) editorRef.current?.insertImage(url); };
  const handleInsertRule = () => editorRef.current?.insertHorizontalRule();
  const handleUndo = () => editorRef.current?.undo();
  const handleRedo = () => editorRef.current?.redo();

  const handleGenerateImage = async () => {
    if (isImageLoading) return;
    hideSlashMenu();
    const html = editorRef.current?.getContent() || '';
    const temp = document.createElement('div'); temp.innerHTML = html;
    const plain = temp.textContent?.trim() || '';
    if (!plain) {
      alert('Please add some text to your document before generating an image.');
      return;
    }

    if (!editorRef.current) return;

    setIsImageLoading(true);
    const placeholderId = crypto.randomUUID ? crypto.randomUUID() : `placeholder-${Date.now()}`;
    placeholderIdRef.current = placeholderId;
    editorRef.current.insertImage(PLACEHOLDER_PIXEL, {
      alt: 'Generating illustrative image',
      placeholderId,
    });

    try {
      const keywords = await summarizeContentToKeywords(plain);
      const fallbackQuery = plain.split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
      const query = (keywords || []).join(' ') || fallbackQuery;
      const photo = await searchPexelsImage(query);
      const replaced = photo.imageUrl && editorRef.current.replaceImagePlaceholder(placeholderId, photo.imageUrl);
      if (!replaced && photo.imageUrl) {
        editorRef.current.insertImage(photo.imageUrl);
        editorRef.current.removeImagePlaceholder(placeholderId);
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to generate image';
      if (placeholderIdRef.current) {
        editorRef.current.removeImagePlaceholder(placeholderIdRef.current);
      }
      alert(message);
    }
    placeholderIdRef.current = null;
    setIsImageLoading(false);
  };

  const handleSlashOption = (option: 'continue' | 'image') => {
    if (option === 'continue') { hideSlashMenu(); handleGenerate('continue'); }
    else { handleGenerateImage(); }
  };

  // Title generation
  const [title, setTitle] = useState<string>('');
  const [titleEdited, setTitleEdited] = useState<boolean>(false);
  const generateTitleIfNeeded = (content: string) => {
    if (titleEdited) return; const plain = content.replace(/\s+/g,' ').trim(); const words = plain.split(/\s+/).filter(Boolean);
    if (words.length >= 15 && !title) {
      (async () => {
        try { const aiTitle = await generateTitleFromContent(content); if (aiTitle) setTitle(aiTitle); else setTitle(words.slice(0, Math.min(6, words.length)).join(' ')); }
        catch (e) { setTitle(words.slice(0, Math.min(6, words.length)).join(' ')); }
      })();
    }
  };

  const saveDocument = () => {
    const content = editorRef.current?.getContent() || ''; const docTitle = title || (content.split(/\s+/).filter(Boolean).slice(0,6).join(' ') || 'Untitled'); const doc = { title: docTitle, content, savedAt: Date.now() };
    try { const existing = JSON.parse(localStorage.getItem('chronicle-docs') || '[]'); existing.push(doc); localStorage.setItem('chronicle-docs', JSON.stringify(existing)); localStorage.setItem('chronicle-last', JSON.stringify(doc)); alert('Saved to localStorage'); }
    catch (e) { console.error(e); alert('Failed to save locally'); }
  };

  const exportToDocx = () => {
    const content = editorRef.current?.getContent() || ''; const docTitle = title || 'Document'; const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${docTitle}</h1><div>${content}</div></body></html>`; const blob = new Blob([html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${docTitle.replace(/[^a-z0-9]/gi,'_')}.doc`; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportToPdf = () => {
    const content = editorRef.current?.getContent() || ''; const docTitle = title || 'Document'; const w = window.open('', '_blank'); if (!w) { alert('Popup blocked'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${docTitle}</title></head><body><h1>${docTitle}</h1><div>${content}</div></body></html>`);
    w.document.close(); setTimeout(() => { w.print(); }, 300);
  };

  // Content/metrics handler
  const onContentChange = (content: string) => {
    const temp = document.createElement('div'); temp.innerHTML = content || ''; const plain = temp.textContent || temp.innerText || ''; setCharCount(plain.length); const words = plain.trim().split(/\s+/).filter(Boolean); setWordCount(words.length);
  };

  const onInteraction = () => {
    if (state.matches('reviewing')) send({ type: 'ACCEPT' });
    const content = editorRef.current?.getContent() || '';
    generateTitleIfNeeded(content);
  };

  return {
    state,
    send,
    editorRef,
    settings,
    setSettings,
    showSettings,
    setShowSettings,
    charCount,
    wordCount,
    selectedFont,
    setSelectedFont,
    slashMenu,
    showSlashMenuAt,
    hideSlashMenu,
    handleGenerateImage,
    handleSlashOption,
    handleMarkToggle,
    handleBulletList,
    handleOrderedList,
    handleBlockquote,
    handleCodeBlock,
    handleInsertImage,
    handleInsertRule,
    handleUndo,
    handleRedo,
    handleGenerate,
    handleStop,
    handleEditorShortcut,
    safeCycle,
    isGenerating: state.matches('generating'),
    isReviewing: state.matches('reviewing'),
    isError: state.matches('error'),
    title,
    setTitle,
    titleEdited,
    setTitleEdited,
    saveDocument,
    exportToDocx,
    exportToPdf,
    onContentChange,
    onInteraction,
  };
}

export type EditorController = ReturnType<typeof useEditorController>;

export default useEditorController;
