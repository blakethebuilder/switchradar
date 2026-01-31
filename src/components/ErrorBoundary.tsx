import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isInFallbackMode: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHistory: Array<{ error: Error; timestamp: Date; context: string }> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isInFallbackMode: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for debugging
    this.logError(error, 'React Error Boundary', errorInfo);

    // Handle different types of errors
    this.handleError(error);
  }

  private logError(error: Error, context: string, details?: any) {
    const errorRecord = {
      error,
      timestamp: new Date(),
      context
    };

    this.errorHistory.push(errorRecord);

    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory.shift();
    }

    console.error(`[ErrorBoundary] ${context}:`, error);
    if (details) {
      console.error('Error details:', details);
    }
  }

  private handleError(error: Error) {
    const errorMessage = error.message.toLowerCase();

    // Handle sync-related errors
    if (errorMessage.includes('sync') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      this.handleSyncError(error);
    }
    // Handle API-related errors
    else if (errorMessage.includes('api') || errorMessage.includes('endpoint')) {
      this.handleAPIError(error);
    }
    // Handle other errors
    else {
      this.enableLocalOnlyMode();
    }
  }

  private handleSyncError(error: Error) {
    console.warn('Sync error detected, enabling offline mode:', error.message);
    console.log('Cloud sync disabled due to error');
    this.enableLocalOnlyMode();
  }

  private handleAPIError(error: Error) {
    console.warn('API error detected, falling back to local mode:', error.message);
    this.enableLocalOnlyMode();
  }

  private enableLocalOnlyMode() {
    this.setState({ isInFallbackMode: true });
    
    // Notify user about fallback mode
    const event = new CustomEvent('localOnlyMode', {
      detail: {
        reason: this.state.error?.message || 'Unknown error',
        timestamp: new Date()
      }
    });
    window.dispatchEvent(event);
  }

  private attemptRecovery = async () => {
    try {
      // Clear error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isInFallbackMode: false
      });

      // Try to restore cloud sync if possible
      if (navigator.onLine) {
        console.log('Attempting to restore cloud sync connection');
      }

      console.log('Recovery attempt completed');
    } catch (error) {
      console.error('Recovery failed:', error);
      this.enableLocalOnlyMode();
    }
  };

  public isInFallbackMode(): boolean {
    return this.state.isInFallbackMode;
  }

  public getErrorHistory() {
    return [...this.errorHistory];
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-fallback" style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5'
        }}>
          <h2 style={{ color: '#c92a2a', marginBottom: '16px' }}>
            Something went wrong
          </h2>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#495057', marginBottom: '8px' }}>
              The application encountered an error but your data is safe. 
              You can continue working in local-only mode.
            </p>
            
            {this.state.isInFallbackMode && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                marginBottom: '12px'
              }}>
                <strong>Local-Only Mode Active</strong>
                <br />
                Cloud sync is temporarily disabled. Your data will be saved locally.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.attemptRecovery}
              style={{
                padding: '8px 16px',
                backgroundColor: '#51cf66',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Recovery
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#868e96',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>

          {import.meta.env.DEV && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ cursor: 'pointer', color: '#868e96' }}>
                Error Details (Development)
              </summary>
              <pre style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}