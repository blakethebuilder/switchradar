import { Map, Plus, Zap, ShieldCheck, Globe } from 'lucide-react';

interface DashboardProps {
  businessCount: number;
  providerCount: number;
  townCount: number;
  onImportClick: () => void;
  onViewMapClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  businessCount,
  providerCount,
  townCount,
  onImportClick,
  onViewMapClick
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="relative mx-auto mb-10 h-24 w-24">
          <div className="absolute inset-0 animate-pulse rounded-3xl bg-indigo-500/20 blur-2xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-2xl shadow-indigo-200 transition-transform hover:scale-110">
            <Zap className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
          Visual Lead <span className="text-indigo-600">Intelligence</span>
        </h2>

        <p className="mx-auto mb-12 max-w-lg text-lg font-medium text-slate-500 leading-relaxed">
          The ultimate command center for your scraped business leads.
          Analyze market coverage, filter by providers, and dominate the map.
        </p>

        {businessCount === 0 ? (
          <div className="space-y-8">
            <button
              onClick={onImportClick}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-indigo-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
              START IMPORTING DATA
            </button>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Storage</p>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <Globe className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Global Mapping</p>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Instant Insights</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="rounded-3xl bg-white p-8 border border-slate-100 shadow-xl shadow-slate-100">
                <div className="mb-1 text-3xl font-extrabold text-indigo-600">{businessCount}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">LEADS</div>
              </div>
              <div className="rounded-3xl bg-white p-8 border border-slate-100 shadow-xl shadow-slate-100">
                <div className="mb-1 text-3xl font-extrabold text-indigo-600">{providerCount}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">NETWORKS</div>
              </div>
              <div className="rounded-3xl bg-white p-8 border border-slate-100 shadow-xl shadow-slate-100">
                <div className="mb-1 text-3xl font-extrabold text-indigo-600">{townCount}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">TOWNS</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={onViewMapClick}
                className="btn-primary px-8 py-4"
              >
                <Map className="h-5 w-5" />
                VIEW ON MAP
              </button>
              <button
                onClick={onImportClick}
                className="btn-secondary px-8 py-4"
              >
                IMPORT MORE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
