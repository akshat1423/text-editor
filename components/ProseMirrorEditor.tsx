import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, NodeSpec, MarkSpec } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes, wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { exampleSetup } from 'prosemirror-example-setup';
import { keymap } from 'prosemirror-keymap';
import { toggleMark, setBlockType, wrapIn, lift } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { Sparkles } from 'lucide-react';
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-example-setup/style/style.css';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;

// Extend nodes to include an inline image node and extend marks with strike/subscript
const baseNodes = addListNodes(basicSchema.spec.nodes as any, "paragraph block*", "block") as any;

// Add an image node
baseNodes.image = {
    inline: true,
    attrs: { src: {}, alt: { default: null }, title: { default: null } },
    group: "inline",
    draggable: true,
    parseDOM: [{
        tag: "img[src]",
        getAttrs(dom: any) {
            return { src: dom.getAttribute('src'), title: dom.getAttribute('title'), alt: dom.getAttribute('alt') };
        }
    }],
    toDOM(node: any) { return ["img", node.attrs]; }
} as NodeSpec;

// Extend marks: add strike and subscript
const baseMarks = { ...basicSchema.spec.marks } as any;
baseMarks.strike = {
    parseDOM: [ { tag: 's' }, { tag: 'del' }, { style: 'text-decoration', getAttrs: (value: any) => value === 'line-through' ? {} : false } ],
    toDOM() { return ['s', 0]; }
} as MarkSpec;

baseMarks.subscript = {
    parseDOM: [ { tag: 'sub' } ],
    toDOM() { return ['sub', 0]; }
} as MarkSpec;

baseMarks.superscript = {
    parseDOM: [ { tag: 'sup' } ],
    toDOM() { return ['sup', 0]; }
} as MarkSpec;

baseMarks.underline = {
    parseDOM: [
        { tag: 'u' },
        { style: 'text-decoration', getAttrs: (value: any) => value === 'underline' ? {} : false }
    ],
    toDOM() { return ['u', 0]; }
} as MarkSpec;

const mySchema = new Schema({ nodes: baseNodes, marks: baseMarks });

const isNodeActive = (state: EditorState, nodeType: any) => {
    const { from, to } = state.selection;
    let active = false;
    state.doc.nodesBetween(from, to, (node) => {
        if (node.type === nodeType) active = true;
        return !active;
    });
    return active;
};

interface ProseMirrorEditorProps {
    initialContent?: string;
    isReadOnly?: boolean;
    isGenerating?: boolean;
    isReviewing?: boolean;
    onShortcut?: (action: 'generate' | 'line' | 'paragraph' | 'prev' | 'next') => void;
    onInteraction?: () => void; // Called when user types or clicks, to clear review state
    onContentChange?: (content: string) => void;
    onSlashTrigger?: (coords: { x: number; y: number }) => void;
    onSlashDismiss?: () => void;
}

export interface ProseMirrorEditorHandle {
  view: EditorView | null;
  insertText: (text: string) => void;
  replaceRange: (from: number, to: number, text: string) => void;
    toggleMark: (markName: string) => void;
    insertImage: (url: string) => void;
    toggleBlockquote: () => void;
    toggleBulletList: () => void;
    toggleOrderedList: () => void;
    sinkList: () => void;
    liftList: () => void;
    setHeading: (level: number) => void;
    setParagraph: () => void;
    toggleCodeBlock: () => void;
    insertLink: (href?: string) => void;
    insertHorizontalRule: () => void;
    undo: () => void;
    redo: () => void;
  getContent: () => string;
  getSelectionStart: () => number;
    getSelectionRange: () => { from: number; to: number } | null;
    getSelectionText: () => string;
}

