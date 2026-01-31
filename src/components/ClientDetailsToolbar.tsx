import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown, Phone, Mail, MapPin, Building2, Smartphone, Landmark, MessageSquare, Route, Trash2 } from 'lucide-react';
import type { Business } from '../types';
import { isMobileProvider } from '../utils/phoneUtils';
import { ProviderBadge } from './ProviderBadge';
import { CanvasDrawingTool } from './CanvasDrawingTool';

interface ClientDetailsToolbarProps {
  business: Business;
  isInRoute: boolean;
  onAddToRoute: (id: string) => void;
  onRemoveFromRoute: (id: string) => void;
  onClose: () => void;
  onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
  onUpdateBusiness: (id: string, updates: Partial<Business>) => void;
  onDelete?: (id: string) => void;
}

export const ClientDetailsToolbar: React.FC<ClientDetailsToolbarProps> = ({
  business,
  isInRoute,
  onAddToRoute,
  onRemoveFromRoute,
  onClose,
  onTogglePhoneType,
  onUpdateBusiness,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  
  const isMobile = business.phoneTypeOverride
    ? business.phoneTypeOverride === 'mobile'
    : isMobileProvider(business.provider, business.phone);

  const handleSaveCanvas = (imageData: string) => {
    // Save canvas data to business metadata
    onUpdateBusiness(business.id, {
      metadata: {
        ...business.metadata,
        canvasData: imageData,
        lastCanvasUpdate: new Date().toISOString()
      }
    });
    setShowCanvas(false);
  };

  return (
    <>
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-white border-t border-slate-200 shadow-2xl">
        {/* Collapsed State - Business Info Bar */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Business Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate text-sm">
                  {business.name}
                </h3>
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={business.provider} className="scale-75 origin-left" />
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500 truncate">{business.town}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  title="Call"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded State - Full Details */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50">
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Contact Information */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Information
                  </h4>
                  
                  <div className="space-y-3">
                    {business.phone && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline')}
                            className={`p-2 rounded-lg transition-all ${
                              isMobile ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'
                            }`}
                            title={`Switch to ${isMobile ? 'Landline' : 'Cellphone'}`}
                          >
                            {isMobile ? <Smartphone className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                          </button>
                          <div>
                            <p className="font-medium text-slate-900">{business.phone}</p>
                            <p className="text-xs text-slate-500">{isMobile ? 'Mobile' : 'Landline'}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${business.phone}`}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    )}

                    {business.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <p className="text-slate-700">{business.email}</p>
                        </div>
                        <a
                          href={`mailto:${business.email}`}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Email
                        </a>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-700">{business.address}</p>
                        <p className="text-xs text-slate-500">{business.town}, {business.province}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</p>
                      <p className="text-slate-900 font-medium">{business.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                      <p className="text-slate-900 font-medium capitalize">{business.status}</p>
                    </div>
                  </div>
                </div>

                {/* Sales Canvas Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Sales Canvas
                    </h4>
                    <button
                      onClick={() => setShowCanvas(!showCanvas)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      {showCanvas ? 'Close Canvas' : 'Open Canvas'}
                    </button>
                  </div>
                  
                  {showCanvas && (
                    <div className="mt-4">
                      <CanvasDrawingTool
                        onSave={handleSaveCanvas}
                        onCancel={() => setShowCanvas(false)}
                        initialData={business.metadata?.canvasData as string | undefined}
                      />
                    </div>
                  )}
                  
                  {(() => {
                    const canvasData = business.metadata?.canvasData;
                    const lastUpdate = business.metadata?.lastCanvasUpdate;
                    
                    if (!showCanvas && canvasData && typeof canvasData === 'string') {
                      return (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-2">
                            Last updated: {
                              lastUpdate && typeof lastUpdate === 'string'
                                ? new Date(lastUpdate).toLocaleDateString()
                                : 'Unknown'
                            }
                          </p>
                          <img 
                            src={canvasData} 
                            alt="Sales canvas"
                            className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => isInRoute ? onRemoveFromRoute(business.id) : onAddToRoute(business.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                      isInRoute
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Route className="w-4 h-4" />
                    {isInRoute ? 'Remove from Route' : 'Add to Route'}
                  </button>
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(business.id)}
                      className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-[999]"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};