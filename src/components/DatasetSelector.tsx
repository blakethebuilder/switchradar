import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, Loader2, MapPin, Users, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { environmentConfig } from '../config/environment';

interface Dataset {
  id: number;
  name: string;
  town?: string;
  businessCount?: number;
  createdAt?: string;
}

interface DatasetSelectorProps {
  onDatasetSelected: (datasetIds: number[]) => void;
  onImportClick: () => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  onDatasetSelected,
  onImportClick
}) => {
  const { token } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, [token]);

  const fetchDatasets = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 DATASETS: Fetched datasets:', data);
        setDatasets(data);
        
        // Auto-select all datasets by default
        const allIds = data.map((d: Dataset) => d.id);
        setSelectedDatasets(allIds);
      } else {
        setError('Failed to load datasets');
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
      setError('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetToggle = (datasetId: number) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId) 
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    );
  };

  const handleSelectAll = () => {
    setSelectedDatasets(datasets.map(d => d.id));
  };

  const handleSelectNone = () => {
    setSelectedDatasets([]);
  };

  const handleContinue = () => {
    onDatasetSelected(selectedDatasets);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 lg:py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading available datasets...</p>
        </div>
      </div>
    );
  }

  if (error || datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="relative mx-auto mb-10 h-24 w-24">
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-2xl shadow-indigo-200">
              <Database className="h-10 w-10 text-white" />
            </div>
          </div>

          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
            No Data Available
          </h2>

          <p className="mx-auto mb-12 max-w-lg text-lg font-medium text-slate-500 leading-relaxed">
            {error || 'No datasets found. Import your first dataset to get started with business intelligence.'}
          </p>

          <button
            onClick={onImportClick}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-indigo-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95"
          >
            <Database className="h-6 w-6 transition-transform group-hover:scale-110" />
            IMPORT FIRST DATASET
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-24">
      <div className="mx-auto max-w-4xl w-full px-6">
        <div className="text-center mb-12">
          <div className="relative mx-auto mb-10 h-24 w-24">
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-2xl shadow-indigo-200">
              <Database className="h-10 w-10 text-white" />
            </div>
          </div>

          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
            Select Your <span className="text-indigo-600">Datasets</span>
          </h2>

          <p className="mx-auto mb-8 max-w-lg text-lg font-medium text-slate-500 leading-relaxed">
            Choose which datasets you want to work with. You can change this selection anytime in the workspace filters.
          </p>

          {/* Dataset Selection Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold hover:bg-indigo-200 transition-all"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-all"
            >
              Select None
            </button>
            <div className="text-sm text-slate-500">
              {selectedDatasets.length} of {datasets.length} selected
            </div>
          </div>
        </div>

        {/* Dataset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {datasets.map((dataset) => {
            const isSelected = selectedDatasets.includes(dataset.id);
            
            return (
              <button
                key={dataset.id}
                onClick={() => handleDatasetToggle(dataset.id)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-indigo-200 bg-indigo-50 shadow-lg shadow-indigo-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Selection Indicator */}
                <div className={`absolute top-4 right-4 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-slate-300'
                }`}>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>

                {/* Dataset Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-100' : 'bg-slate-100'
                    }`}>
                      <Database className={`h-4 w-4 ${
                        isSelected ? 'text-indigo-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm truncate ${
                        isSelected ? 'text-indigo-900' : 'text-slate-900'
                      }`}>
                        {dataset.name}
                      </h3>
                    </div>
                  </div>

                  {dataset.town && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="h-3 w-3" />
                      <span>{dataset.town}</span>
                    </div>
                  )}

                  {dataset.businessCount && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Users className="h-3 w-3" />
                      <span>{dataset.businessCount.toLocaleString()} businesses</span>
                    </div>
                  )}

                  {dataset.createdAt && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleContinue}
            disabled={selectedDatasets.length === 0}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-indigo-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MapPin className="h-6 w-6 transition-transform group-hover:scale-110" />
            CONTINUE TO WORKSPACE
          </button>

          <button
            onClick={onImportClick}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-slate-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-slate-200 transition-all hover:bg-slate-700 active:scale-95"
          >
            <Database className="h-6 w-6 transition-transform group-hover:scale-110" />
            IMPORT NEW DATASET
          </button>
        </div>
      </div>
    </div>
  );
};