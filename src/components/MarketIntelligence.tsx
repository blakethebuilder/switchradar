import React, { useMemo, useState } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, BarChart3, PieChart as PieChartIcon, Network, Minus, Plus } from 'lucide-react';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';

interface MarketIntelligenceProps {
    businesses: Business[];
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ businesses }) => {
    const [minimized, setMinimized] = useState<Record<string, boolean>>({});

    const toggleMinimize = (id: string) => {
        setMinimized(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 1. Provider Distribution
    const providerData = useMemo(() => {
        const counts: Record<string, number> = {};
        businesses.forEach(b => {
            counts[b.provider] = (counts[b.provider] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [businesses]);

    // 2. Category Distribution
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        businesses.forEach(b => {
            counts[b.category] = (counts[b.category] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [businesses]);

    // 3. Network Penetration (By Town)
    const townData = useMemo(() => {
        const towns: Record<string, { name: string, businesses: number, networks: Set<string> }> = {};
        businesses.forEach(b => {
            if (!towns[b.town]) towns[b.town] = { name: b.town, businesses: 0, networks: new Set() };
            towns[b.town].businesses += 1;
            towns[b.town].networks.add(b.provider);
        });
        return Object.values(towns)
            .map(t => ({ name: t.name, businesses: t.businesses, networks: t.networks.size }))
            .sort((a, b) => b.businesses - a.businesses)
            .slice(0, 8);
    }, [businesses]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl">
                    <p className="text-white font-bold text-xs mb-1 uppercase tracking-widest">{payload[0].name || payload[0].payload.name}</p>
                    <div className="space-y-1">
                        {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill }} />
                                <p className="text-indigo-400 font-black text-sm">{entry.value.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">{entry.name}</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-grow flex flex-col gap-8 pb-20">
            {/* Header Stats - simplified */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-[2.5rem] p-8 flex items-center gap-6 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
                        <Users className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Active Businesses</p>
                        <h3 className="text-3xl font-black text-slate-900 leading-none">{businesses.length.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="glass-card rounded-[2.5rem] p-8 flex items-center gap-6 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center">
                        <Network className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Identified Networks</p>
                        <h3 className="text-3xl font-black text-slate-900 leading-none">{providerData.length}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Network Distribution Pie */}
                <div className="glass-card rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                <PieChartIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Network Distribution</h3>
                        </div>
                        <button onClick={() => toggleMinimize('pie')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900">
                            {minimized['pie'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </button>
                    </div>
                    {!minimized['pie'] && (
                        <div className="h-[450px] w-full flex flex-col items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={providerData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={110}
                                        outerRadius={150}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {providerData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getProviderColor(entry.name)} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        content={({ payload }: any) => (
                                            <div className="flex flex-wrap justify-center gap-3 mt-12">
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={`item-${index}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer">
                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{entry.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Network Penetration Line Chart */}
                    <div className="glass-card rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Market Penetration</h3>
                            </div>
                            <button onClick={() => toggleMinimize('line')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900">
                                {minimized['line'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                            </button>
                        </div>
                        {!minimized['line'] && (
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={townData}>
                                        <defs>
                                            <linearGradient id="colorBiz" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area name="Businesses" type="monotone" dataKey="businesses" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorBiz)" />
                                        <Area name="Networks" type="monotone" dataKey="networks" stroke="#10b981" strokeWidth={4} fill="transparent" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Category Intelligence Bar */}
                    <div className="glass-card rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Market Categories</h3>
                            </div>
                            <button onClick={() => toggleMinimize('bar')} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900">
                                {minimized['bar'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                            </button>
                        </div>
                        {!minimized['bar'] && (
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                                            width={140}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar
                                            name="Businesses"
                                            dataKey="value"
                                            radius={[0, 12, 12, 0]}
                                            barSize={24}
                                        >
                                            {categoryData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
