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
        
        throw new Error(`JSON parsing failed: ${jsonError.message}`);
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
        if (page > 50) {
          console.warn('⚠️ API: Reached maximum page limit (50), stopping');
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
      
      // Invalidate cache after successful save
      cacheService.invalidateRelated('businesses');
      
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

  private async saveBusinessesChunked(businesses: Business[], token: string, chunkSize: number = 500, metadata?: { source?: string; town?: string; clearFirst?: boolean }): Promise<ServerDataResult> {
    console.log(`🔄 Starting chunked upload: ${businesses.length} businesses in chunks of ${chunkSize}`);
    
    const chunks = [];
    for (let i = 0; i < businesses.length; i += chunkSize) {
      chunks.push(businesses.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Created ${chunks.length} chunks`);
    
    try {
      // Only clear existing data if explicitly requested
      if (metadata?.clearFirst === true) {
        console.log('🗑️ Clearing existing server data...');
        const clearResult = await this.clearWorkspace(token);
        if (!clearResult.success) {
          console.warn('⚠️ Failed to clear workspace, continuing anyway:', clearResult.error);
        }
      } else {
        console.log('📝 Appending to existing data (not clearing)');
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
              clearFirst: false, // Never clear on chunks since we handled it above
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
    try {
      console.log('🔄 Updating single business:', businessId, 'with updates:', Object.keys(updates));
      
      const response = await this.makeRequest(this.getApiUrl(`/api/businesses/${businessId}`), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Business updated successfully');
      
      return {
        success: true,
        data: result.business
      };
    } catch (error) {
      console.error('❌ Failed to update business:', error);
      
      // Fallback to the old method if the new endpoint doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        console.log('🔄 Falling back to full sync method...');
        return this.updateBusinessFallback(businessId, updates, token);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business'
      };
    }
  }

  // Fallback method using the old approach
  private async updateBusinessFallback(businessId: string, updates: Partial<Business>, token: string): Promise<ServerDataResult> {
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
  async getRoutes(token: string, forceRefresh = false): Promise<ServerDataResult> {
    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedRoutes = cacheService.getRoutes();
        if (cachedRoutes) {
          console.log('📦 CACHE: Using cached routes', cachedRoutes.length);
          return {
            success: true,
            data: cachedRoutes,
            count: cachedRoutes.length
          };
        }
      }

      console.log('🌐 API: Fetching routes from server');
      const response = await fetch(this.getApiUrl('/api/route'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const routes = await response.json();

      // Cache the result
      cacheService.setRoutes(routes);
      console.log('💾 CACHE: Cached routes', routes.length);

      return {
        success: true,
        data: routes,
        count: routes.length
      };
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      
      // Try to return cached data as fallback if available
      const cachedRoutes = cacheService.getRoutes();
      if (cachedRoutes) {
        console.log('📦 CACHE: Using stale cache as fallback', cachedRoutes.length);
        return {
          success: true,
          data: cachedRoutes,
          count: cachedRoutes.length
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

  // Remove duplicates
  async removeDuplicates(token: string, dryRun = false): Promise<ServerDataResult> {
    try {
      const response = await this.makeRequest(this.getApiUrl('/api/businesses/remove-duplicates'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ dryRun })
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
      console.error('Failed to remove duplicates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove duplicates'
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

  // Sharing Operations
  async getAvailableTowns(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/share/towns'), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result.towns || [],
        count: result.towns?.length || 0
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
      const response = await fetch(this.getApiUrl('/api/share/towns'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ targetUserId, towns })
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
      console.error('Failed to share towns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share towns'
      };
    }
  }

  async shareBusinesses(targetUserId: number, businessIds: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/share/businesses'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ targetUserId, businessIds })
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
      const response = await fetch(this.getApiUrl('/api/share/shared'), {
        headers: this.getAuthHeaders(token)
      });

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
      const response = await fetch(this.getApiUrl('/api/share/towns'), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ targetUserId, towns })
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
      console.error('Failed to unshare towns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unshare towns'
      };
    }
  }

  async unshareBusinesses(targetUserId: number, businessIds: string[], token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/share/businesses'), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ targetUserId, businessIds })
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
      const response = await fetch(this.getApiUrl(`/api/users/${userId}/password`), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ password: newPassword })
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
      console.error('Failed to update user password:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user password'
      };
    }
  }

  async updateUser(userId: number, updates: { username?: string; password?: string }, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/users/${userId}`), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(updates)
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
      const response = await fetch(this.getApiUrl(`/api/datasets/${datasetId}`), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(updates)
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
      console.error('Failed to update dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update dataset'
      };
    }
  }

  async deleteDataset(datasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/datasets/${datasetId}`), {
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
      console.error('Failed to delete dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete dataset'
      };
    }
  }

  async getDatasetDetails(datasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/datasets/${datasetId}/details`), {
        method: 'GET',
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
      console.error('Failed to get dataset details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dataset details'
      };
    }
  }

  async moveBusinessesToDataset(fromDatasetId: number, businessIds: string[], targetDatasetId: number, token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl(`/api/datasets/${fromDatasetId}/move-businesses`), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ businessIds, targetDatasetId })
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
      console.error('Failed to move businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move businesses'
      };
    }
  }

  async createDataset(name: string, description: string, town: string, province?: string, token?: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/datasets'), {
        method: 'POST',
        headers: this.getAuthHeaders(token || ''),
        body: JSON.stringify({ name, description, town, province })
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
      console.error('Failed to create dataset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create dataset'
      };
    }
  }
}

export const serverDataService = new ServerDataService();