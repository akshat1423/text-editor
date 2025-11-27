import { EditorView } from 'prosemirror-view';

export interface EditorContextProps {
  view: EditorView | null;
  setView: (view: EditorView) => void;
  insertText: (text: string) => void;
  getContent: () => string;
}

export interface UserSettings {
  tone: 'professional' | 'creative' | 'casual' | 'academic';
  length: 'short' | 'medium' | 'long';
  variantCount: number;
  darkMode: boolean;
}

export type GenerationMode = 'continue' | 'line' | 'paragraph';

export interface GenerationEvent {
  type: 'GENERATE' | 'STOP' | 'SUCCESS' | 'ERROR' | 'RETRY' | 'NEXT_VARIANT' | 'PREV_VARIANT' | 'ACCEPT' | 'UPDATE_SETTINGS';
  mode?: GenerationMode;
  error?: string;
  settings?: Partial<UserSettings>;
  candidates?: string[];
  range?: { from: number; to: number } | null;
}

export interface GenerationContext {
  error: string | null;
  candidates: string[];
  selectedIndex: number;
  generationRange: { from: number; to: number } | null;
}
