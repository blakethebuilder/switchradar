import { Building2, MapPin, Phone, Mail, ChevronRight } from 'lucide-react';
import type { Business } from '../types';
import { ProviderBadge } from './ProviderBadge';

interface BusinessTableProps {
  businesses: Business[];
  onBusinessSelect?: (business: Business) => void;
}

export const BusinessTable: React.FC<BusinessTableProps> = ({
  businesses,
  onBusinessSelect
}) => {
  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
        <p className="max-w-xs text-center text-sm font-medium">Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 transition-all">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">Business Details</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">Contact Info</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">Location</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">Provider</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.slice(0, 200).map((business) => (
              <tr
                key={business.id}
                className="group hover:bg-slate-50/70 cursor-pointer transition-all active:bg-slate-100"
                onClick={() => onBusinessSelect?.(business)}
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-lg group-hover:bg-indigo-100 transition-colors">
                      {business.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 leading-tight mb-0.5">
                        {business.name}
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {business.category}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-8 py-6">
                  <div className="space-y-1.5 focus-within:ring-0">
                    {business.phone && (
                      <div className="flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                        <Phone className="w-3.5 h-3.5 mr-2 opacity-60" />
                        {business.phone}
                      </div>
                    )}
                    {business.email && (
                      <div className="flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                        <Mail className="w-3.5 h-3.5 mr-2 opacity-60" />
                        {business.email}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm font-bold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                      {business.town}
                    </div>
                    <div className="text-xs font-medium text-slate-400 pl-5.5 truncate max-w-[200px]">
                      {business.address}
                    </div>
                  </div>
                </td>

                <td className="px-8 py-6">
                  <ProviderBadge provider={business.provider} className="font-bold scale-110" />
                </td>

                <td className="px-8 py-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm ${business.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : business.status === 'contacted'
                      ? 'bg-sky-50 text-sky-700 border border-sky-100'
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                    {business.status}
                  </span>
                </td>

                <td className="px-8 py-6 text-right">
                  <button className="p-2 text-slate-300 group-hover:text-indigo-600 group-hover:bg-white rounded-xl shadow-none group-hover:shadow-lg transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
