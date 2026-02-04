import type { Business, RouteItem } from '../types';
import { environmentConfig } from '../config/environment';

export interface ServerDataResult {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

class ServerDataService {
  private getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private getApiUrl(endpoint: string): string {
    const apiUrl = environmentConfig.getApiUrl();
    return apiUrl ? `${apiUrl}${endpoint}` : endpoint;
  }

  private handleAuthError(response: Response): void {
    if (response.status === 401) {
      console.warn('🔐 Authentication failed - token may be invalid. Clearing stored credentials.');
      
      // Show a user-friendly message
      const message = 'Your session has expired. Please logout and login again to continue.';
      
      // Try to show a toast notification if available, otherwise use alert
      if (window.confirm(`${message}\n\nClick OK to logout now, or Cancel to logout manually.`)) {
        // Clear invalid tokens from localStorage
        localStorage.removeItem('sr_token');
        localStorage.removeItem('sr_user');
        // Reload the page to force re-authentication
        window.location.reload();
      }
    }
  }

  private async makeRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Attempt ${attempt}/${retries} - ${options.method || 'GET'} ${url}`);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`📥 Response: ${response.status} ${response.statusText}`);
        
        // Handle authentication errors
        this.handleAuthError(response);
        
        return response;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  // Business Operations
  async getBusinesses(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(this.getApiUrl('/api/businesses'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const businesses = result.data || result; // Handle both paginated and direct responses

      return {
        success: true,
        data: businesses,
        count: businesses.length
      };
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch businesses'
      };
    }
  }

  async saveBusinesses(businesses: Business[], token: string, metadata?: { source?: string; town?: string }): Promise<ServerDataResult> {
    console.log('🚀 API: saveBusinesses called');
    console.log('📊 API: Business count:', businesses.length);
    console.log('🔐 API: Token present:', !!token, 'length:', token?.length);
    console.log('🌐 API: API URL:', this.getApiUrl('/api/businesses/sync'));
    console.log('📊 API: Metadata:', metadata);
    console.log('📊 API: First business sample:', businesses[0] ? {
      id: businesses[0].id,
      name: businesses[0].name,
      hasCoordinates: !!businesses[0].coordinates
    } : null);

    // If dataset is large (>800 businesses), use chunked upload
    if (businesses.length > 800) {
      console.log('📦 API: Large dataset detected, using chunked upload...');
      return this.saveBusinessesChunked(businesses, token, 1000, metadata); // Increased chunk size
    }

    try {
      const headers = this.getAuthHeaders(token);
      console.log('📤 API: Request headers prepared');

      const requestBody = { 
        businesses,
        ...metadata // Include source and town metadata
      };
      const bodySize = JSON.stringify(requestBody).length;
      console.log('📦 API: Request body size:', bodySize, 'characters', (bodySize / 1024 / 1024).toFixed(2), 'MB');

      console.log('🌐 API: Making fetch request...');
      
      const response = await this.makeRequest(this.getApiUrl('/api/businesses/sync'), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      console.log('📥 API: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API: Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ API: Response result:', result);
      
      return {
        success: true,
        data: result,
        count: businesses.length
      };
    } catch (error) {
      console.error('💥 API: saveBusinesses error:', error);
      console.error('API Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save businesses'
      };
    }
  }

  private async saveBusinessesChunked(businesses: Business[], token: string, chunkSize: number = 500, metadata?: { source?: string; town?: string }): Promise<ServerDataResult> {
    console.log(`🔄 Starting chunked upload: ${businesses.length} businesses in chunks of ${chunkSize}`);
    
    const chunks = [];
    for (let i = 0; i < businesses.length; i += chunkSize) {
      chunks.push(businesses.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Created ${chunks.length} chunks`);
    
    try {
      // Clear existing data first
      console.log('🗑️ Clearing existing server data...');
      const clearResult = await this.clearWorkspace(token);
      if (!clearResult.success) {
        console.warn('⚠️ Failed to clear workspace, continuing anyway:', clearResult.error);
      }
      
      let totalSuccess = 0;
      let totalErrors = 0;
      const allErrors: any[] = [];
      
      // Upload chunks sequentially to avoid overwhelming the server
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`📤 Uploading chunk ${i + 1}/${chunks.length} (${chunk.length} businesses)...`);
        
