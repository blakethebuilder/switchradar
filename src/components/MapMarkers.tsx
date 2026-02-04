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

      // Optimized click handler that doesn't reset map view
      const handleClick = React.useCallback((e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation();
        // Prevent map view reset by not triggering navigation
        if (onBusinessSelect) {
          onBusinessSelect(business);
        }
      }, [business, onBusinessSelect]);

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

  // Progressive clustering radius based on zoom level with safe limits
  const getClusterRadius = React.useCallback((zoom: number) => {
    const isMobile = window.innerWidth < 768;
    const multiplier = isMobile ? 0.8 : 1.0;
    
    // Progressive clustering - larger radius at lower zoom, smaller at higher zoom
    // Safe zoom range: 5-16 to prevent render issues
    if (zoom <= 5) return Math.round(150 * multiplier);  // Very clustered at country level
    if (zoom <= 7) return Math.round(120 * multiplier);  // Clustered at province level
    if (zoom <= 9) return Math.round(100 * multiplier);  // Moderate clustering at city level
    if (zoom <= 11) return Math.round(80 * multiplier);  // Less clustering at district level
    if (zoom <= 13) return Math.round(60 * multiplier);  // Minimal clustering at neighborhood level
    if (zoom <= 15) return Math.round(40 * multiplier);  // Very minimal clustering at street level
    
    return Math.round(25 * multiplier); // Almost no clustering at building level (zoom 16+)
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

      // Simple behavior: Always zoom in by 1 level with safe limits
      const targetZoom = Math.min(currentZoom + 1, 16); // Max zoom 16 to prevent render issues
      
      // Don't zoom if we're already at max zoom
      if (currentZoom >= 16) {
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

  console.log('🗺️ MAPMARKERS: Rendering', markers.length, 'valid markers');

  if (markers.length === 0) {
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }

  return (
    <MarkerClusterGroup
      // Core clustering settings - Simple and predictable with safe limits
      maxClusterRadius={getClusterRadius}
      disableClusteringAtZoom={17} // Disable clustering at zoom 17+ to prevent render issues
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
});