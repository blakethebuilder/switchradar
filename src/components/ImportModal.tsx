import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, FileJson, FileSpreadsheet, X, Loader2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  errorMessage?: string;
}

const ACCEPTED_FILE_TYPES = '.csv,.xlsx,.xls,.json';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  isImporting,
  onClose,
  onFileSelected,
  onLoadSample,
  errorMessage
}) => {
  const [dragActive, setDragActive] = useState(false);

  const helperText = useMemo(() => {
    return 'Supports CSV, Excel, and JSON files. Secure client-side processing.';
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Import Leads</h2>
            <p className="text-sm font-semibold text-slate-400">Scale your outreach with new data</p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            className={`group relative flex flex-col items-center justify-center rounded-[2rem] border-[3px] border-dashed p-12 text-center transition-all ${dragActive
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/50'
              }`}
          >
            <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl shadow-slate-200/50 transition-transform group-hover:scale-110 ${dragActive ? 'scale-110 animate-bounce' : ''}`}>
              <UploadCloud className={`h-10 w-10 ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            </div>

            <h3 className="mb-2 text-lg font-bold text-slate-900">
              {isImporting ? 'Processing Data...' : 'Drop your dataset here'}
            </h3>
            <p className="mb-6 max-w-[200px] text-xs font-semibold text-slate-400 leading-relaxed">
              Drag & drop your spreadsheets or JSON files directly here
            </p>

            <button
              type="button"
              disabled={isImporting}
              onClick={() => document.getElementById('switchradar-file-input')?.click()}
              className="btn-primary"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  IMPORTING...
                </>
              ) : (
                'CHOOSE FILE'
              )}
            </button>
            <input
              id="switchradar-file-input"
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">CSV / EXCEL</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileJson className="h-5 w-5" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">JSON DATA</div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-bold text-slate-400">
            {helperText}
          </p>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-600 animate-in slide-in-from-top-2">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-6">
          <button
            type="button"
            onClick={onLoadSample}
            className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
            disabled={isImporting}
          >
            Load Sample Leads
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
