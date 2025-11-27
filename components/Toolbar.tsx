import React from 'react';
import { Bold, Italic, Underline, Strikethrough, Subscript, Superscript, List as ListIcon, ListOrdered, Quote, SquareCode, Image as ImageIcon, Minus, Undo2, Redo2 } from 'lucide-react';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  onToggleMark: (mark: string) => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onBlockquote: () => void;
  onCodeBlock: () => void;
  onInsertImage: () => void;
  onInsertRule: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const Toolbar: React.FC<Props> = ({ settings, onToggleMark, onBulletList, onOrderedList, onBlockquote, onCodeBlock, onInsertImage, onInsertRule, onUndo, onRedo }) => {
  const toolbarButtonBase = 'h-10 w-10 flex items-center justify-center rounded-xl border text-sm transition-colors duration-200';
  const toolbarButtonClass = settings.darkMode ? `${toolbarButtonBase} border-slate-700 text-slate-200 hover:bg-slate-800` : `${toolbarButtonBase} border-slate-200 text-slate-600 hover:bg-slate-100`;

  const render = (Icon: any, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} title={label} className={toolbarButtonClass}>
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className={`w-full flex flex-wrap items-center gap-2 border-b ${settings.darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-100'} px-4 md:px-8 py-3`}>
      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-1 flex-wrap">
        {render(Bold, 'Bold', () => onToggleMark('strong'))}
        {render(Italic, 'Italic', () => onToggleMark('em'))}
        {render(Underline, 'Underline', () => onToggleMark('underline'))}
        {render(Strikethrough, 'Strikethrough', () => onToggleMark('strike'))}
        {render(Subscript, 'Subscript', () => onToggleMark('subscript'))}
        {render(Superscript, 'Superscript', () => onToggleMark('superscript'))}
      </div>
      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-1 flex-wrap">
        {render(ListIcon, 'Bulleted list', onBulletList)}
        {render(ListOrdered, 'Numbered list', onOrderedList)}
        {render(Quote, 'Block quote', onBlockquote)}
        {render(SquareCode, 'Code block', onCodeBlock)}
      </div>
      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-1 flex-wrap">
        {render(ImageIcon, 'Insert image', onInsertImage)}
        {render(Minus, 'Horizontal rule', onInsertRule)}
      </div>
      <span className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-1 flex-wrap">
        {render(Undo2, 'Undo', onUndo)}
        {render(Redo2, 'Redo', onRedo)}
      </div>
    </div>
  );
};

export default Toolbar;
