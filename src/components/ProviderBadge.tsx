import { getProviderColor } from '../utils/providerColors';

interface ProviderBadgeProps {
  provider: string;
  className?: string;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider, className = '' }) => {
  const color = getProviderColor(provider);

  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100 ${className}`}
    >
      <div
        className="w-2.5 h-2.5 rounded-full mr-2 ring-2 ring-white shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-slate-600">{provider}</span>
    </span>
  );
};
