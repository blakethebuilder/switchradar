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
    // In production, if no VITE_API_URL is set, use relative paths (Nginx will proxy)
    // In development, default to localhost:5001
    const apiUrl = import.meta.env.VITE_API_URL || 
                   (import.meta.env.DEV ? 'http://localhost:5001' : '');
    
    return {
      apiUrl,
      isDevelopment: import.meta.env.DEV || false,
      enableCloudSync: true, // Always enable - will work with relative URLs in production
      syncIntervalMs: 30000, // 30 seconds
      maxRetryAttempts: 3,
      fallbackToLocal: true
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.config.apiUrl && !this.config.isDevelopment) {
      errors.push('VITE_API_URL is required for production builds');
    }

    if (this.config.syncIntervalMs < 1000) {
      errors.push('Sync interval must be at least 1000ms');
    }

    if (this.config.maxRetryAttempts < 1) {
      errors.push('Max retry attempts must be at least 1');
    }

    if (errors.length > 0) {
      console.warn('Environment configuration warnings:', errors);
      // Don't throw in production - gracefully degrade
      if (this.config.isDevelopment) {
        throw new Error(`Environment configuration errors: ${errors.join(', ')}`);
      }
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public isCloudSyncEnabled(): boolean {
    // In production with empty apiUrl, we use relative paths which work with Nginx proxy
    return this.config.isDevelopment ? !!this.config.apiUrl : true;
  }

  public getApiUrl(): string {
    return this.config.apiUrl;
  }

  public validateStartup(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.apiUrl) {
      errors.push('API URL not configured');
    }

    if (!this.config.isDevelopment && !this.config.apiUrl) {
      errors.push('Production build requires VITE_API_URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const environmentConfig = new EnvironmentConfigManager();