import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  submessage?: string;
  className?: string;
  inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  submessage,
  className = '',
  inline = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const containerClasses = inline 
    ? 'inline-flex items-center gap-2'
    : 'flex items-center justify-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      {inline ? (
        <>
          <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
          {message && <span className="text-slate-600">{message}</span>}
        </>
      ) : (
        <div className="text-center">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600 mx-auto mb-4`} />
          {message && (
            <p className="text-slate-600 font-medium mb-2">{message}</p>
          )}
          {submessage && (
            <p className="text-slate-500 text-sm">{submessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

interface FullPageLoadingProps {
  message?: string;
  submessage?: string;
  progress?: string;
  showProgress?: boolean;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = 'Loading...',
  submessage,
  progress,
  showProgress = false
}) => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-auto px-6">
        <LoadingSpinner size="xl" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{message}</h3>
        {submessage && (
          <p className="text-slate-600 mb-4">{submessage}</p>
        )}
        {showProgress && progress && (
          <div className="mt-4">
            <div className="bg-slate-200 rounded-full h-2 mb-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: progress.includes('%') 
                    ? progress 
                    : '0%' 
                }}
              />
            </div>
            <p className="text-sm text-slate-500">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface DataLoadingProps {
  type: 'businesses' | 'datasets' | 'users' | 'routes' | 'map' | 'general';
  count?: number;
  isLargeDataset?: boolean;
  progress?: string;
}

export const DataLoading: React.FC<DataLoadingProps> = ({
  type,
  count,
  isLargeDataset = false,
  progress
}) => {
  const getLoadingMessage = () => {
    switch (type) {
      case 'businesses':
        if (isLargeDataset && count) {
          return `Processing ${count.toLocaleString()} businesses...`;
        }
        return 'Loading businesses...';
      case 'datasets':
        return 'Loading available datasets...';
      case 'users':
        return 'Loading users...';
      case 'routes':
        return 'Loading routes...';
      case 'map':
        return 'Loading map...';
      default:
        return 'Loading...';
    }
  };

  const getSubmessage = () => {
    if (isLargeDataset) {
      return 'Large dataset detected - optimizing performance';
    }
    if (type === 'businesses' && count && count > 1000) {
      return `${count.toLocaleString()} records found`;
    }
    return undefined;
  };

  return (
    <FullPageLoading
      message={getLoadingMessage()}
      submessage={getSubmessage()}
      progress={progress}
      showProgress={!!progress}
    />
  );
};

interface ImportLoadingProps {
  progress?: string;
  stage?: 'processing' | 'uploading' | 'validating' | 'completing';
}

export const ImportLoading: React.FC<ImportLoadingProps> = ({
  progress,
  stage = 'processing'
}) => {
  const getStageMessage = () => {
    switch (stage) {
      case 'processing':
        return 'Processing import file...';
      case 'uploading':
        return 'Uploading data...';
      case 'validating':
        return 'Validating data...';
      case 'completing':
        return 'Finalizing import...';
      default:
        return 'Processing import...';
    }
  };

  return (
    <FullPageLoading
      message={getStageMessage()}
      submessage="Please wait while we process your data"
      progress={progress}
      showProgress={!!progress}
    />
  );
};

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  loadingText,
  size = 'sm',
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <LoadingSpinner size={size} inline />
        {loadingText && <span>{loadingText}</span>}
      </div>
    );
  }

  return <>{children}</>;
};

// Skeleton loaders for better UX
export const BusinessCardSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-slate-200 rounded-lg p-4 space-y-3">
      <div className="h-4 bg-slate-300 rounded w-3/4"></div>
      <div className="h-3 bg-slate-300 rounded w-1/2"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-slate-300 rounded w-16"></div>
        <div className="h-6 bg-slate-300 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
  </tr>
);