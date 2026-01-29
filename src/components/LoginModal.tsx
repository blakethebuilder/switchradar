import React, { useState } from 'react';
import { X, Lock, User, Loader2, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { environmentConfig } from '../config/environment';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const { login } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const apiUrl = environmentConfig.getApiUrl();

        // In production, use relative paths if no API URL is configured
        const fullUrl = apiUrl ? `${apiUrl}${endpoint}` : endpoint;

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

            if (isRegister) {
                setIsRegister(false);
                setError('Account created! Please login.');
            } else {
                login(data.token, { id: data.userId, username: data.username });
                onLoginSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-md glass-card rounded-[3rem] shadow-2xl shadow-indigo-500/10 border-white/60 overflow-hidden animate-in zoom-in-95 fade-in duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />

                <div className="p-10">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Cloud Sync</span>
                                <Sparkles className="h-3 w-3 text-indigo-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 leading-none">
                                {isRegister ? 'Create Account' : 'Welcome Back'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Your username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 mt-4"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    {isRegister ? 'Register' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                        >
                            {isRegister ? 'Already have an account? Login' : 'Need an account? Sign up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
