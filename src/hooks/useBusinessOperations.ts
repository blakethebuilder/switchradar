import { useCallback } from 'react';
import { serverDataService } from '../services/serverData';
import { useAuth } from '../context/AuthContext';
import type { Business } from '../types';

export const useBusinessOperations = (refetch: () => Promise<void>) => {
  const { token } = useAuth();

  const updateBusiness = useCallback(async (id: string, updates: Partial<Business>) => {
    if (!token) return;
    
    try {
      const result = await serverDataService.updateBusiness(id, updates, token);
      if (result.success) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to update business:', error);
    }
  }, [token, refetch]);

  const deleteBusiness = useCallback(async (id: string) => {
    if (!token) return;
    
    if (window.confirm('Are you sure you want to delete this business?')) {
      try {
        const result = await serverDataService.deleteBusiness(id, token);
        if (result.success) {
          await refetch();
          return true;
        }
      } catch (error) {
        console.error('Failed to delete business:', error);
      }
    }
    return false;
  }, [token, refetch]);

  const bulkDeleteBusinesses = useCallback(async (ids: string[]) => {
    if (!token) return;
    
    if (window.confirm(`Delete ${ids.length} selected businesses? This cannot be undone.`)) {
      try {
        const result = await serverDataService.bulkDelete(ids, token);
        if (result.success) {
          await refetch();
          return true;
        }
      } catch (error) {
        console.error('Failed to bulk delete:', error);
      }
    }
    return false;
  }, [token, refetch]);

  const togglePhoneType = useCallback(async (id: string, currentType: 'landline' | 'mobile') => {
    if (!token) return;
    
    const newType = currentType === 'landline' ? 'mobile' : 'landline';
    try {
      const result = await serverDataService.updateBusiness(id, { phoneTypeOverride: newType }, token);
      if (result.success) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to toggle phone type:', error);
    }
  }, [token, refetch]);

  const clearAllData = useCallback(async () => {
    if (!token) return;
    
    if (window.confirm('Delete ALL businesses and routes? This cannot be undone.')) {
      try {
        const result = await serverDataService.clearWorkspace(token);
        if (result.success) {
          await refetch();
          return true;
        }
      } catch (error) {
        console.error('Failed to clear all data:', error);
      }
    }
    return false;
  }, [token, refetch]);

  return {
    updateBusiness,
    deleteBusiness,
    bulkDeleteBusinesses,
    togglePhoneType,
    clearAllData,
  };
};