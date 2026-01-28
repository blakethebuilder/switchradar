import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TrendingUp, Users, Target, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';

interface MarketIntelligenceProps {
    businesses: Business[];
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ businesses }) => {
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
            .slice(0, 8);
    }, [businesses]);

    // 3. Stats
    const stats = useMemo(() => {
        const total = businesses.length;
        const topProvider = providerData[0]?.name || 'N/A';
        const marketShare = total > 0 ? ((providerData[0]?.value / total) * 100).toFixed(1) : 0;

        return [
            { label: 'Total Leads', value: total.toLocaleString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Dominant Network', value: topProvider, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Market Share', value: `${marketShare}%`, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
        ];
    }, [businesses, providerData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl">
                    <p className="text-white font-bold text-xs mb-1 uppercase tracking-widest">{payload[0].name}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
                        <p className="text-indigo-400 font-black text-sm">{payload[0].value.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Leads</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-grow flex flex-col gap-8 pb-20">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="glass-card rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border-white/40 flex items-center gap-6 group hover:translate-y-[-4px] transition-all">
                        <div className={`h-16 w-16 rounded-3xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                            <stat.icon className={`h-8 w-8 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Provider Market Share */}
                <div className="glass-card rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                <PieChartIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Network Distribution</h3>
                        </div>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={providerData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={100}
                                    outerRadius={140}
                                    paddingAngle={5}
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
                                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                                            {payload.map((entry: any, index: number) => (
                                                <div key={`item-${index}`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Intelligence */}
                <div className="glass-card rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Market Categories</h3>
                        </div>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    width={150}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 10, 10, 0]}
                                    barSize={32}
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
