import type { Business } from '../types';

/**
 * Calculate the distance between two coordinates using the Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

/**
 * Optimize route using nearest neighbor algorithm
 * This creates a more efficient route by always going to the nearest unvisited location
 */
export function optimizeRouteByDistance(businesses: Business[]): Business[] {
  if (businesses.length <= 1) return businesses;

  const optimized: Business[] = [];
  const unvisited = [...businesses];
  
  // Start with the first business (could be improved by finding the best starting point)
  let current = unvisited.shift()!;
  optimized.push(current);

  // Keep finding the nearest unvisited business
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find the nearest unvisited business
    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateDistance(
        current.coordinates.lat,
        current.coordinates.lng,
        unvisited[i].coordinates.lat,
        unvisited[i].coordinates.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Move to the nearest business
    current = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }

  return optimized;
}

/**
 * Calculate the total distance of a route
 */
export function calculateRouteDistance(businesses: Business[]): number {
  if (businesses.length <= 1) return 0;

  let totalDistance = 0;
  for (let i = 0; i < businesses.length - 1; i++) {
    totalDistance += calculateDistance(
      businesses[i].coordinates.lat,
      businesses[i].coordinates.lng,
      businesses[i + 1].coordinates.lat,
      businesses[i + 1].coordinates.lng
    );
  }

  return totalDistance;
}

/**
 * Get route statistics
 */
export function getRouteStats(businesses: Business[]) {
  const originalDistance = calculateRouteDistance(businesses);
  const optimizedBusinesses = optimizeRouteByDistance(businesses);
  const optimizedDistance = calculateRouteDistance(optimizedBusinesses);
  const savings = originalDistance - optimizedDistance;
  const savingsPercentage = originalDistance > 0 ? (savings / originalDistance) * 100 : 0;

  return {
    originalDistance: Math.round(originalDistance * 10) / 10, // Round to 1 decimal
    optimizedDistance: Math.round(optimizedDistance * 10) / 10,
    savings: Math.round(savings * 10) / 10,
    savingsPercentage: Math.round(savingsPercentage),
    optimizedBusinesses
  };
}