export const ProseMirrorEditor = forwardRef<ProseMirrorEditorHandle, ProseMirrorEditorProps>(
    ({ initialContent = '<p></p>', isReadOnly = false, isGenerating = false, isReviewing = false, onShortcut, onInteraction, onContentChange, onSlashTrigger, onSlashDismiss }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const aiCursorRef = useRef<HTMLDivElement>(null);
    const [buttonPos, setButtonPos] = useState<{top: number, left: number, visible: boolean}>({ 
        top: 0, left: 0, visible: false 
    });

        const runViewCommand = (command: Command) => {
            const view = viewRef.current;
            if (!view) return;
            command(view.state, view.dispatch, view);
            view.focus();
        };

        const toggleListType = (listType: 'bullet_list' | 'ordered_list') => {
            const view = viewRef.current;
            if (!view) return;
            const listNode = mySchema.nodes[listType];
            const listItem = mySchema.nodes.list_item;
            if (!listNode || !listItem) return;
            if (isNodeActive(view.state, listNode)) {
                runViewCommand(liftListItem(listItem));
            } else {
                runViewCommand(wrapInList(listNode));
            }
        };

        const toggleBlockquote = () => {
            const view = viewRef.current;
            if (!view) return;
            const blockquote = mySchema.nodes.blockquote;
            if (!blockquote) return;
            if (isNodeActive(view.state, blockquote)) {
                runViewCommand(lift);
            } else {
                runViewCommand(wrapIn(blockquote));
            }
        };

        const setHeadingLevel = (level: number) => {
            const heading = mySchema.nodes.heading;
            if (!heading) return;
            runViewCommand(setBlockType(heading, { level }));
        };

        const setParagraphBlock = () => {
            const paragraph = mySchema.nodes.paragraph;
            if (!paragraph) return;
            runViewCommand(setBlockType(paragraph));
        };

        const toggleCodeBlock = () => {
            const codeBlock = mySchema.nodes.code_block;
            const paragraph = mySchema.nodes.paragraph;
            if (!codeBlock || !paragraph || !viewRef.current) return;
            if (isNodeActive(viewRef.current.state, codeBlock)) {
                runViewCommand(setBlockType(paragraph));
            } else {
                runViewCommand(setBlockType(codeBlock, {}));
            }
        };

        const insertLinkMark = (href?: string) => {
            const link = mySchema.marks.link;
            const view = viewRef.current;
            if (!link || !view) return;
            if (!href) {
                const { from, to } = view.state.selection;
                if (view.state.doc.rangeHasMark(from, to, link)) {
                    toggleMark(link)(view.state, view.dispatch);
                }
                view.focus();
                return;
            }
            toggleMark(link, { href, title: href })(view.state, view.dispatch);
            view.focus();
        };

        const insertHorizontalRule = () => {
            const view = viewRef.current;
            if (!view) return;
            const hr = mySchema.nodes.horizontal_rule;
            if (!hr) return;
            const tr = view.state.tr.replaceSelectionWith(hr.create()).scrollIntoView();
            view.dispatch(tr);
            view.focus();
        };

        useImperativeHandle(ref, () => ({
      view: viewRef.current,
      insertText: (text: string) => {
        const view = viewRef.current;
        if (view) {
          const { state, dispatch } = view;
          const tr = state.tr.insertText(text);
          dispatch(tr.scrollIntoView());
        }
      },
      replaceRange: (from: number, to: number, text: string) => {
          const view = viewRef.current;
          if (view) {
              const tr = view.state.tr.replaceWith(from, to, mySchema.text(text));
              // Restore cursor to end of inserted text
              tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(from + text.length)));
              view.dispatch(tr.scrollIntoView());
          }
      },
      toggleMark: (markName: string) => {
          const view = viewRef.current;
          if (!view) return;
          const mark = mySchema.marks[markName];
          if (!mark) return;
          toggleMark(mark)(view.state, view.dispatch);
          view.focus();
      },
      insertImage: (url: string) => {
          const view = viewRef.current;
          if (!view) return;
          const { state, dispatch } = view;
          const node = mySchema.nodes.image.create({ src: url, alt: '', title: '' });
          const tr = state.tr.replaceSelectionWith(node).scrollIntoView();
          dispatch(tr);
          view.focus();
      },
            toggleBlockquote,
            toggleBulletList: () => toggleListType('bullet_list'),
            toggleOrderedList: () => toggleListType('ordered_list'),
            sinkList: () => {
                const listItem = mySchema.nodes.list_item;
                if (!listItem) return;
                runViewCommand(sinkListItem(listItem));
            },
            liftList: () => {
                const listItem = mySchema.nodes.list_item;
                if (!listItem) return;
                runViewCommand(liftListItem(listItem));
            },
            setHeading: setHeadingLevel,
            setParagraph: setParagraphBlock,
            toggleCodeBlock,
            insertLink: insertLinkMark,
            insertHorizontalRule,
            undo: () => runViewCommand(undo),
            redo: () => runViewCommand(redo),
      getContent: () => {
        const view = viewRef.current;
        if (!view) return '';
        return view.state.doc.textContent;
      },
      getSelectionStart: () => {
          return viewRef.current?.state.selection.from || 0;
            },
            getSelectionRange: () => {
                    const view = viewRef.current;
                    if (!view) return null;
                    const { from, to } = view.state.selection;
                    return { from, to };
            },
            getSelectionText: () => {
                    const view = viewRef.current;
                    if (!view) return '';
                    const { from, to } = view.state.selection;
                    return view.state.doc.textBetween(from, to, '\n\n', '\n\n');
            }
    }));

    const updatePositions = (view: EditorView) => {
        if (!view) return;
        
        if (aiCursorRef.current) {
            const { from } = view.state.selection;
            // Guard against invalid coords
            try {
                const coords = view.coordsAtPos(from);
                aiCursorRef.current.style.top = `${coords.top}px`;
                aiCursorRef.current.style.left = `${coords.left}px`;
                aiCursorRef.current.style.height = `${coords.bottom - coords.top}px`;
            } catch(e) {}
        }

        if (view.hasFocus() && !isGenerating) {
            const { from } = view.state.selection;
            try {
                const coords = view.coordsAtPos(from);
                setButtonPos({
                    top: coords.top - 28,
                    left: coords.left,
                    visible: true
                });
            } catch(e) {
                setButtonPos(prev => ({ ...prev, visible: false }));
            }
        } else {
             if (!isGenerating) {
                 // Minimal delay to allow interaction
             }
        }
    };

    // Keep refs up to date to avoid stale closures in keymap
    const onShortcutRef = useRef(onShortcut);
    useEffect(() => { onShortcutRef.current = onShortcut; }, [onShortcut]);

    const isReviewingRef = useRef(isReviewing);
    useEffect(() => { isReviewingRef.current = isReviewing; }, [isReviewing]);
    
    const onInteractionRef = useRef(onInteraction);
    useEffect(() => { onInteractionRef.current = onInteraction; }, [onInteraction]);

    const onContentChangeRef = useRef(onContentChange);
    useEffect(() => { onContentChangeRef.current = onContentChange; }, [onContentChange]);

    const onSlashTriggerRef = useRef(onSlashTrigger);
    useEffect(() => { onSlashTriggerRef.current = onSlashTrigger; }, [onSlashTrigger]);

    const onSlashDismissRef = useRef(onSlashDismiss);
    useEffect(() => { onSlashDismissRef.current = onSlashDismiss; }, [onSlashDismiss]);

    useEffect(() => {
      if (!editorRef.current) return;

      const contentElement = document.createElement('div');
      contentElement.innerHTML = initialContent;

            const state = EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(contentElement),
        plugins: [
             ...exampleSetup({ schema: mySchema, menuBar: false, floatingMenu: false }),
             keymap({
                "Mod-Enter": (state, dispatch) => {
                    onShortcutRef.current?.('generate');
                    return true;
                },
                "Mod-1": (state, dispatch) => {
                    onShortcutRef.current?.('line');
                    return true;
                },
                "Mod-2": (state, dispatch) => {
                    onShortcutRef.current?.('paragraph');
                    return true;
                },
                "Mod-[": (state, dispatch) => {
                    if (isReviewingRef.current) {
                        onShortcutRef.current?.('prev');
                        return true;
                    }
                    return false;
                },
                "Mod-]": (state, dispatch) => {
                    if (isReviewingRef.current) {
                        onShortcutRef.current?.('next');
                        return true;
                    }
                    return false;
                },
             })
        ]
      });

      const view = new EditorView(editorRef.current, {
        state,
        editable: () => !isReadOnly, 
        dispatchTransaction(transaction) {
           const newState = view.state.apply(transaction);
           view.updateState(newState);
           updatePositions(view);
           
           if (transaction.docChanged) {
               // If user typed something (doc changed) and it wasn't a remote change, trigger interaction
               if (transaction.getMeta("pointer") === undefined && !isGenerating) {
                   onInteractionRef.current?.();
               }
               onContentChangeRef.current?.(newState.doc.textContent);
           }
        }
      });

      viewRef.current = view;
      updatePositions(view);
      onContentChangeRef.current?.(view.state.doc.textContent);

      const handleScroll = () => {
          if (viewRef.current) updatePositions(viewRef.current);
      };
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      const handleKeyDown = (event: KeyboardEvent) => {
          if (!viewRef.current) return;
          if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
              try {
                  const coords = viewRef.current.coordsAtPos(viewRef.current.state.selection.head);
                  onSlashTriggerRef.current?.({ x: coords.left, y: coords.bottom + 6 });
              } catch (e) {}
          } else if (event.key === 'Escape') {
              onSlashDismissRef.current?.();
          }
      };
      view.dom.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        view.dom.removeEventListener('keydown', handleKeyDown);
        view.destroy();
        viewRef.current = null;
      };
    }, []); 

    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.setProps({
                editable: () => !isReadOnly,
            });
            updatePositions(viewRef.current);
        }
    }, [isReadOnly, isGenerating]);

    return (
      <>
        <div 
            ref={editorRef} 
            className="min-h-[60vh] cursor-text relative"
            onClick={() => {
                if (viewRef.current && !viewRef.current.hasFocus()) {
                    viewRef.current.focus();
                }
            }}
        />

        {/* AI Magic Cursor */}
        <div 
            ref={aiCursorRef}
            className={`magic-cursor ${isGenerating ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Floating Button */}
        {buttonPos.visible && !isGenerating && !isReadOnly && (
            <div 
                className="fixed z-50 animate-fade-in-up"
                style={{
                    top: buttonPos.top,
                    left: buttonPos.left,
                    transform: 'translate(-50%, -100%) translateY(-8px)'
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onShortcut?.('generate');
                        setButtonPos(prev => ({ ...prev, visible: false }));
                    }}
                    className="group relative flex items-center justify-center p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 transition-all duration-300 hover:scale-110"
                    title="Continue writing (Ctrl+Enter)"
                >
                    <div className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-50 dark:fill-indigo-900" />
                    <span className="sr-only">Continue writing</span>
                    
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover:opacity-20">
                         <div className="w-full h-full btn-shimmer" />
                    </div>
                </button>
            </div>
        )}
      </>
    );
  }
);

export default ProseMirrorEditor;