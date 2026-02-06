import React from 'react';
import { Plus, Minus, Target, MapPin, X, Info, Navigation } from 'lucide-react';
import type { Business } from '../types';

interface MapControlsProps {
  businesses: Business[];
  currentZoom: number;
  droppedPin: { lat: number, lng: number } | null;
  isDropMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitBounds: () => void;
  onToggleDropMode: () => void;
  onClearPin: () => void;
  onLocateMe: () => void;
  isLocating: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  businesses,
  currentZoom,
  droppedPin,
  isDropMode,
  onZoomIn,
  onZoomOut,
  onFitBounds,
  onToggleDropMode,
  onClearPin,
  onLocateMe,
  isLocating
}) => {
  return (
    <div className="absolute top-4 right-0 z-[800] flex flex-col gap-2">
      {/* Map Info Panel - Compact Mobile */}
      <div className="bg-white/95 backdrop-blur-md rounded-l-xl shadow-xl border-l border-t border-b border-white/40 p-2 md:p-3 min-w-[120px] md:min-w-[160px]">
        <div className="flex items-center gap-1 mb-1 md:mb-2">
          <Info className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-600" />
          <span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider">Info</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] md:text-xs text-slate-500">Count:</span>
            <span className="text-[11px] md:text-sm font-bold text-slate-900">{businesses.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] md:text-xs text-slate-500">Zoom:</span>
            <span className="text-[11px] md:text-sm font-bold text-slate-900">{currentZoom.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] md:text-xs text-slate-500">View:</span>
            <span className="text-[10px] md:text-xs font-bold text-indigo-600">
              {currentZoom >= 15 ? 'Scattered' : currentZoom >= 12 ? 'Spirals' : 'Clustered'}
            </span>
          </div>
          {droppedPin && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-rose-500 rounded-full"></div>
                <span className="text-[10px] md:text-xs font-bold text-rose-600">Pin Active</span>
              </div>
              <button
                onClick={onClearPin}
                className="mt-1 text-[10px] md:text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modern Map Controls */}
      <div className="bg-white/95 backdrop-blur-md shadow-xl border-t border-b border-r border-white/40 overflow-hidden w-10 md:w-12 ml-auto flex flex-col rounded-l-xl">
        {/* Zoom Controls */}
        <div className="flex flex-col">
          <button
            onClick={onZoomIn}
            className="p-2 md:p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
            title="Zoom In"
          >
            <Plus className="h-4 w-4 md:h-4 md:w-4" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-2 md:p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
            title="Zoom Out"
          >
            <Minus className="h-4 w-4 md:h-4 md:w-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col">
          <button
            onClick={onLocateMe}
            className={`p-2 md:p-2 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center ${isLocating ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            title="Locate Me"
          >
            <Navigation className={`h-4 w-4 md:h-4 md:w-4 ${isLocating ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={onFitBounds}
            className="p-2 md:p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
            title="Fit All Businesses"
          >
            <Target className="h-4 w-4 md:h-4 md:w-4" />
          </button>
          <button
            onClick={onToggleDropMode}
            className={`p-2 md:p-2 transition-all duration-200 flex items-center justify-center ${isDropMode
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
              }`}
            title={isDropMode ? 'Cancel Drop Pin' : 'Drop Filter Pin (500m radius)'}
          >
            {isDropMode ? <X className="h-4 w-4 md:h-4 md:w-4" /> : <MapPin className="h-4 w-4 md:h-4 md:w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};