import type { Business, RouteItem } from '../types';
import { environmentConfig } from '../config/environment';
import { cacheService } from './cacheService';

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
  async getBusinesses(token: string, forceRefresh = false): Promise<ServerDataResult> {
    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedBusinesses = cacheService.getBusinesses();
        if (cachedBusinesses) {
          console.log('📦 CACHE: Using cached businesses', cachedBusinesses.length);
          return {
            success: true,
            data: cachedBusinesses,
            count: cachedBusinesses.length
          };
        }
      }

      console.log('🌐 API: Fetching businesses from server');
      
      // Add timeout and better error handling for large responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for large datasets
      
      const response = await fetch(this.getApiUrl('/api/businesses'), {
        headers: this.getAuthHeaders(token),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}. Expected JSON.`);
      }

      // Get response as text first to handle potential JSON parsing issues
      const responseText = await response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }

      // Check if response is truncated (common signs)
      if (responseText.endsWith('...') || !responseText.trim().endsWith('}') && !responseText.trim().endsWith(']')) {
        console.warn('⚠️ API: Response appears to be truncated, attempting recovery');
        
        // Try to parse partial JSON and recover what we can
        try {
          const partialData = this.attemptPartialJsonRecovery(responseText);
          if (partialData && Array.isArray(partialData) && partialData.length > 0) {
            console.log('🔧 API: Recovered partial data:', partialData.length, 'businesses');
            cacheService.setBusinesses(partialData);
            return {
              success: true,
              data: partialData,
              count: partialData.length
            };
          }
        } catch (recoveryError) {
          console.error('❌ API: Failed to recover partial data:', recoveryError);
        }
        
        throw new Error('Response truncated and recovery failed');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ API: JSON parsing failed:', jsonError);
        console.error('Response length:', responseText.length);
        console.error('Response preview:', responseText.substring(0, 500));
        console.error('Response ending:', responseText.substring(Math.max(0, responseText.length - 500)));
        
        // Try to recover partial JSON
        const partialData = this.attemptPartialJsonRecovery(responseText);
        if (partialData && Array.isArray(partialData) && partialData.length > 0) {
          console.log('🔧 API: Recovered partial data after JSON error:', partialData.length, 'businesses');
          cacheService.setBusinesses(partialData);
          return {
            success: true,
            data: partialData,
            count: partialData.length
          };
        }
        
        throw new Error(`JSON parsing failed: ${(jsonError as Error).message}`);
      }

      const businesses = result.data || result; // Handle both paginated and direct responses

      if (!Array.isArray(businesses)) {
        throw new Error('Invalid response format: expected array of businesses');
      }

      // Cache the result
      cacheService.setBusinesses(businesses);
      console.log('💾 CACHE: Cached businesses', businesses.length);

      return {
        success: true,
        data: businesses,
        count: businesses.length
      };
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      
      // Try to return cached data as fallback if available
      const cachedBusinesses = cacheService.getBusinesses();
      if (cachedBusinesses) {
        console.log('📦 CACHE: Using stale cache as fallback', cachedBusinesses.length);
        return {
          success: true,
          data: cachedBusinesses,
          count: cachedBusinesses.length
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch businesses'
      };
    }
  }

  // Attempt to recover partial JSON data
  private attemptPartialJsonRecovery(responseText: string): any[] | null {
    try {
      // Try to find the last complete business object
      const lastCompleteObjectIndex = responseText.lastIndexOf('},{');
      if (lastCompleteObjectIndex === -1) {
        return null;
      }

      // Try to construct valid JSON by finding the array start and truncating at last complete object
      let arrayStart = responseText.indexOf('[');
      if (arrayStart === -1) {
        // Maybe it's wrapped in an object
        const dataStart = responseText.indexOf('"data":[');
        if (dataStart !== -1) {
          arrayStart = responseText.indexOf('[', dataStart);
        }
      }

      if (arrayStart === -1) {
        return null;
      }

      // Construct potentially valid JSON
      const truncatedJson = responseText.substring(0, lastCompleteObjectIndex + 1) + '}]';
      
      // If it was wrapped in an object, close it properly
      const finalJson = responseText.includes('"data":[') 
        ? '{"data":' + truncatedJson + '}'
        : truncatedJson;

      const parsed = JSON.parse(finalJson);
      return parsed.data || parsed;
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return null;
    }
  }

  // Add a method to fetch businesses in chunks for very large datasets
  async getBusinessesChunked(token: string, chunkSize = 1000): Promise<ServerDataResult> {
    try {
      console.log('📦 API: Fetching businesses in chunks');
      let allBusinesses: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`📦 API: Fetching chunk ${page} (${chunkSize} per page)`);
        
        const response = await this.makeRequest(
          this.getApiUrl(`/api/businesses?page=${page}&limit=${chunkSize}`), 
          {
            headers: this.getAuthHeaders(token)
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const businesses = result.data || result.businesses || [];
        
        if (!Array.isArray(businesses) || businesses.length === 0) {
          hasMore = false;
        } else {
          allBusinesses = [...allBusinesses, ...businesses];
          hasMore = businesses.length === chunkSize; // If we got less than requested, we're done
          page++;
        }

        // Safety limit to prevent infinite loops
        if (page > 100) { // Increased from 50 to 100 for larger datasets
          console.warn('⚠️ API: Reached maximum page limit (100), stopping');
          break;
        }
      }

      console.log(`✅ API: Fetched ${allBusinesses.length} businesses in ${page - 1} chunks`);
      
      // Cache the result
      cacheService.setBusinesses(allBusinesses);

      return {
        success: true,
        data: allBusinesses,
        count: allBusinesses.length
      };
    } catch (error) {
      console.error('Failed to fetch businesses in chunks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch businesses in chunks'
      };
    }
  }

  async saveBusinesses(businesses: Business[], token: string, metadata?: any): Promise<ServerDataResult> {
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
      const result = await this.saveBusinessesChunked(businesses, token, 1000, metadata); // Increased chunk size
      
      // Invalidate cache after successful save
      if (result.success) {
        cacheService.invalidateRelated('businesses');
      }
      
      return result;
    }

    try {
      const headers = this.getAuthHeaders(token);
      console.log('📤 API: Request headers prepared');

      const requestBody = { 
        businesses,
        clearFirst: metadata?.clearFirst || false, // Default to NOT clearing existing data
        ...metadata // Include source and town metadata
      };
      const bodySize = JSON.stringify(requestBody).length;
      console.log('📦 API: Request body size:', bodySize, 'characters', (bodySize / 1024 / 1024).toFixed(2), 'MB');
      console.log('🔄 API: Clear existing data:', requestBody.clearFirst);

      const response = await this.makeRequest(
        this.getApiUrl('/api/businesses/sync'),
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ API: Businesses saved successfully');

      // Invalidate cache after successful save
      cacheService.invalidateRelated('businesses');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to save businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save businesses'
      };
    }
  }

  // Save businesses in chunks for large datasets
  async saveBusinessesChunked(businesses: Business[], token: string, chunkSize = 1000, metadata?: any): Promise<ServerDataResult> {
    try {
      console.log(`📦 API: Saving ${businesses.length} businesses in chunks of ${chunkSize}`);
      
      const chunks = [];
      for (let i = 0; i < businesses.length; i += chunkSize) {
        chunks.push(businesses.slice(i, i + chunkSize));
      }

      console.log(`📦 API: Created ${chunks.length} chunks`);

      // Clear existing data only on first chunk if requested
      let clearFirst = metadata?.clearFirst || false;

      for (let i = 0; i < chunks.length; i++) {
        console.log(`📦 API: Uploading chunk ${i + 1}/${chunks.length} (${chunks[i].length} businesses)`);
        
        const chunkMetadata = {
          ...metadata,
          clearFirst: clearFirst && i === 0, // Only clear on first chunk
          chunkIndex: i,
          totalChunks: chunks.length,
          isLastChunk: i === chunks.length - 1
        };

        const response = await this.makeRequest(
          this.getApiUrl('/api/businesses/sync'),
          {
            method: 'POST',
            headers: this.getAuthHeaders(token),
            body: JSON.stringify({
              businesses: chunks[i],
              ...chunkMetadata
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Don't clear on subsequent chunks
        clearFirst = false;
      }

      console.log(`✅ API: All ${chunks.length} chunks uploaded successfully`);

      // Invalidate cache after successful save
      cacheService.invalidateRelated('businesses');

      return {
        success: true,
        data: { message: `Successfully uploaded ${businesses.length} businesses in ${chunks.length} chunks` }
      };
    } catch (error) {
      console.error('Failed to save businesses in chunks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save businesses in chunks'
      };
    }
  }

  async addBusiness(business: Business, token: string): Promise<ServerDataResult> {
    try {
      const currentResult = await this.getBusinesses(token);
      if (!currentResult.success) {
        return currentResult;
      }

      const businesses = currentResult.data || [];
      businesses.push(business);

      return await this.saveBusinesses(businesses, token);
    } catch (error) {
      console.error('Failed to add business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add business'
      };
    }
  }

  async updateBusiness(businessId: string, updates: Partial<Business>, token: string): Promise<ServerDataResult> {
    try {
      console.log('🔄 API: Updating business:', businessId);
      
      const response = await this.makeRequest(
        this.getApiUrl(`/api/businesses/${businessId}`),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify(updates)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Invalidate cache after successful update
      cacheService.invalidateRelated('businesses');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to update business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business'
      };
    }
  }

  async updateBusinessFallback(businessId: string, updates: Partial<Business>, token: string): Promise<ServerDataResult> {
    try {
      const currentResult = await this.getBusinesses(token);
      if (!currentResult.success) {
        return currentResult;
      }

      const businesses = currentResult.data || [];
      const businessIndex = businesses.findIndex((b: Business) => b.id === businessId);
      
      if (businessIndex === -1) {
        throw new Error('Business not found');
      }

      businesses[businessIndex] = { ...businesses[businessIndex], ...updates };

      return await this.saveBusinesses(businesses, token);
    } catch (error) {
      console.error('Failed to update business (fallback):', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business'
      };
    }
  }

  async deleteBusiness(businessId: string, token: string): Promise<ServerDataResult> {
    try {
      const currentResult = await this.getBusinesses(token);
      if (!currentResult.success) {
        return currentResult;
      }

      const businesses = currentResult.data || [];
      const filteredBusinesses = businesses.filter((b: Business) => b.id !== businessId);

      return await this.saveBusinesses(filteredBusinesses, token);
    } catch (error) {
      console.error('Failed to delete business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete business'
      };
    }
  }

  // Route Operations
  async getRoutes(token: string, forceRefresh = false): Promise<ServerDataResult> {
    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedRoutes = cacheService.getRoutes();
        if (cachedRoutes) {
          return {
            success: true,
            data: cachedRoutes,
            count: cachedRoutes.length
          };
        }
      }

      const response = await this.makeRequest(
        this.getApiUrl('/api/routes'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const routes = result.data || result;

      // Cache the result
      cacheService.setRoutes(routes);

      return {
        success: true,
        data: routes,
        count: routes.length
      };
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      
      // Try to return cached data as fallback
      const cachedRoutes = cacheService.getRoutes();
      if (cachedRoutes) {
        return {
          success: true,
          data: cachedRoutes,
          count: cachedRoutes ? cachedRoutes.length : 0
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes'
      };
    }
  }

  async saveRoutes(routeItems: RouteItem[], token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/routes'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ routeItems })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Invalidate cache after successful save
      cacheService.invalidateRelated('routes');

      return {
        success: true,
        data: result
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
      const response = await this.makeRequest(
        this.getApiUrl('/api/businesses/bulk-delete'),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ businessIds })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Invalidate cache after successful delete
      cacheService.invalidateRelated('businesses');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to bulk delete businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk delete businesses'
      };
    }
  }

  async bulkUpdate(businessIds: string[], updates: Partial<Business>, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/businesses/bulk-update'),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ 
            businessIds,
            updates 
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Invalidate cache after successful update
      cacheService.invalidateRelated('businesses');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to bulk update businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update businesses'
      };
    }
  }

  // Workspace Operations
  async clearWorkspace(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/workspace/clear'),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Clear all caches after workspace clear
      cacheService.clearAll();

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

  async removeDuplicates(token: string, dryRun = false): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/businesses/remove-duplicates?dryRun=${dryRun}`),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ dryRun })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Invalidate cache after successful operation (if not dry run)
      if (!dryRun) {
        cacheService.invalidateRelated('businesses');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to remove duplicates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove duplicates'
      };
    }
  }

  // Connection and Health
  async testConnection(): Promise<boolean> {
    try {
      const apiUrl = environmentConfig.getApiUrl();
      console.log('🔗 Testing connection to:', apiUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/api/health`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const isConnected = response.ok;
      console.log('🔗 Connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async healthCheck(): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/health'),
        {}
      );

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

  // Statistics
  async getStats(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/stats'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

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

  async getWorkspaces(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/workspaces'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

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

  // User Management
  async getUsers(token: string): Promise<ServerDataResult> {
    try {
      console.log('👥 API: Fetching users');
      const response = await this.makeRequest(
        this.getApiUrl('/api/users'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const users = await response.json();

      return {
        success: true,
        data: users
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
      console.log('👤 API: Creating user:', username);
      const response = await this.makeRequest(
        this.getApiUrl('/api/users'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ username, password })
        }
      );

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
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async deleteUser(userId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}`),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token)
        }
      );

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
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}/businesses`),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const businesses = await response.json();

      return {
        success: true,
        data: businesses
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
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}/businesses/${businessId}`),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token)
        }
      );

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
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}/businesses`),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token)
        }
      );

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

  // Sharing Operations
  async getAvailableTowns(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/towns/available'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch available towns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available towns'
      };
    }
  }

  async shareTowns(targetUserId: number, towns: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/towns'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ targetUserId, towns })
        }
      );

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
      console.error('Failed to share towns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share towns'
      };
    }
  }

  async shareBusinesses(targetUserId: number, businessIds: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/businesses'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ targetUserId, businessIds })
        }
      );

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
      console.error('Failed to share businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share businesses'
      };
    }
  }

  // Unshare Operations
  async getSharedData(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/shared'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch shared data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch shared data'
      };
    }
  }

  async unshareTowns(targetUserId: number, towns: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/towns'),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ targetUserId, towns })
        }
      );

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
      console.error('Failed to unshare towns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unshare towns'
      };
    }
  }

  async unshareBusinesses(targetUserId: number, businessIds: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/share/businesses'),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ targetUserId, businessIds })
        }
      );

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
      console.error('Failed to unshare businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unshare businesses'
      };
    }
  }

  // User Password Management
  async updateUserPassword(userId: number, newPassword: string, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}/password`),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ password: newPassword })
        }
      );

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
      console.error('Failed to update user password:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user password'
      };
    }
  }

  async updateUser(userId: number, updates: { username?: string; password?: string }, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/users/${userId}`),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify(updates)
        }
      );

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
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  // Dataset Management Functions
  async updateDataset(datasetId: number, updates: { name?: string; description?: string; town?: string; province?: string }, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/datasets/${datasetId}`),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify(updates)
        }
      );

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
      console.error('Failed to update dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update dataset'
      };
    }
  }

  async deleteDataset(datasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/datasets/${datasetId}`),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(token)
        }
      );

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
      console.error('Failed to delete dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete dataset'
      };
    }
  }

  async getDatasetDetails(datasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/datasets/${datasetId}/details`),
        {
          method: 'GET',
          headers: this.getAuthHeaders(token)
        }
      );

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
      console.error('Failed to get dataset details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dataset details'
      };
    }
  }

  async moveBusinessesToDataset(fromDatasetId: number, businessIds: string[], targetDatasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl(`/api/datasets/${fromDatasetId}/move-businesses`),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token),
          body: JSON.stringify({ businessIds, targetDatasetId })
        }
      );

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
      console.error('Failed to move businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move businesses'
      };
    }
  }

  async createDataset(name: string, description: string, town: string, province?: string, token?: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/datasets'),
        {
          method: 'POST',
          headers: this.getAuthHeaders(token || ''),
          body: JSON.stringify({ name, description, town, province })
        }
      );

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
      console.error('Failed to create dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create dataset'
      };
    }
  }

  // Dataset Operations
  async getDatasets(token: string): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(
        this.getApiUrl('/api/datasets'),
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const datasets = await response.json();

      return {
        success: true,
        data: datasets
      };
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch datasets'
      };
    }
  }
}

export const serverDataService = new ServerDataService();