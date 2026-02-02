import React from 'react';
import { ArrowLeft, ExternalLink, Presentation } from 'lucide-react';

interface PresentationViewProps {
  onBack: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onBack }) => {
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            title="Back to App"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Presentation Mode</h1>
          </div>
        </div>
        
        <a
          href="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?utm_content=DAHAKNTfXew&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Canva
        </a>
      </div>

      {/* Presentation Content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto h-full">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 h-full overflow-hidden">
            {/* Embedded Canva Presentation */}
            <div 
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '500px',
                boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
                overflow: 'hidden',
                borderRadius: '16px',
                willChange: 'transform'
              }}
            >
              <iframe
                loading="lazy"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  border: 'none',
                  padding: 0,
                  margin: 0
                }}
                src="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?embed"
                allowFullScreen
                allow="fullscreen"
                title="Everything Cloud Presentation"
              />
            </div>
          </div>
          
          {/* Attribution */}
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">
              <a
                href="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?utm_content=DAHAKNTfXew&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Copy of LATEST Everything Cloud Presentation Complete
              </a>
              {' '}by Blak Frost
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationView;