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

  // Business Operations
  async getBusinesses(token: string): Promise<ServerDataResult> {
    try {
      const response = await fetch(this.getApiUrl('/api/businesses'), {
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

  async saveBusinesses(businesses: Business[], token: string): Promise<ServerDataResult> {
    try {
      console.log('saveBusinesses called with:', {
        businessCount: businesses.length,
        tokenPresent: !!token,
        apiUrl: this.getApiUrl('/api/businesses/sync')
      });

      const response = await fetch(this.getApiUrl('/api/businesses/sync'), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ businesses })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Response result:', result);
      
      return {
        success: true,
        data: result,
        count: businesses.length
      };
    } catch (error) {
      console.error('Failed to save businesses:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save businesses'
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

  // Connection test
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('/api/auth/ping'), {
        method: 'GET'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get server statistics
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
}

export const serverDataService = new ServerDataService();