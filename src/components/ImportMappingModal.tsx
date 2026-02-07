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
  const lower = columns.map(col => (col || '').toLowerCase());
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
      category: initialMapping.category || guessMappingValue(columns, ['category', 'type_of_business', 'type', 'industry']),
      town: initialMapping.town || guessMappingValue(columns, ['town', 'city', 'suburb']),
      province: initialMapping.province || guessMappingValue(columns, ['province', 'state', 'region']),
      lat: initialMapping.lat || guessMappingValue(columns, ['lat', 'latitude']),
      lng: initialMapping.lng || guessMappingValue(columns, ['lng', 'lon', 'longitude']),
      status: initialMapping.status || guessMappingValue(columns, ['status']),
      mapsLink: initialMapping.mapsLink || guessMappingValue(columns, ['maps_address', 'maps', 'link', 'url'])
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
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] mx-2">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 md:px-6 py-4 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">Map Connections</h2>
              <p className="text-xs font-semibold text-slate-400">Define column mappings</p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar overflow-y-auto bg-slate-50/30 p-3 md:p-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(Object.keys(FIELD_LABELS) as ImportFieldKey[]).map(field => {
              const isRequired = REQUIRED_FIELDS.includes(field);
              const isMapped = !!mapping[field];

              return (
                <div
                  key={field}
                  className={`flex flex-col gap-2 rounded-xl border p-3 transition-all ${isMapped
                    ? 'border-indigo-100 bg-white shadow-sm'
                    : isRequired
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-slate-200 bg-white/50'
                    }`}
                >
                  <label className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {FIELD_LABELS[field]}
                      {isRequired && <span className="ml-1 text-rose-500">*</span>}
                    </span>
                    {isMapped ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      isRequired && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                  </label>

                  <select
                    value={mapping[field] ?? ''}
                    onChange={(event) => handleChange(field, event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 md:py-2 text-xs font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500/30 focus:ring-2 focus:ring-indigo-500/10 touch-manipulation"
                    style={{ minHeight: '44px' }} // iOS touch target minimum
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

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-white px-4 md:px-6 py-4 z-10 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors py-2 px-4 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            {!isValid && (
              <span className="text-[10px] font-bold text-rose-500 text-center">
                Missing: {missingRequired.map(f => FIELD_LABELS[f]).join(', ')}
              </span>
            )}
            <button
              type="button"
              disabled={!isValid}
              onClick={() => onConfirm(mapping)}
              className="btn-primary py-3 px-6 text-xs min-h-[44px] touch-manipulation"
            >
              FINALIZE
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default ImportMappingModal;