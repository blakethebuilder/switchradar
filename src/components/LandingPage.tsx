import React, { useState } from 'react';
import { Lock, User, Loader2, MapPin, BarChart3, Route, Users, Sparkles, LogIn, Eye, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { environmentConfig } from '../config/environment';

export const LandingPage: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const apiUrl = environmentConfig.getApiUrl();
        const fullUrl = apiUrl ? `${apiUrl}/api/auth/login` : '/api/auth/login';

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            login(data.token, { 
                id: data.userId, 
                username: data.username,
                role: data.role || 'user',
                createdAt: data.createdAt || new Date().toISOString(),
                email: data.email
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex flex-col">
            {/* Header */}
            <header className="p-6 lg:p-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">SwitchRadar</h1>
                        <p className="text-xs font-bold text-slate-500">Business Intelligence Platform</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    
                    {/* Left Side - Features */}
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
                                    Business Intelligence
                                </span>
                                <Sparkles className="h-4 w-4 text-indigo-500" />
                            </div>
                            
                            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                                Visualize Your
                                <span className="block text-indigo-600">Business Network</span>
                            </h2>
                            
                            <p className="text-lg text-slate-600 leading-relaxed">
                                Advanced geospatial mapping, route optimization, and market intelligence 
                                for thousands of business records. Built for teams who need powerful insights.
                            </p>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-sm">
                                <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
                                    <MapPin className="h-4 w-4 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Interactive Maps</h3>
                                <p className="text-xs text-slate-600">High-performance clustering for 3000+ businesses</p>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-sm">
                                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Market Intelligence</h3>
                                <p className="text-xs text-slate-600">Provider analysis and industry insights</p>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-sm">
                                <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                                    <Route className="h-4 w-4 text-orange-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Route Planning</h3>
                                <p className="text-xs text-slate-600">Optimize visits and track progress</p>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-sm">
                                <div className="h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                                    <Users className="h-4 w-4 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Team Collaboration</h3>
                                <p className="text-xs text-slate-600">Multi-user workspace with role management</p>
                            </div>
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex items-center gap-6 pt-4">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-600">Secure & Private</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-indigo-600" />
                                <span className="text-xs font-bold text-slate-600">High Performance</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-purple-600" />
                                <span className="text-xs font-bold text-slate-600">Real-time Insights</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="flex justify-center lg:justify-end">
                        <div className="w-full max-w-md">
                            <div className="glass-card rounded-[3rem] shadow-2xl shadow-indigo-500/10 border-white/60 overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
                                
                                <div className="p-8 lg:p-10">
                                    <div className="text-center mb-8">
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                                                Secure Access
                                            </span>
                                            <Sparkles className="h-3 w-3 text-indigo-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">
                                            Welcome Back
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            Sign in to access your business intelligence dashboard
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                Username
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 transition-all"
                                                    placeholder="Enter your username"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 transition-all"
                                                    placeholder="Enter your password"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 mt-6"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <LogIn className="h-4 w-4" />
                                                    Access Dashboard
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <div className="mt-6 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Secure • Encrypted • Private
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="p-6 text-center">
                <p className="text-xs text-slate-400">
                    © 2026 SwitchRadar. Advanced Business Intelligence Platform.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;