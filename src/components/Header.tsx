import { Table, Map, Download, Upload, Settings } from 'lucide-react';

interface HeaderProps {
  viewMode: 'table' | 'map';
  onViewModeChange: (mode: 'table' | 'map') => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onSettingsClick: () => void;
  businessCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  onImportClick,
  onExportClick,
  onSettingsClick,
  businessCount
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SwitchRadar</h1>
            <p className="text-sm text-gray-500">Scraped Lead Management</p>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onViewModeChange('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => onViewModeChange('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Map className="w-4 h-4" />
              Map
            </button>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-md">
            {businessCount} businesses
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onImportClick}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            
            <button
              onClick={onExportClick}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              disabled={businessCount === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            <button
              onClick={onSettingsClick}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
