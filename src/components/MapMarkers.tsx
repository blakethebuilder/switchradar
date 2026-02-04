import React from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Business } from '../types';
import { createProviderIcon, createFallbackIcon } from '../utils/mapIcons';

interface MapMarkersProps {
  businesses: Business[];
  selectedBusinessId?: string;
  selectedBusinessIds?: string[];
  onBusinessSelect?: (business: Business) => void;
}

export const MapMarkers: React.FC<MapMarkersProps> = React.memo(({
  businesses,
  selectedBusinessId,
  selectedBusinessIds = [],
  onBusinessSelect
}) => {
  console.log('🗺️ MAPMARKERS: Rendering', businesses?.length || 0, 'businesses');

  // Filter and validate businesses with coordinates - memoized for performance
  const validBusinesses = React.useMemo(() => {
    if (!businesses || businesses.length === 0) return [];
    
    return businesses.filter(business => {
      if (!business?.id || !business.coordinates) return false;
      
      const { lat, lng } = business.coordinates;
      
      // Strict coordinate validation
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (isNaN(lat) || isNaN(lng)) return false;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
      
      // Exclude suspicious coordinates (0,0 or very close to 0,0)
      if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false;
      
      return true;
    });
  }, [businesses]);

  // Create markers with proper error handling - memoized for performance
  const markers = React.useMemo(() => {
    const selectedSet = new Set([selectedBusinessId, ...selectedBusinessIds].filter(Boolean));
    
    return validBusinesses.map((business) => {
      const isSelected = selectedSet.has(business.id);
      
      // Create icon with fallback
      let icon;
      try {
        icon = createProviderIcon(business.provider || 'Unknown', isSelected);
        if (!icon) icon = createFallbackIcon();
      } catch (error) {
        console.warn(`Failed to create icon for ${business.id}:`, error);
        icon = createFallbackIcon();
      }

      // Stable click handler that prevents clustering issues
      const handleClick = (e: L.LeafletMouseEvent) => {
        console.log('🗺️ MARKER CLICK: Business clicked', {
          businessId: business.id,
          businessName: business.name,
          onBusinessSelectExists: !!onBusinessSelect,
          timestamp: new Date().toISOString()
        });
        
        // Prevent event bubbling that might interfere with clustering
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        
        // Use setTimeout to defer the state update and prevent clustering interference
        setTimeout(() => {
          if (onBusinessSelect) {
            console.log('🗺️ MARKER CLICK: Calling onBusinessSelect for', business.name);
            onBusinessSelect(business);
          } else {
            console.warn('🗺️ MARKER CLICK: No onBusinessSelect handler provided');
          }
        }, 0);
      };

      return (
        <Marker
          key={business.id}
          position={[business.coordinates.lat, business.coordinates.lng]}
          icon={icon}
          eventHandlers={{ 
            click: handleClick,
            // Add hover effects for better UX at high zoom levels
            mouseover: (e) => {
              const marker = e.target;
              if (marker.getElement) {
                const element = marker.getElement();
                if (element) {
                  element.style.transform = 'scale(1.2)';
                  element.style.zIndex = '1000';
                }
              }
            },
            mouseout: (e) => {
              const marker = e.target;
              if (marker.getElement) {
                const element = marker.getElement();
                if (element) {
                  element.style.transform = 'scale(1)';
                  element.style.zIndex = '';
                }
              }
            }
          }}
        />
      );
    });
  }, [validBusinesses, selectedBusinessId, selectedBusinessIds, onBusinessSelect]);

  // Progressive clustering radius - scatter at zoom 15 (14.5+ range)
  /* TEMPORARILY DISABLED - TESTING WITHOUT CLUSTERING
  const getClusterRadius = React.useCallback((zoom: number) => {
    // Consistent clustering across all devices for better UX
    // No mobile/desktop differences - same experience everywhere
    
    // Progressive clustering - businesses scatter at zoom 15 (14.5+ range)
    // Zoom range: 5-17, clustering disabled at 15+
    if (zoom <= 5) return 150;  // Very clustered at country level
    if (zoom <= 7) return 120;  // Clustered at province level
    if (zoom <= 9) return 100;  // Moderate clustering at city level
    if (zoom <= 11) return 80;  // Less clustering at district level
    if (zoom <= 13) return 60;  // Minimal clustering at neighborhood level
    if (zoom <= 14) return 40;  // Very minimal clustering at street level
    
    // Zoom 15+ = No clustering (handled by disableClusteringAtZoom)
    return 25; // This won't be used due to disableClusteringAtZoom=15
  }, []);

  // Custom cluster icon with better visibility
  const createClusterIcon = React.useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    
    // Size and color based on count - more prominent for better visibility
    let size = 45;
    let bgColor = '#3b82f6';
    let textColor = 'white';
    let borderColor = '#1e40af';
    
    if (count >= 100) {
      size = 55;
      bgColor = '#dc2626';
      borderColor = '#991b1b';
    } else if (count >= 50) {
      size = 52;
      bgColor = '#ea580c';
      borderColor = '#c2410c';
    } else if (count >= 20) {
      size = 48;
      bgColor = '#f59e0b';
      borderColor = '#d97706';
    } else if (count >= 10) {
      size = 45;
      bgColor = '#10b981';
      borderColor = '#059669';
    }

    // Consistent size across devices - no mobile adjustment for better UX
    return L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, ${bgColor} 0%, ${borderColor} 100%);
        color: ${textColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${size > 50 ? '16px' : '14px'};
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }, []);

  // Simple and predictable cluster click handler - just zoom in with limits
  const handleClusterClick = React.useCallback((cluster: any) => {
    try {
      const clusterLayer = cluster.layer || cluster.target;
      if (!clusterLayer || !clusterLayer._map) return;

      const map = clusterLayer._map;
      const currentZoom = map.getZoom();
      const clusterLatLng = clusterLayer.getLatLng();

      console.log('🗺️ CLUSTER CLICK: Zoom', currentZoom, '-> Zooming in');

      // Prevent default behavior
      if (cluster.originalEvent) {
        cluster.originalEvent.preventDefault();
        cluster.originalEvent.stopPropagation();
      }

      // Simple behavior: Always zoom in by 1 level with adjusted limits
      const targetZoom = Math.min(currentZoom + 1, 17); // Max zoom 17 for optimal performance
      
      // Don't zoom if we're already at max zoom
      if (currentZoom >= 17) {
        console.log('🗺️ CLUSTER CLICK: Already at max zoom, ignoring');
        return;
      }
      
      map.setView(clusterLatLng, targetZoom, { 
        animate: true, 
        duration: 0.5 
      });
      
    } catch (error) {
      console.error('🗺️ CLUSTER CLICK ERROR:', error);
    }
  }, []);
  */

  console.log('🗺️ MAPMARKERS: Rendering', markers.length, 'valid markers');

  if (markers.length === 0) {
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }

  // TEMPORARY: Disable clustering to test if that's causing the disappearing issue
  // Return markers directly without clustering
  return (
    <>
      {markers}
    </>
  );

  /* ORIGINAL CLUSTERING CODE - TEMPORARILY DISABLED
  return (
    <MarkerClusterGroup
      // Core clustering settings - Scatter at zoom 15 (effectively 14.5+)
      maxClusterRadius={getClusterRadius}
      disableClusteringAtZoom={15} // Scatter businesses at zoom 15 (14.5+ range)
      minimumClusterSize={2}
      
      // Performance settings
      chunkedLoading={true}
      removeOutsideVisibleBounds={true}
      animate={true}
      animateAddingMarkers={false}
      
      // Disable all spiderfying - keep it simple
      spiderfyOnMaxZoom={false}
      spiderfyOnEveryZoom={false}
      
      // Visual settings
      showCoverageOnHover={false}
      zoomToBoundsOnClick={false} // Use our custom click handler
      singleMarkerMode={false}
      
      // Custom icon and event handlers
      iconCreateFunction={createClusterIcon}
      eventHandlers={{
        clusterclick: handleClusterClick
      }}
    >
      {markers}
    </MarkerClusterGroup>
  );
  */
});