        try {
          const response = await this.makeRequest(this.getApiUrl('/api/businesses/sync'), {
            method: 'POST',
            headers: this.getAuthHeaders(token),
            body: JSON.stringify({ 
              businesses: chunk,
              isChunked: true,
              chunkIndex: i,
              totalChunks: chunks.length,
              clearFirst: false, // We already cleared above
              ...metadata // Include source and town metadata
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chunk ${i + 1} failed: HTTP ${response.status}: ${errorText}`);
          }
          
          const result = await response.json();
          totalSuccess += result.successCount || chunk.length;
          totalErrors += result.errorCount || 0;
          if (result.errors) {
            allErrors.push(...result.errors);
          }
          
          console.log(`✅ Chunk ${i + 1}/${chunks.length} completed: ${result.successCount || chunk.length} success, ${result.errorCount || 0} errors`);
          
          // Small delay between chunks to be nice to the server
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`❌ Chunk ${i + 1} failed:`, error);
          totalErrors += chunk.length;
          allErrors.push({
            chunk: i + 1,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log(`🎉 Chunked upload completed: ${totalSuccess} success, ${totalErrors} errors`);
      
      return {
        success: totalErrors < businesses.length, // Success if at least some businesses were uploaded
        data: {
          message: 'Chunked upload completed',
          totalReceived: businesses.length,
          successCount: totalSuccess,
          errorCount: totalErrors,
          errors: allErrors,
          chunksProcessed: chunks.length
        },
        count: totalSuccess
      };
      
    } catch (error) {
      console.error('💥 Chunked upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chunked upload failed'
      };
    }
  }

  async addBusiness(business: Business, token: string): Promise<ServerDataResult> {
    // For single business, we'll get all businesses, add the new one, and save all
    const currentResult = await this.getBusinesses(token);
    if (!currentResult.success) {
      return currentResult;
    }

    const businesses = currentResult.data || [];
    businesses.push(business);
    
    return this.saveBusinesses(businesses, token);
  }

  async updateBusiness(businessId: string, updates: Partial<Business>, token: string): Promise<ServerDataResult> {
    const currentResult = await this.getBusinesses(token);
    if (!currentResult.success) {
      return currentResult;
    }

    const businesses = currentResult.data || [];
    const businessIndex = businesses.findIndex((b: Business) => b.id === businessId);
    
    if (businessIndex === -1) {
      return {
        success: false,
        error: 'Business not found'
      };
    }

    businesses[businessIndex] = { ...businesses[businessIndex], ...updates };
    
    return this.saveBusinesses(businesses, token);
  }

  async deleteBusiness(businessId: string, token: string): Promise<ServerDataResult> {
    const currentResult = await this.getBusinesses(token);
    if (!currentResult.success) {
      return currentResult;
    }

    const businesses = currentResult.data || [];
    const filteredBusinesses = businesses.filter((b: Business) => b.id !== businessId);
    
    return this.saveBusinesses(filteredBusinesses, token);
  }

  // Route Operations
  async getRoutes(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/route'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const routes = await response.json();

      return {
        success: true,
        data: routes,
        count: routes.length
      };
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes'
      };
    }
  }

  async saveRoutes(routeItems: RouteItem[], token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/route/sync'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ routeItems })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        count: routeItems.length
      };
    } catch (error) {
      console.error('Failed to save routes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save routes'
      };
    }
  }

  // Bulk Operations
  async bulkDelete(businessIds: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/businesses/bulk'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ 
          action: 'delete', 
          businessIds 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        count: businessIds.length
      };
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk delete'
      };
    }
  }

  async bulkUpdate(businessIds: string[], updates: Partial<Business>, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/businesses/bulk'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ 
          action: 'update', 
          businessIds,
          updates 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        count: businessIds.length
      };
    } catch (error) {
      console.error('Failed to bulk update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update'
      };
    }
  }

  // Clear all data
  async clearWorkspace(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/workspace'), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear workspace'
      };
    }
  }

  // Connection test with detailed diagnostics
  async testConnection(): Promise<boolean> {
    try {
      const apiUrl = this.getApiUrl('/api/auth/ping');
      console.log('🔍 Testing connection to:', apiUrl);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const isConnected = response.ok;
      console.log(`🌐 Connection test result: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
      
      if (isConnected) {
        const data = await response.json();
        console.log('📡 Server response:', data);
      }
      
      return isConnected;
    } catch (error) {
      console.error('🚨 Connection test failed:', error);
      return false;
    }
  }

  // Health check with detailed info
  async healthCheck(): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/health'), {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const health = await response.json();
      return {
        success: true,
        data: health
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  // Get server statistics for current user's workspace
  async getStats(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/stats'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stats = await response.json();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      };
    }
  }

  // Admin-only: Get all workspaces overview
  async getWorkspaces(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/workspaces'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const workspaces = await response.json();

      return {
        success: true,
        data: workspaces
      };
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces'
      };
    }
  }

  // User Management (Admin only)
  async getUsers(token: string): Promise<ServerDataResult> {
    try {
      console.log('🌐 Fetching users from:', this.getApiUrl('/api/users'));
      const response = await fetch(this.getApiUrl('/api/users'), {
        headers: this.getAuthHeaders(token)
      });

      console.log('📥 Users response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Users response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const users = await response.json();
      console.log('📊 Users response data:', users);

      return {
        success: true,
        data: users.data || users, // Handle both formats
        count: (users.data || users).length
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  }

  async createUser(username: string, password: string, token: string): Promise<ServerDataResult> {
    try {
      console.log('🚀 Creating user:', username, 'at:', this.getApiUrl('/api/users'));
      const response = await fetch(this.getApiUrl('/api/users'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ username, password })
      });

      console.log('📥 Create user response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Create user error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Create user success:', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async deleteUser(userId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/users/${userId}`), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to delete user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      };
    }
  }

  async getUserBusinesses(userId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/users/${userId}/businesses`), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const businesses = await response.json();

      return {
        success: true,
        data: businesses,
        count: businesses.length
      };
    } catch (error) {
      console.error('Failed to fetch user businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user businesses'
      };
    }
  }

  async deleteUserBusiness(userId: number, businessId: string, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/users/${userId}/businesses/${businessId}`), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to delete user business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user business'
      };
    }
  }

  async clearUserBusinesses(userId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/users/${userId}/businesses`), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to clear user businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear user businesses'
      };
    }
  }
}

export const serverDataService = new ServerDataService();