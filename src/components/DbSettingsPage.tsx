import React from 'react';
import type { Business } from '../types';

interface DbSettingsPageProps {
  businesses: Business[];
  onClose: () => void;
}

export const DbSettingsPage: React.FC<DbSettingsPageProps> = ({ businesses, onClose }) => {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Database Settings</h1>
        <button onClick={onClose} className="text-sm font-bold">Close</button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-2">Businesses Table</h2>
        <pre className="text-xs overflow-auto bg-slate-100 p-4 rounded">
          {JSON.stringify(businesses, null, 2)}
        </pre>
      </div>
    </div>
  );
};
