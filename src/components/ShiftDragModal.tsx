import React from 'react';
import { X, MousePointer, Move, ZoomIn, MapPin, Navigation, RotateCcw } from 'lucide-react';

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

      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Map Controls</h2>
            <p className="text-sm font-semibold text-slate-400">Complete guide to map navigation</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Multi-Select */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Move className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Select</h3>
            </div>
            <div className="space-y-2 ml-13">
              <p className="text-sm text-slate-600">
                Hold <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Shift</kbd> and drag to select multiple businesses
              </p>
              <p className="text-xs text-slate-500">Selected businesses can be bulk added to routes</p>
            </div>
          </div>

          {/* Zoom Controls */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zoom & Scatter</h3>
            </div>
            <div className="space-y-2 ml-13">
              <p className="text-sm text-slate-600">
                <strong>Zoom 14+:</strong> Icons scatter individually for precise selection
              </p>
              <p className="text-sm text-slate-600">
                <strong>Zoom 13-:</strong> Icons cluster by proximity (100+ = red clusters)
              </p>
              <p className="text-xs text-slate-500">Use zoom buttons or mouse wheel to control clustering</p>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Navigation</h3>
            </div>
            <div className="space-y-2 ml-13">
              <p className="text-sm text-slate-600">
                <strong>Arrow buttons:</strong> Pan map in any direction
              </p>
              <p className="text-sm text-slate-600">
                <strong>Fit All button:</strong> Zoom to show all businesses
              </p>
              <p className="text-sm text-slate-600">
                <strong>Mouse/Touch:</strong> Drag to pan, scroll/pinch to zoom
              </p>
            </div>
          </div>

          {/* Drop Pin */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Filter Pin</h3>
            </div>
            <div className="space-y-2 ml-13">
              <p className="text-sm text-slate-600">
                <strong>Drop Pin:</strong> Click pin button, then click map to place
              </p>
              <p className="text-sm text-slate-600">
                <strong>500m Radius:</strong> Shows businesses within walking distance
              </p>
              <p className="text-xs text-slate-500">Drag the pin to move it, or click X to remove</p>
            </div>
          </div>

          {/* Business Selection */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Business Selection</h3>
            </div>
            <div className="space-y-2 ml-13">
              <p className="text-sm text-slate-600">
                <strong>Single Click:</strong> Select business, show in toolbar
              </p>
              <p className="text-sm text-slate-600">
                <strong>Double Click:</strong> Select and auto-expand details
              </p>
              <p className="text-sm text-slate-600">
                <strong>Icon Navigation:</strong> Use arrow buttons to scroll through businesses
              </p>
              <p className="text-sm text-slate-600">
                <strong>Add to Route:</strong> Use toolbar button or multi-select
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Pro Tips
            </h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Zoom in to see individual businesses clearly</li>
              <li>• Use drop pin for route planning in specific areas</li>
              <li>• Multi-select for bulk operations</li>
              <li>• Double-click for quick access to customer details</li>
              <li>• Use icon navigation arrows to browse businesses sequentially</li>
            </ul>
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