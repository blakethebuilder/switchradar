import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, PieChart, Pie
} from 'recharts';
import { Users, Network, Smartphone, Phone, Minus, Plus, Signal, PieChart as PieChartIcon, Building2, MapPin, Search, Filter, TrendingUp, Eye, EyeOff } from 'lucide-react';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';
import { isMobileProvider } from '../utils/phoneUtils';

interface MarketIntelligenceProps {
    businesses: Business[];
    droppedPin: { lat: number, lng: number } | null;
    radiusKm: number;
    onProviderFilter?: (provider: string) => void;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ 
    businesses, 
    droppedPin, 
    radiusKm, 
    onProviderFilter 
}) => {
    const [minimized, setMinimized] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllProviders, setShowAllProviders] = useState(false);
    const [minProviderSize, setMinProviderSize] = useState(1);
    const [viewMode, setViewMode] = useState<'chart' | 'pie'>('chart');

    const toggleMinimize = (id: string) => {
        setMinimized(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Provider Distribution - Enhanced for large datasets
    const providerData = useMemo(() => {
        const counts: Record<string, number> = {};
        
        businesses.forEach(business => {
            const provider = business.provider?.trim() || 'Unknown';
            counts[provider] = (counts[provider] || 0) + 1;
        });
        
        const allProviders = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .filter(item => item.value >= minProviderSize);

        // Group small providers into "Others" for better visualization
        const threshold = Math.max(5, Math.ceil(businesses.length * 0.005)); // 0.5% or minimum 5
        const majorProviders = allProviders.filter(p => p.value >= threshold);
        const minorProviders = allProviders.filter(p => p.value < threshold);
        
        let result = majorProviders;
        
        if (minorProviders.length > 0 && !showAllProviders) {
            const othersCount = minorProviders.reduce((sum, p) => sum + p.value, 0);
            if (othersCount > 0) {
                result.push({ 
                    name: `Others (${minorProviders.length} providers)`, 
                    value: othersCount 
                });
            }
        } else if (showAllProviders) {
            result = allProviders;
        }
        
        // Apply search filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item => 
                (item.name || '').toLowerCase().includes(lowerTerm)
            );
        }
        
        return result;
    }, [businesses, minProviderSize, showAllProviders, searchTerm]);

    // Performance metrics
    const performanceMetrics = useMemo(() => {
        const totalBusinesses = businesses.length;
        const uniqueProviders = new Set(businesses.map(b => b.provider?.trim() || 'Unknown')).size;
        const avgBusinessesPerProvider = totalBusinesses / uniqueProviders;
        
        // Market concentration (Herfindahl-Hirschman Index)
        const marketShares = providerData.map(p => (p.value / totalBusinesses) * 100);
        const hhi = marketShares.reduce((sum, share) => sum + (share * share), 0);
        
        // Market concentration interpretation
        let marketConcentration = 'Highly Competitive';
        if (hhi > 2500) marketConcentration = 'Highly Concentrated';
        else if (hhi > 1500) marketConcentration = 'Moderately Concentrated';
        else if (hhi > 1000) marketConcentration = 'Unconcentrated';
        
        return {
            totalBusinesses,
            uniqueProviders,
            avgBusinessesPerProvider: Math.round(avgBusinessesPerProvider),
            hhi: Math.round(hhi),
            marketConcentration,
            topProvider: providerData[0],
            marketLeaderShare: providerData[0] ? ((providerData[0].value / totalBusinesses) * 100).toFixed(1) : '0'
        };
    }, [businesses, providerData]);

    // Phone Type Analysis
    const phoneTypeData = useMemo(() => {
        let mobile = 0;
        let landline = 0;

        businesses.forEach(business => {
            const isMobile = business.phoneTypeOverride
                ? business.phoneTypeOverride === 'mobile'
                : isMobileProvider(business.provider, business.phone);

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

    // Network Percentages
    const networkPercentages = useMemo(() => {
        const total = businesses.length || 1;
        return providerData.map(provider => ({
            ...provider,
            percentage: ((provider.value / total) * 100).toFixed(1)
        }));
    }, [providerData, businesses.length]);

    // Industry Breakdown
    const industryData = useMemo(() => {
        const counts: Record<string, number> = {};
        
        businesses.forEach(business => {
            const category = business.category?.trim() || 'Uncategorized';
            counts[category] = (counts[category] || 0) + 1;
        });
        
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 15); // Top 15 categories
    }, [businesses]);

    // Enhanced Custom Tooltip Component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = ((data.value / businesses.length) * 100).toFixed(2);
            return (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl max-w-xs">
                    <p className="text-white font-bold text-sm mb-2">{data.name}</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: getProviderColor(data.name) }} 
                            />
                            <p className="text-indigo-400 font-bold text-sm">
                                {data.value.toLocaleString()} businesses
                            </p>
                        </div>
                        <p className="text-slate-300 text-xs">
                            {percentage}% market share
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Pie chart data for alternative visualization
    const pieData = useMemo(() => {
        return providerData.slice(0, 10).map((item) => ({
            ...item,
            fill: getProviderColor(item.name)
        }));
    }, [providerData]);

    return (
        <div className="flex-grow flex flex-col gap-8 pb-20 fade-in animate-in duration-700">
            {/* Radius Filter Notice */}
            {droppedPin && (
                <div className="flex items-center gap-3 p-4 md:p-6 lg:p-8 rounded-[2.5rem] bg-rose-50 border border-rose-200 text-rose-800 shadow-lg animate-in fade-in duration-500">
                    <MapPin className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold">
                        Analysis limited to businesses within <span className="font-black text-rose-900">{radiusKm} km</span> radius. 
                        Clear the pin filter for full data view.
                    </p>
                </div>
            )}
            
            {/* Enhanced Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex items-center gap-5 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Users className="h-7 w-7 lg:h-8 lg:w-8 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                            Active Businesses
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
                            {businesses.length.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex items-center gap-5 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Network className="h-7 w-7 lg:h-8 lg:w-8 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                            Unique Providers
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
                            {performanceMetrics.uniqueProviders}
                        </h3>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex items-center gap-5 border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-violet-50 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-7 w-7 lg:h-8 lg:w-8 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                            Market Leader
                        </p>
                        <h3 className="text-lg lg:text-xl font-black text-slate-900 leading-none truncate">
                            {performanceMetrics.marketLeaderShare}%
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                            {performanceMetrics.topProvider?.name}
                        </p>
                    </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 flex flex-col justify-center border-white/40 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    <div 
                        className="absolute top-0 bottom-0 left-0 bg-indigo-50/50 transition-all duration-1000" 
                        style={{ width: `${phoneTypeData.landlinePct}%` }}
                    />
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

            {/* Market Concentration Insights */}
            <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-slate-200/30 border-white/60">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Market Analysis</h3>
                        <p className="text-xs font-semibold text-slate-400">Competition and concentration metrics</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 rounded-2xl bg-slate-50/50">
                        <p className="text-2xl font-black text-slate-900">{performanceMetrics.avgBusinessesPerProvider}</p>
                        <p className="text-xs font-semibold text-slate-500">Avg. per Provider</p>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-slate-50/50">
                        <p className="text-2xl font-black text-slate-900">{performanceMetrics.hhi}</p>
                        <p className="text-xs font-semibold text-slate-500">HHI Score</p>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-slate-50/50">
                        <p className="text-sm font-black text-slate-900">{performanceMetrics.marketConcentration}</p>
                        <p className="text-xs font-semibold text-slate-500">Market Type</p>
                    </div>
                </div>
            </div>

            {/* Enhanced Provider Analysis Chart */}
            <div className="glass-card rounded-[3rem] p-6 lg:p-10 shadow-2xl shadow-slate-200/40 border-white/60">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                            <Signal className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Provider Analysis</h3>
                            <p className="text-xs font-semibold text-slate-400">
                                Market share by network volume • {providerData.length} providers
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('chart')}
                                className={`p-2 rounded-md transition-all ${
                                    viewMode === 'chart' 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                title="Bar Chart View"
                            >
                                <Signal className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('pie')}
                                className={`p-2 rounded-md transition-all ${
                                    viewMode === 'pie' 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                title="Pie Chart View"
                            >
                                <PieChartIcon className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => toggleMinimize('providers')} 
                            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            {minimized['providers'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {!minimized['providers'] && (
                    <div className="space-y-6">
                        {/* Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50/50 rounded-2xl">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search providers..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            
                            {/* Minimum Size Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <select
                                    value={minProviderSize}
                                    onChange={(e) => setMinProviderSize(Number(e.target.value))}
                                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value={1}>All Providers</option>
                                    <option value={5}>5+ Businesses</option>
                                    <option value={10}>10+ Businesses</option>
                                    <option value={25}>25+ Businesses</option>
                                    <option value={50}>50+ Businesses</option>
                                    <option value={100}>100+ Businesses</option>
                                </select>
                            </div>
                            
                            {/* Show All Toggle */}
                            <button
                                onClick={() => setShowAllProviders(!showAllProviders)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    showAllProviders
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {showAllProviders ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showAllProviders ? 'Group Small' : 'Show All'}
                            </button>
                        </div>

                        {/* Chart */}
                        <div className="h-[600px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {viewMode === 'chart' ? (
                                    <BarChart 
                                        data={providerData.slice(0, 50)} // Limit to top 50 for performance
                                        layout="vertical" 
                                        margin={{ 
                                            top: 20, 
                                            right: 60, 
                                            left: 160, 
                                            bottom: 20 
                                        }}
                                        barCategoryGap="8%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            type="number" 
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickFormatter={(value) => value.toLocaleString()}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ 
                                                fontSize: 11, 
                                                fontWeight: 600, 
                                                fill: '#475569',
                                                textAnchor: 'end'
                                            }}
                                            width={150}
                                            interval={0}
                                            tickFormatter={(value) => {
                                                const maxLength = 20;
                                                if (value.length > maxLength) {
                                                    return value.substring(0, maxLength) + '...';
                                                }
                                                return value;
                                            }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                                            {providerData.slice(0, 50).map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={getProviderColor(entry.name)} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={200}
                                            innerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => 
                                                percent && percent > 3 ? `${name} ${(percent * 100).toFixed(1)}%` : ''
                                            }
                                            labelLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        </div>

                        {/* Performance Info */}
                        <div className="text-center text-sm text-slate-500">
                            {searchTerm && (
                                <p>Showing {providerData.length} providers matching "{searchTerm}"</p>
                            )}
                            {!showAllProviders && providerData.some(p => p.name.includes('Others')) && (
                                <p>Small providers grouped into "Others" for better visualization</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Network Share Grid */}
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
                    <button 
                        onClick={() => toggleMinimize('share')} 
                        className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        {minimized['share'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                    </button>
                </div>

                {!minimized['share'] && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {networkPercentages.map((network) => (
                            <button
                                key={network.name}
                                onClick={() => onProviderFilter?.(network.name)}
                                className="flex flex-col gap-2 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                title={`Filter map to show only ${network.name} businesses`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="h-3 w-3 rounded-full shadow-sm" 
                                            style={{ backgroundColor: getProviderColor(network.name) }} 
                                        />
                                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate max-w-[80px] group-hover:text-indigo-600 transition-colors">
                                            {network.name}
                                        </span>
                                    </div>
                                    <span className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {network.percentage}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                                        style={{ 
                                            width: `${network.percentage}%`, 
                                            backgroundColor: getProviderColor(network.name) 
                                        }} 
                                    />
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 text-right group-hover:text-indigo-500 transition-colors">
                                    {network.value.toLocaleString()} businesses
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Industry Analysis */}
            <div className="glass-card rounded-[3rem] p-6 lg:p-10 shadow-xl shadow-slate-200/30 border-white/60">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Industry Analysis</h3>
                            <p className="text-xs font-semibold text-slate-400">Top business categories</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toggleMinimize('industry')} 
                        className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        {minimized['industry'] ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                    </button>
                </div>

                {!minimized['industry'] && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Categories */}
                        <div className="grid grid-cols-2 gap-4">
                            {industryData.slice(0, 6).map((industry, index) => (
                                <div key={industry.name} className="flex flex-col p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-400">
                                            #{index + 1}
                                        </span>
                                        <span className="text-lg font-black text-slate-900">
                                            {((industry.value / (businesses.length || 1)) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 truncate" title={industry.name}>
                                        {industry.name}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400">
                                        {industry.value.toLocaleString()} businesses
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Industry Chart */}
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
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                                        {industryData.slice(0, 10).map((_, index) => (
                                            <Cell 
                                                key={`industry-cell-${index}`} 
                                                fill={`hsl(${220 + index * 15}, 70%, ${60 + index * 5}%)`} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketIntelligence;