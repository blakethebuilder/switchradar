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

  // Progressive clustering radius - optimized for large datasets (9000+ businesses)
  const getClusterRadius = React.useCallback((zoom: number) => {
    // More aggressive clustering for large datasets to improve performance
    // Consistent clustering across all devices for better UX
    
    // Progressive clustering - businesses scatter at zoom 16 (increased for performance)
    // Zoom range: 5-17, clustering disabled at 16+
    if (zoom <= 5) return 200;  // Very clustered at country level (increased for large datasets)
    if (zoom <= 7) return 150;  // Clustered at province level (increased)
    if (zoom <= 9) return 120;  // Moderate clustering at city level (increased)
    if (zoom <= 11) return 100; // Less clustering at district level (increased)
    if (zoom <= 13) return 80;  // Minimal clustering at neighborhood level (increased)
    if (zoom <= 15) return 60;  // Very minimal clustering at street level (increased)
    
    // Zoom 16+ = No clustering (handled by disableClusteringAtZoom)
    return 40; // This won't be used due to disableClusteringAtZoom=16
  }, []);

  // Custom cluster icon with better visibility - optimized for performance
  const createClusterIcon = React.useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    
    // Size and color based on count - more prominent for better visibility
    let size = 45;
    let bgColor = '#3b82f6';
    let textColor = 'white';
    let borderColor = '#1e40af';
    
    // Adjusted thresholds for large datasets
    if (count >= 500) {
      size = 60;
      bgColor = '#dc2626';
      borderColor = '#991b1b';
    } else if (count >= 200) {
      size = 55;
      bgColor = '#ea580c';
      borderColor = '#c2410c';
    } else if (count >= 100) {
      size = 52;
      bgColor = '#f59e0b';
      borderColor = '#d97706';
    } else if (count >= 50) {
      size = 48;
      bgColor = '#10b981';
      borderColor = '#059669';
    } else if (count >= 20) {
      size = 45;
      bgColor = '#8b5cf6';
      borderColor = '#7c3aed';
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
        font-size: ${size > 55 ? '18px' : size > 50 ? '16px' : '14px'};
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: none; // Disable transitions for better performance
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }, []);

  // Simple and predictable cluster click handler - optimized for large datasets
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
        animate: false, // Disable animation for better performance with large datasets
        duration: 0 
      });
      
    } catch (error) {
      console.error('🗺️ CLUSTER CLICK ERROR:', error);
    }
  }, []);

  console.log('🗺️ MAPMARKERS: Rendering', markers.length, 'valid markers');

  if (markers.length === 0) {
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }

  // For large datasets (>1000 businesses), we NEED clustering for performance
  // Re-enable clustering with optimized settings for large datasets
  return (
    <MarkerClusterGroup
      // Optimized clustering settings for large datasets (9000+ businesses)
      maxClusterRadius={getClusterRadius}
      disableClusteringAtZoom={16} // Increased from 15 to 16 for better performance with large datasets
      minimumClusterSize={3} // Increased from 2 to 3 for better clustering with large datasets
      
      // Performance settings optimized for large datasets
      chunkedLoading={true}
      removeOutsideVisibleBounds={true} // Critical for performance with 9000+ markers
      animate={false} // Disable animations for better performance
      animateAddingMarkers={false}
      
      // Disable all spiderfying - keep it simple and fast
      spiderfyOnMaxZoom={false}
      spiderfyOnEveryZoom={false}
      
      // Visual settings optimized for performance
      showCoverageOnHover={false}
      zoomToBoundsOnClick={false} // Use our custom click handler
      singleMarkerMode={false}
      
      // Prevent clustering from interfering with marker selection
      // This is key to fixing the disappearing marker issue
      key={`cluster-${selectedBusinessId || 'none'}`} // Force re-render when selection changes
      
      // Custom icon and event handlers
      iconCreateFunction={createClusterIcon}
      eventHandlers={{
        clusterclick: handleClusterClick
      }}
    >
      {markers}
    </MarkerClusterGroup>
  );
});