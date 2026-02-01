import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import { Users, Network, Smartphone, Phone, Minus, Plus, Signal, PieChart as PieChartIcon, Building2, MapPin } from 'lucide-react';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';
import { isMobileProvider } from '../utils/phoneUtils';

interface MarketIntelligenceProps {
    businesses: Business[];
    droppedPin: { lat: number, lng: number } | null;
    radiusKm: number;
    onProviderFilter?: (provider: string) => void;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ businesses, droppedPin, radiusKm, onProviderFilter }) => {
    const [minimized, setMinimized] = useState<Record<string, boolean>>({});

    const toggleMinimize = (id: string) => {
        setMinimized(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const isFilteredByRadius = !!droppedPin;

    // 1. Provider Distribution (Full List)
    const providerData = useMemo(() => {
        const counts: Record<string, number> = {};
        businesses.forEach(b => {
            counts[b.provider] = (counts[b.provider] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [businesses]);

    // 2. Phone Type Split (Mobile vs Landline)
    const phoneTypeData = useMemo(() => {
        let mobile = 0;
        let landline = 0;

        businesses.forEach(b => {
            const isMobile = b.phoneTypeOverride
                ? b.phoneTypeOverride === 'mobile'
                : isMobileProvider(b.provider, b.phone);

            if (isMobile) mobile++;
            else landline++;
        });

        const total = mobile + landline || 1;

        return {
            mobile,
            landline,
            mobilePct: Math.round((mobile / total) * 100),
            landlinePct: Math.round((landline / total) * 100)
        };
    }, [businesses]);

    // 3. Network Percentages
    const networkPcts = useMemo(() => {
        const total = businesses.length || 1;
        return providerData.map(p => ({
            ...p,
            pct: ((p.value / total) * 100).toFixed(1)
        }));
    }, [providerData, businesses.length]);

    // 4. Industry/Category Breakdown
    const industryData = useMemo(() => {
        const counts: Record<string, number> = {};
        businesses.forEach(b => {
            const cat = b.category || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [businesses]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl z-50">
                    <p className="text-white font-bold text-xs mb-1 uppercase tracking-widest">{data.name}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getProviderColor(data.name) }} />
                        <p className="text-indigo-400 font-black text-sm">{data.value.toLocaleString()} <span className="text-slate-500 text-[10px] ml-1">businesses</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-grow flex flex-col gap-8 pb-20 fade-in animate-in duration-700">
            {/* Header Stats */}
            {isFilteredByRadius && (
                <div className="flex items-center gap-3 p-4 md:p-6 lg:p-8 rounded-[2.5rem] bg-rose-50 border border-rose-200 text-rose-800 shadow-lg animate-in fade-in duration-500">
                    <MapPin className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold">
                        Analysis is limited to businesses within a <span className="font-black text-rose-900">{radiusKm} km</span> radius of the dropped pin. Clear the pin filter for a full data view.
                    </p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex items-center gap-5 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Users className="h-7 w-7 lg:h-8 lg:w-8 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Active Businesses</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">{businesses.length.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex items-center gap-5 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Network className="h-7 w-7 lg:h-8 lg:w-8 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Unique Networks</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">{providerData.length}</h3>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex flex-col justify-center border-white/40 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    {/* Background Split */}
                    <div className="absolute top-0 bottom-0 left-0 bg-indigo-50/50 w-[var(--p)] transition-all duration-1000" style={{ '--p': `${phoneTypeData.landlinePct}%` } as any} />

                    <div className="relative z-10 flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Phone className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-900/60">Fixed</p>
                                <p className="text-xl font-black text-indigo-900">{phoneTypeData.landlinePct}%</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200/80" />
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mobile</p>
                                <p className="text-xl font-black text-slate-900">{phoneTypeData.mobilePct}%</p>
                            </div>
                            <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                <Smartphone className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* 1. Full Width Bar Chart - Provider Analysis */}
                <div className="glass-card rounded-[3rem] p-6 lg:p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                                <Signal className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Provider Analysis</h3>
                                <p className="text-xs font-semibold text-slate-400">Market share by network volume</p>
                            </div>
                        </div>
                        <button onClick={() => toggleMinimize('bar')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                            {minimized['bar'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </button>
                    </div>

                    {!minimized['bar'] && (
                        <div className="h-[500px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={providerData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        hide
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                                        width={140}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                        {providerData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getProviderColor(entry.name)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* 2. Full Width Network Share */}
                <div className="glass-card rounded-[3rem] p-6 lg:p-10 shadow-xl shadow-slate-200/30 border-white/60">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                <PieChartIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Network Share</h3>
                                <p className="text-xs font-semibold text-slate-400">Percentage distribution across database</p>
                            </div>
                        </div>
                        <button onClick={() => toggleMinimize('pct')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                            {minimized['pct'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </button>
                    </div>

                    {!minimized['pct'] && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {networkPcts.map((network) => (
                                <button
                                    key={network.name}
                                    onClick={() => onProviderFilter?.(network.name)}
                                    className="flex flex-col gap-2 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                    title={`Filter map to show only ${network.name} businesses`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: getProviderColor(network.name) }} />
                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate max-w-[80px] group-hover:text-indigo-600 transition-colors">{network.name}</span>
                                        </div>
                                        <span className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{network.pct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${network.pct}%`, backgroundColor: getProviderColor(network.name) }} />
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-500 text-right group-hover:text-indigo-500 transition-colors">{network.value.toLocaleString()} businesses</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Industry Breakdown */}
                <div className="glass-card rounded-[3rem] p-6 lg:p-10 shadow-xl shadow-slate-200/30 border-white/60">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Industry & Sector Analysis</h3>
                                <p className="text-xs font-semibold text-slate-400">Top business categories in this area</p>
                            </div>
                        </div>
                        <button onClick={() => toggleMinimize('industry')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                            {minimized['industry'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </button>
                    </div>

                    {!minimized['industry'] && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Top Categories List */}
                            <div className="grid grid-cols-2 gap-4 h-min">
                                {industryData.slice(0, 6).map((industry, index) => (
                                    <div key={index} className="flex flex-col p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-400">#{index + 1}</span>
                                            <span className="text-lg font-black text-slate-900">{((industry.value / (businesses.length || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="text-sm font-bold text-slate-800 truncate" title={industry.name}>{industry.name}</div>
                                        <div className="text-[10px] font-medium text-slate-400">{industry.value.toLocaleString()} businesses</div>
                                    </div>
                                ))}
                            </div>

                            {/* Horizontal Bar Chart */}
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={industryData.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                            width={140}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar
                                            dataKey="value"
                                            className="fill-indigo-500"
                                            radius={[0, 6, 6, 0]}
                                            barSize={18}
                                        >
                                            <Cell fill="#6366f1" />
                                            <Cell fill="#818cf8" />
                                            <Cell fill="#a5b4fc" />
                                            <Cell fill="#c7d2fe" />
                                            <Cell fill="#e0e7ff" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
