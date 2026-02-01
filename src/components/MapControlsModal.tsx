import React from 'react';
import { X, Plus, Minus, Target, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Info, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import type { Business } from '../types';

interface MapControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  mapInstance: L.Map | null;
  droppedPin: { lat: number, lng: number } | null;
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void;
  isDropMode: boolean;
  setIsDropMode: (mode: boolean) => void;
}

export const MapControlsModal: React.FC<MapControlsModalProps> = ({
  isOpen,
  onClose,
  businesses,
  mapInstance,
  droppedPin,
  setDroppedPin,
  isDropMode,
  setIsDropMode
}) => {
  if (!isOpen) return null;

  const handleZoomIn = () => mapInstance?.zoomIn();
  const handleZoomOut = () => mapInstance?.zoomOut();
  const handleFitAll = () => {
    if (businesses.length > 0 && mapInstance) {
      const bounds = L.latLngBounds(businesses.map(b => [b.coordinates.lat, b.coordinates.lng]));
      mapInstance.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 12
      });
    }
  };

  const handlePan = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!mapInstance) return;
    const center = mapInstance.getCenter();
    const offset = 0.01;
    
    switch (direction) {
      case 'north':
        mapInstance.panTo([center.lat + offset, center.lng]);
        break;
      case 'south':
        mapInstance.panTo([center.lat - offset, center.lng]);
        break;
      case 'east':
        mapInstance.panTo([center.lat, center.lng + offset]);
        break;
      case 'west':
        mapInstance.panTo([center.lat, center.lng - offset]);
        break;
    }
  };

  const handleDropPin = () => {
    if (isDropMode) {
      setIsDropMode(false);
    } else {
      setIsDropMode(true);
      setDroppedPin(null);
      mapInstance?.getContainer().focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Map Controls & Info</h2>
              <p className="text-sm font-semibold text-slate-400">Navigation tools and map information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Map Information */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Map Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Businesses</p>
                <p className="text-xl font-black text-slate-900">{businesses.length.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Zoom</p>
                <p className="text-xl font-black text-slate-900">{mapInstance?.getZoom()?.toFixed(1) || 'Loading...'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">View Mode</p>
                <p className="text-lg font-bold text-slate-900">
                  {mapInstance?.getZoom() && mapInstance.getZoom() >= 14 ? 'Scattered View' : 'Clustered View'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {mapInstance?.getZoom() && mapInstance.getZoom() >= 14 
                    ? 'Individual businesses visible for precise selection'
                    : 'Businesses grouped by proximity for better overview'
                  }
                </p>
              </div>
              {droppedPin && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 col-span-2">
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Filter Pin Active</p>
                  <p className="text-sm text-rose-800">500m radius filter is active</p>
                  <button
                    onClick={() => setDroppedPin(null)}
                    className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
                  >
                    Clear Filter Pin
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Navigation Controls
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Zoom Controls */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom Controls
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={handleZoomIn}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                  >
                    <Plus className="h-4 w-4" />
                    <div>
                      <p className="font-bold text-sm">Zoom In</p>
                      <p className="text-xs text-slate-500">Get closer view</p>
                    </div>
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                  >
                    <Minus className="h-4 w-4" />
                    <div>
                      <p className="font-bold text-sm">Zoom Out</p>
                      <p className="text-xs text-slate-500">See wider area</p>
                    </div>
                  </button>
                  <button
                    onClick={handleFitAll}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                  >
                    <Target className="h-4 w-4" />
                    <div>
                      <p className="font-bold text-sm">Fit All</p>
                      <p className="text-xs text-slate-500">Show all businesses</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Pan Controls */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Pan Controls
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div></div>
                  <button
                    onClick={() => handlePan('north')}
                    className="p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center"
                    title="Pan North"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div></div>
                  
                  <button
                    onClick={() => handlePan('west')}
                    className="p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center"
                    title="Pan West"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="p-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Navigation className="h-4 w-4 text-indigo-600" />
                  </div>
                  <button
                    onClick={() => handlePan('east')}
                    className="p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center"
                    title="Pan East"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  <div></div>
                  <button
                    onClick={() => handlePan('south')}
                    className="p-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center"
                    title="Pan South"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Tools */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Special Tools
            </h3>
            
            <div className="bg-slate-50 rounded-2xl p-4">
              <button
                onClick={handleDropPin}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                  isDropMode 
                    ? 'bg-rose-500 text-white' 
                    : 'bg-white hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {isDropMode ? <X className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                <div className="text-left">
                  <p className="font-bold text-sm">
                    {isDropMode ? 'Cancel Drop Pin' : 'Drop Filter Pin'}
                  </p>
                  <p className={`text-xs ${isDropMode ? 'text-rose-100' : 'text-slate-500'}`}>
                    {isDropMode ? 'Click to cancel pin placement' : 'Click map to place 500m radius filter'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Usage Tips
            </h4>
            <ul className="text-sm text-amber-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Zoom to level 14+ to see individual businesses clearly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Use drop pin for route planning in specific areas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Hold Shift + drag to select multiple businesses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Double-click icons for quick access to customer details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Use navigation arrows to browse businesses sequentially</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Close Controls
          </button>
        </div>
      </div>
    </div>
  );
};