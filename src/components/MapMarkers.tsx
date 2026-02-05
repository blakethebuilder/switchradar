import React from 'react';
import { Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Business } from '../types';
import { createProviderIcon, createFallbackIcon } from '../utils/mapIcons';

interface MapMarkersProps {
  businesses: Business[];
  selectedBusinessId?: string;
  onBusinessSelect?: (business: Business) => void;
}

export const MapMarkers: React.FC<MapMarkersProps> = React.memo(({
  businesses,
  selectedBusinessId,
  onBusinessSelect
}) => {
  const map = useMap(); // Get access to the map instance
  console.log('🗺️ MAPMARKERS: Rendering', businesses?.length || 0, 'businesses');

  // CRITICAL: Limit markers to prevent browser freeze with large datasets
  const validBusinesses = React.useMemo(() => {
    if (!businesses || businesses.length === 0) return [];
    
    // Filter valid businesses first
    const filtered = businesses.filter(business => 
      business?.id && 
      business.coordinates && 
      typeof business.coordinates.lat === 'number' && 
      typeof business.coordinates.lng === 'number' &&
      !isNaN(business.coordinates.lat) && 
      !isNaN(business.coordinates.lng) &&
      Math.abs(business.coordinates.lat) > 0.001 && // Exclude 0,0 coordinates
      Math.abs(business.coordinates.lng) > 0.001
    );
    
    // PERFORMANCE: Limit to maximum 1500 markers to prevent freezing (reduced from 2000)
    const MAX_MARKERS = 1500;
    if (filtered.length > MAX_MARKERS) {
      console.log(`🗺️ MAPMARKERS: Large dataset (${filtered.length}), limiting to ${MAX_MARKERS} markers for performance`);
      
      // Always include selected business if it exists
      let result = [];
      if (selectedBusinessId) {
        const selectedBusiness = filtered.find(b => b.id === selectedBusinessId);
        if (selectedBusiness) {
          result.push(selectedBusiness);
        }
      }
      
      // Take a representative sample of the rest, but use better sampling
      const remaining = filtered.filter(b => b.id !== selectedBusinessId);
      const step = Math.ceil(remaining.length / (MAX_MARKERS - result.length));
      const sampled = remaining.filter((_, index) => index % step === 0);
      
      // Combine selected + sampled
      result = [...result, ...sampled];
      
      return result.slice(0, MAX_MARKERS);
    }
    
    return filtered;
  }, [businesses, selectedBusinessId]);

  // Simple cluster radius - fewer zoom levels, clearer behavior
  const clusterRadius = (zoom: number) => {
    if (zoom < 10) return 60;  // More clustered for better performance
    if (zoom < 14) return 30;  // Less clustered  
    return 15; // Minimal clustering before scatter
  };

  // Simple cluster icon
  const createClusterIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count > 100 ? 50 : count > 20 ? 40 : 35;
    
    return L.divIcon({
      html: `<div style="
        background: #3b82f6;
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: '' // Remove default leaflet icon classes that add borders
    });
  };

  // Simple cluster click - just zoom in
  const handleClusterClick = (event: any) => {
    const cluster = event.layer || event.target;
    if (!cluster?._map) return;
    
    const map = cluster._map;
    const currentZoom = map.getZoom();
    
    // Simple: zoom in by 2 levels, max zoom 16
    if (currentZoom < 16) {
      map.setView(cluster.getLatLng(), Math.min(currentZoom + 2, 16));
    }
  };

  // Simple marker click
  const handleMarkerClick = (business: Business) => {
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }
  };

  return (
    <MarkerClusterGroup
      maxClusterRadius={clusterRadius}
      disableClusteringAtZoom={15} // Scatter at zoom 15
      iconCreateFunction={createClusterIcon}
      eventHandlers={{ clusterclick: handleClusterClick }}
      // Optimized performance settings for large datasets
      chunkedLoading={true}
      removeOutsideVisibleBounds={true}
      animate={false}
      spiderfyOnMaxZoom={false} // Disable spiderfy for performance
      showCoverageOnHover={false} // Disable coverage for performance
      zoomToBoundsOnClick={true}
    >
      {validBusinesses.map((business) => {
        const isSelected = business.id === selectedBusinessId;
        let icon;
        
        try {
          icon = createProviderIcon(business.provider || 'Unknown', isSelected);
        } catch {
          icon = createFallbackIcon();
        }

        return (
          <Marker
            key={business.id}
            position={[business.coordinates.lat, business.coordinates.lng]}
            icon={icon}
            eventHandlers={{
              click: () => handleMarkerClick(business)
            }}
          />
        );
      })}
    </MarkerClusterGroup>
  );
});