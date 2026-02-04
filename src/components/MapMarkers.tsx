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

export const MapMarkers: React.FC<MapMarkersProps> = ({
  businesses,
  selectedBusinessId,
  selectedBusinessIds = [],
  onBusinessSelect
}) => {
  console.log('🗺️ MAPMARKERS: Rendering', businesses?.length || 0, 'businesses');

  // Filter and validate businesses with coordinates
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

  // Create markers with proper error handling
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

      // Simple click handler - preserve map view for marker clicks
      const handleClick = (e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation();
        // Don't reset map view when clicking on individual markers
        onBusinessSelect?.(business);
      };

      return (
        <Marker
          key={business.id}
          position={[business.coordinates.lat, business.coordinates.lng]}
          icon={icon}
          eventHandlers={{ click: handleClick }}
        />
      );
    });
  }, [validBusinesses, selectedBusinessId, selectedBusinessIds, onBusinessSelect]);

  // Dynamic clustering configuration based on zoom
  const getClusterRadius = React.useCallback((zoom: number) => {
    const isMobile = window.innerWidth < 768;
    const multiplier = isMobile ? 0.8 : 1.0;
    
    // Progressive clustering - larger radius at lower zoom
    if (zoom <= 8) return Math.round(80 * multiplier);
    if (zoom <= 10) return Math.round(60 * multiplier);
    if (zoom <= 12) return Math.round(45 * multiplier);
    if (zoom <= 14) return Math.round(35 * multiplier);
    if (zoom <= 15) return Math.round(25 * multiplier);
    
    return Math.round(15 * multiplier); // Minimal clustering at high zoom
  }, []);

  // Custom cluster icon
  const createClusterIcon = React.useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    
    // Size based on count
    let size = 40;
    let bgColor = '#3b82f6';
    let textColor = 'white';
    
    if (count >= 100) {
      size = 50;
      bgColor = '#dc2626';
    } else if (count >= 50) {
      size = 45;
      bgColor = '#ea580c';
    } else if (count >= 20) {
      size = 42;
      bgColor = '#f59e0b';
    } else if (count >= 10) {
      size = 40;
      bgColor = '#10b981';
    }

    // Mobile adjustment
    if (window.innerWidth < 768) {
      size = Math.round(size * 0.85);
    }

    return L.divIcon({
      html: `<div style="
        background-color: ${bgColor};
        color: ${textColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${size > 45 ? '14px' : '12px'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }, []);

  // Enhanced cluster click handler
  const handleClusterClick = React.useCallback((cluster: any) => {
    try {
      const clusterLayer = cluster.layer || cluster.target;
      if (!clusterLayer || !clusterLayer._map) return;

      const map = clusterLayer._map;
      const currentZoom = map.getZoom();
      const childCount = clusterLayer.getChildCount();
      const clusterLatLng = clusterLayer.getLatLng();

      console.log('🗺️ CLUSTER CLICK:', { currentZoom, childCount });

      // Prevent default behavior and stop propagation
      if (cluster.originalEvent) {
        cluster.originalEvent.preventDefault();
        cluster.originalEvent.stopPropagation();
      }

      // Smart zoom vs spiderfy logic - prioritize spiderfying at higher zooms
      if (currentZoom >= 14 || childCount <= 8) {
        // High zoom or small groups: Use spiderfy
        if (typeof clusterLayer.spiderfy === 'function') {
          console.log('🗺️ SPIDERFY:', childCount, 'items');
          clusterLayer.spiderfy();
          
          // Keep cluster expanded - prevent auto-collapse
          setTimeout(() => {
            if (clusterLayer._spiderfied) {
              // Add event listeners to prevent cluster from collapsing
              map.off('click', clusterLayer._unspiderfy);
              map.off('zoomstart', clusterLayer._unspiderfy);
            }
          }, 100);
          
          return; // Don't zoom if we spiderfied
        }
      }
      
      // Lower zoom or large groups: Zoom in
      if (currentZoom < 12) {
        // Low zoom: Zoom in more aggressively
        const targetZoom = Math.min(currentZoom + 2, 14);
        map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.6 });
      } else if (currentZoom < 14 && childCount > 8) {
        // Medium zoom with many items: Zoom in once more
        const targetZoom = Math.min(currentZoom + 1, 15);
        map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.5 });
      } else {
        // Fallback: minimal zoom
        const targetZoom = Math.min(currentZoom + 1, 16);
        map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.3 });
      }
    } catch (error) {
      console.error('🗺️ CLUSTER CLICK ERROR:', error);
    }
  }, []);

  console.log('🗺️ MAPMARKERS: Rendering', markers.length, 'valid markers');

  if (markers.length === 0) {
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }

  return (
    <MarkerClusterGroup
      // Core clustering settings
      maxClusterRadius={getClusterRadius}
      disableClusteringAtZoom={17} // Increased to allow more clustering
      minimumClusterSize={2}
      
      // Performance settings
      chunkedLoading={true}
      removeOutsideVisibleBounds={false}
      animate={true}
      animateAddingMarkers={false}
      
      // Spiderfy settings - Enhanced
      spiderfyOnMaxZoom={true}
      spiderfyOnEveryZoom={true} // Enable spiderfy at all zoom levels
      spiderfyDistanceMultiplier={window.innerWidth < 768 ? 1.2 : 1.5} // Increased distance
      spiderfyShapePositions={undefined} // Use default spiral shape
      
      // Visual settings
      showCoverageOnHover={false}
      zoomToBoundsOnClick={false} // Disable default zoom behavior
      singleMarkerMode={false}
      
      // Custom icon and event handlers
      iconCreateFunction={createClusterIcon}
      eventHandlers={{
        clusterclick: handleClusterClick
      }}
      
      // Spiderfy styling - Enhanced
      polygonOptions={{
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.3
      }}
      clockHelpingCircleOptions={{
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.2
      }}
    >
      {markers}
    </MarkerClusterGroup>
  );
};