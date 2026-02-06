import { useCallback } from 'react';
import { serverDataService } from '../services/serverData';
import { useAuth } from '../context/AuthContext';
import type { RouteItem } from '../types';

export const useRouteOperations = (routeItems: RouteItem[], refetch: () => Promise<void>) => {
  const { token } = useAuth();

  const addToRoute = useCallback(async (businessId: string) => {
    if (!token) return;
    
    try {
      const maxOrder = Math.max(...routeItems.map(i => i.order), 0);
      const newRouteItem = { businessId, order: maxOrder + 1, addedAt: new Date() };
      
      const result = await serverDataService.saveRoutes([...routeItems, newRouteItem], token);
      if (result.success) {
        // await refetch();
      }
    } catch (error) {
      console.error('Failed to add to route:', error);
    }
  }, [token, routeItems, refetch]);

  const removeFromRoute = useCallback(async (businessId: string) => {
    if (!token) return;
    
    try {
      const updatedRoutes = routeItems.filter(item => item.businessId !== businessId);
      
      const result = await serverDataService.saveRoutes(updatedRoutes, token);
      if (result.success) {
        // await refetch();
      }
    } catch (error) {
      console.error('Failed to remove from route:', error);
    }
  }, [token, routeItems, refetch]);

  const clearRoute = useCallback(async () => {
    if (!token) return;
    
    try {
      const result = await serverDataService.saveRoutes([], token);
      if (result.success) {
        // await refetch();
        return true;
      }
    } catch (error) {
      console.error('Failed to clear route:', error);
    }
    return false;
  }, [token, refetch]);

  const addSelectedToRoute = useCallback(async (selectedBusinessIds: string[]) => {
    if (!token) return;
    
    try {
      const newRouteItems = [...routeItems];
      for (const businessId of selectedBusinessIds) {
        const maxOrder = Math.max(...newRouteItems.map(i => i.order), 0);
        newRouteItems.push({ businessId, order: maxOrder + 1, addedAt: new Date() });
      }
      
      const result = await serverDataService.saveRoutes(newRouteItems, token);
      if (result.success) {
        // await refetch();
        return true;
      }
    } catch (error) {
      console.error('Failed to add selected to route:', error);
    }
    return false;
  }, [token, routeItems, refetch]);

  return {
    addToRoute,
    removeFromRoute,
    clearRoute,
    addSelectedToRoute,
  };
};