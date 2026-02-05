export interface EnvironmentConfig {
  apiUrl: string;
  isDevelopment: boolean;
  enableCloudSync: boolean;
  syncIntervalMs: number;
  maxRetryAttempts: number;
  fallbackToLocal: boolean;
}

class EnvironmentConfigManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): EnvironmentConfig {
    // Check if we're in production by looking at the hostname
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.startsWith('192.168.') &&
                         !window.location.hostname.startsWith('10.') &&
                         !window.location.hostname.endsWith('.local');
    
    // In production, use relative paths (Nginx will proxy)
    // In development or local network access, use localhost:5001 as default
    const apiUrl = import.meta.env.VITE_API_URL || 
                   (isProduction ? '' : `http://${window.location.hostname}:5001`);
    
    console.log('🔧 Environment config debug:', {
      hostname: window.location.hostname,
      href: window.location.href,
      isProduction,
      isDev: import.meta.env.DEV,
      apiUrl,
      envApiUrl: import.meta.env.VITE_API_URL,
      allEnvVars: import.meta.env
    });
    
    return {
      apiUrl,
      isDevelopment: import.meta.env.DEV || false,
      enableCloudSync: true,
      syncIntervalMs: 30000, // 30 seconds
      maxRetryAttempts: 3,
      fallbackToLocal: true
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Only require API URL in development - production uses relative paths
    if (this.config.isDevelopment && !this.config.apiUrl) {
      errors.push('VITE_API_URL is required for development');
    }

    if (this.config.syncIntervalMs < 1000) {
      errors.push('Sync interval must be at least 1000ms');
    }

    if (this.config.maxRetryAttempts < 1) {
      errors.push('Max retry attempts must be at least 1');
    }

    if (errors.length > 0) {
      console.warn('Environment configuration warnings:', errors);
      // Only throw in development for critical errors
      if (this.config.isDevelopment && errors.some(e => e.includes('required'))) {
        throw new Error(`Environment configuration errors: ${errors.join(', ')}`);
      }
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public isCloudSyncEnabled(): boolean {
    // Always enable cloud sync - production uses relative paths, development uses full URLs
    return true;
  }

  public getApiUrl(): string {
    return this.config.apiUrl;
  }

  public validateStartup(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Only validate API URL in development
    if (this.config.isDevelopment && !this.config.apiUrl) {
      errors.push('API URL not configured for development');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const environmentConfig = new EnvironmentConfigManager();