import { Layers, CheckCircle2 } from 'lucide-react';
import { getProviderColor } from '../utils/providerColors';

interface ProviderBarProps {
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const ProviderBar: React.FC<ProviderBarProps> = ({
  availableProviders,
  visibleProviders,
  onToggleProvider,
  onSelectAll,
  onClearAll
}) => {
  if (availableProviders.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Network Layers</h2>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
          <button
            onClick={onSelectAll}
            className="text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Select All
          </button>
          <div className="h-3 w-[1px] bg-slate-200" />
          <button
            onClick={onClearAll}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableProviders.map(provider => {
          const isActive = visibleProviders.includes(provider);
          const color = getProviderColor(provider);

          return (
            <button
              key={provider}
              onClick={() => onToggleProvider(provider)}
              className={`group relative flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 transition-all duration-300 ${isActive
                ? 'border-white bg-white shadow-md'
                : 'border-slate-100 bg-white/50 hover:border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
            >
              <div
                className="h-2 w-2 rounded-full ring-2 ring-white shadow-sm transition-transform group-hover:scale-125"
                style={{ backgroundColor: color }}
              />
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {provider}
              </span>
              {isActive && (
                <CheckCircle2 className="h-3 w-3 text-indigo-500 animate-in zoom-in" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
