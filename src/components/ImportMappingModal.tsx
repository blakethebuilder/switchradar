import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import type { ImportMapping, ImportFieldKey } from '../types';

const FIELD_LABELS: Record<ImportFieldKey, string> = {
  name: 'Business Name',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  provider: 'Provider',
  category: 'Category',
  town: 'Town',
  province: 'Province',
  lat: 'Latitude',
  lng: 'Longitude',
  status: 'Status',
  mapsLink: 'Google Maps Link'
};

const REQUIRED_FIELDS: ImportFieldKey[] = ['name'];

interface ImportMappingModalProps {
  isOpen: boolean;
  columns: string[];
  initialMapping: ImportMapping;
  onConfirm: (mapping: ImportMapping) => void;
  onBack: () => void;
}

const guessMappingValue = (columns: string[], candidates: string[]) => {
  const lower = columns.map(col => col.toLowerCase());
  const matchIndex = lower.findIndex(col => candidates.some(candidate => col.includes(candidate)));
  return matchIndex >= 0 ? columns[matchIndex] : '';
};

export const ImportMappingModal: React.FC<ImportMappingModalProps> = ({
  isOpen,
  columns,
  initialMapping,
  onConfirm,
  onBack
}) => {
  const [mapping, setMapping] = useState<ImportMapping>(initialMapping);

  const defaultMapping = useMemo(() => {
    if (!columns.length) {
      return {};
    }
    return {
      name: initialMapping.name || guessMappingValue(columns, ['name', 'business', 'company']),
      address: initialMapping.address || guessMappingValue(columns, ['address', 'street']),
      phone: initialMapping.phone || guessMappingValue(columns, ['phone', 'telephone', 'mobile', 'number']),
      email: initialMapping.email || guessMappingValue(columns, ['email']),
      website: initialMapping.website || guessMappingValue(columns, ['website', 'url', 'site']),
      provider: initialMapping.provider || guessMappingValue(columns, ['provider', 'network']),
      category: initialMapping.category || guessMappingValue(columns, ['category', 'type', 'industry']),
      town: initialMapping.town || guessMappingValue(columns, ['town', 'city', 'suburb']),
      province: initialMapping.province || guessMappingValue(columns, ['province', 'state', 'region']),
      lat: initialMapping.lat || guessMappingValue(columns, ['lat', 'latitude']),
      lng: initialMapping.lng || guessMappingValue(columns, ['lng', 'lon', 'longitude']),
      status: initialMapping.status || guessMappingValue(columns, ['status']),
      mapsLink: initialMapping.mapsLink || guessMappingValue(columns, ['maps', 'link', 'url', 'address'])
    };
  }, [columns, initialMapping]);

  useEffect(() => {
    if (isOpen) {
      setMapping(defaultMapping);
    }
  }, [isOpen, defaultMapping]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: ImportFieldKey, value: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const missingRequired = REQUIRED_FIELDS.filter(field => !mapping[field]);
  const isValid = missingRequired.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Map Connections</h2>
              <p className="text-sm font-semibold text-slate-400">Define how your spreadsheet data connects to our platform</p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto bg-slate-50/30 p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(FIELD_LABELS) as ImportFieldKey[]).map(field => {
              const isRequired = REQUIRED_FIELDS.includes(field);
              const isMapped = !!mapping[field];

              return (
                <div
                  key={field}
                  className={`flex flex-col gap-3 rounded-[2rem] border-2 p-6 transition-all ${isMapped
                    ? 'border-white bg-white shadow-md'
                    : isRequired
                      ? 'border-rose-100 bg-rose-50/30'
                      : 'border-slate-100 bg-white/50'
                    }`}
                >
                  <label className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {FIELD_LABELS[field]}
                      {isRequired && <span className="ml-1 text-rose-500">*</span>}
                    </span>
                    {isMapped ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    ) : (
                      isRequired && <AlertCircle className="h-4 w-4 text-rose-300" />
                    )}
                  </label>

                  <select
                    value={mapping[field] ?? ''}
                    onChange={(event) => handleChange(field, event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5"
                  >
                    <option value="">Ignore Column</option>
                    {columns.map(column => (
                      <option key={`${field}-${column}`} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-8 py-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to File
          </button>

          <div className="flex items-center gap-6">
            {!isValid && (
              <span className="hidden text-xs font-bold text-rose-500 md:block">
                Required mapping missing: {missingRequired.map(f => FIELD_LABELS[f]).join(', ')}
              </span>
            )}
            <button
              type="button"
              disabled={!isValid}
              onClick={() => onConfirm(mapping)}
              className="btn-primary px-8"
            >
              FINALIZE IMPORT
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
