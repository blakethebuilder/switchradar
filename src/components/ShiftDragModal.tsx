import React from 'react';
import { X, MousePointer, Move } from 'lucide-react';

interface ShiftDragModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftDragModal: React.FC<ShiftDragModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Multi-Select</h2>
            <p className="text-sm font-semibold text-slate-400">Select multiple businesses</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Move className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Drag to Select</h3>
            <p className="text-sm text-slate-600">
              Hold <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Shift</kbd> and drag to select multiple businesses on the map
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div className="mt-1">
                <MousePointer className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Step 1</h4>
                <p className="text-xs text-slate-600">Hold down the Shift key</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div className="mt-1">
                <Move className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Step 2</h4>
                <p className="text-xs text-slate-600">Click and drag to create a selection box</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50">
              <div className="mt-1">
                <div className="h-5 w-5 rounded bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 text-sm">Step 3</h4>
                <p className="text-xs text-indigo-700">Release to select all businesses in the area</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Tip:</span> Selected businesses will be highlighted and can be bulk deleted or added to routes.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};