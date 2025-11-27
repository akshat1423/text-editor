import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  isReviewing: boolean;
  candidatesLength: number;
  selectedIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

const ReviewSidebar: React.FC<Props> = ({ isReviewing, candidatesLength, selectedIndex, onPrev, onNext }) => {
  if (!isReviewing || candidatesLength <= 1) return null;

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 items-center">
        <button onClick={onPrev} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Previous Variant (Ctrl+[)">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-xs font-bold text-slate-400">{selectedIndex + 1} / {candidatesLength}</div>
        <button onClick={onNext} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Next Variant (Ctrl+])">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] p-2 rounded-lg shadow-lg text-center opacity-70">
        Hit any key<br/>to accept
      </div>
    </div>
  );
};

export default ReviewSidebar;
