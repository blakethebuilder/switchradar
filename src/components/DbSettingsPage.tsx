import React from 'react';
import { Database, HardDrive, ShieldCheck, Trash2, X, CheckCircle2, Cloud } from 'lucide-react';
import type { Business } from '../types';

interface DbSettingsPageProps {
  businesses: Business[];
  onClose: () => void;
}

export const DbSettingsPage: React.FC<DbSettingsPageProps> = ({ businesses, onClose }) => {
  const totalBusinesses = businesses.length;
  const providers = new Set(businesses.map(b => b.provider)).size;
  const towns = new Set(businesses.map(b => b.town)).size;
  const categories = new Set(businesses.map(b => b.category)).size;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Local Database Manager</h1>
            <p className="text-sm font-medium text-slate-400">Manage your active datasets and workspace</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Dataset Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cloud className="h-32 w-32 text-indigo-600" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Active Workspace Data</h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-4xl font-black text-slate-900 mb-1">{totalBusinesses.toLocaleString()}</div>
                <div className="text-sm font-bold text-slate-400">Total Businesses Available</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-2xl font-black text-indigo-600 mb-1">{providers}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Providers</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-2xl font-black text-indigo-600 mb-1">{towns}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Towns</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-2xl font-black text-indigo-600 mb-1">{categories}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Categories</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600">This dataset is currently loaded in your workspace.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions / Control Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Data Controls</h3>
            
            <div className="space-y-3">
              <button 
                disabled
                className="w-full flex items-center justify-between p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-bold">Dataset Loaded</span>
                </div>
                <span className="text-xs font-black uppercase tracking-wider bg-white/50 px-2 py-1 rounded-md">Active</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-indigo-600 transition-all group">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5" />
                  <span className="font-bold group-hover:text-slate-900 transition-colors">Create New Backup</span>
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:border-rose-100 hover:text-rose-600 transition-all group">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5" />
                  <span className="font-bold group-hover:text-slate-900 transition-colors">Clear Workspace</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-6 w-6 text-slate-200" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-200">Local Security</span>
            </div>
            <div className="text-lg font-bold mb-4">Your data is stored locally and securely in your browser.</div>
            <div className="text-xs font-medium text-slate-100 opacity-80">
              Storage Mode: Offline / Private
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
