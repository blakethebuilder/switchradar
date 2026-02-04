import React from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Business } from '../types';
import { createProviderIcon, createFallbackIcon } from '../utils/mapIcons';
import { throttle } from '../utils/performance';

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
  // Memoize markers for performance
  const markers = React.useMemo(() => {
    console.log('🗺️ MARKERS: Creating markers for', businesses.length, 'businesses');
    
    if (!businesses || businesses.length === 0) {
      return [];
    }
    
    const validMarkers: React.ReactElement[] = [];
    const selectedSet = new Set([selectedBusinessId, ...selectedBusinessIds].filter(Boolean));
    
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      try {
        // Validate business data
        if (!business?.id || !business.coordinates) {
          continue;
        }
        
        if (typeof business.coordinates.lat !== 'number' || 
            typeof business.coordinates.lng !== 'number' ||
            isNaN(business.coordinates.lat) || 
            isNaN(business.coordinates.lng)) {
          continue;
        }

        // Validate coordinate ranges
        if (business.coordinates.lat < -90 || business.coordinates.lat > 90 ||
            business.coordinates.lng < -180 || business.coordinates.lng > 180) {
          continue;
        }

        // Create icon
        let icon;
        try {
          const isSelected = selectedSet.has(business.id);
          icon = createProviderIcon(business.provider || 'Unknown', isSelected);
          
          if (!icon) {
            icon = createFallbackIcon();
          }
        } catch (iconError) {
          console.error(`Error creating icon for business ${business.id}:`, iconError);
          icon = createFallbackIcon();
        }

        if (!icon) continue;

        // Throttled click handler
        const throttledClick = throttle((e: L.LeafletMouseEvent) => {
          try {
            e.originalEvent?.stopPropagation();
            requestAnimationFrame(() => {
              onBusinessSelect?.(business);
            });
          } catch (error) {
            console.error('Error in marker click handler:', error);
          }
        }, 150);

        const marker = (
          <Marker
            key={business.id}
            position={[business.coordinates.lat, business.coordinates.lng]}
            icon={icon}
            eventHandlers={{
              click: throttledClick,
            }}
          />
        );

        validMarkers.push(marker);
        
      } catch (error) {
        console.error(`Error creating marker for business ${business.id}:`, error);
        continue;
      }
    }

    console.log(`🗺️ MARKERS: Created ${validMarkers.length} valid markers`);
    return validMarkers;
  }, [businesses, selectedBusinessId, selectedBusinessIds, onBusinessSelect]);

  return (
    <MarkerClusterGroup
      chunkedLoading={true}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      animate={true}
      animateAddingMarkers={false}
      removeOutsideVisibleBounds={true}
      disableClusteringAtZoom={16}
      maxClusterRadius={(zoom: number) => {
        // Responsive clustering
        const isMobile = window.innerWidth < 768;
        const baseMultiplier = isMobile ? 0.8 : 1.0;
        
        if (zoom <= 6) return Math.round(100 * baseMultiplier);
        if (zoom <= 8) return Math.round(85 * baseMultiplier);
        if (zoom <= 10) return Math.round(70 * baseMultiplier);
        if (zoom <= 12) return Math.round(55 * baseMultiplier);
        if (zoom <= 14) return Math.round(40 * baseMultiplier);
        if (zoom <= 15) return Math.round(30 * baseMultiplier);
        return Math.round(20 * baseMultiplier);
      }}
      spiderfyDistanceMultiplier={window.innerWidth < 768 ? 0.8 : 1.0}
      spiderfyOnEveryZoom={true}
      zoomToBoundsOnClick={false}
      maxZoom={17}
      eventHandlers={{
        clusterclick: (cluster: any) => {
          const clusterGroup = cluster.target;
          const map = clusterGroup._map;
          const currentZoom = map.getZoom();
          const childCount = clusterGroup.getChildCount();
          
          if (cluster.originalEvent) {
            cluster.originalEvent.preventDefault();
            cluster.originalEvent.stopPropagation();
          }
          
          if (currentZoom <= 8) {
            const targetZoom = Math.min(currentZoom + 2, 10);
            map.setView(clusterGroup.getLatLng(), targetZoom, { animate: true, duration: 0.8 });
          } else if (currentZoom <= 10 && childCount > 20) {
            const targetZoom = Math.min(currentZoom + 2, 13);
            map.setView(clusterGroup.getLatLng(), targetZoom, { animate: true, duration: 0.6 });
          } else {
            clusterGroup.spiderfy();
          }
          
          return false;
        }
      }}
      iconCreateFunction={(cluster: any) => {
        try {
          const count = cluster.getChildCount();
          const map = cluster._group._map;
          const currentZoom = map ? map.getZoom() : 10;
          
          const isMobile = window.innerWidth < 768;
          const sizeMultiplier = isMobile ? 0.85 : 1.0;
          
          let size = 32;
          let bgColor = '#3b82f6';
          
          if (count >= 1000) {
            size = Math.round(60 * sizeMultiplier);
            bgColor = '#7c2d12';
          } else if (count >= 500) {
            size = Math.round(55 * sizeMultiplier);
            bgColor = '#dc2626';
          } else if (count >= 100) {
            size = Math.round(50 * sizeMultiplier);
            bgColor = '#ea580c';
          } else if (count >= 50) {
            size = Math.round(45 * sizeMultiplier);
            bgColor = '#d97706';
          } else if (count >= 20) {
            size = Math.round(40 * sizeMultiplier);
            bgColor = '#ca8a04';
          } else if (count >= 10) {
            size = Math.round(36 * sizeMultiplier);
            bgColor = '#16a34a';
          }
          
          if (currentZoom >= 12) {
            size += Math.round(4 * sizeMultiplier);
          } else if (currentZoom <= 8) {
            size += Math.round(2 * sizeMultiplier);
          }
          
          const fontSize = size > 50 ? '14px' : size > 40 ? '12px' : size > 35 ? '11px' : '10px';
          
          return L.divIcon({
            html: `<div style="
              background: ${bgColor};
              color: white;
              border-radius: 50%;
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 3px 12px rgba(0,0,0,0.3);
              font-size: ${fontSize};
              cursor: pointer;
            ">${count}</div>`,
            className: 'cluster-icon',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
          });
        } catch (error) {
          console.error('Cluster icon error:', error);
          const fallbackSize = 32;
          return L.divIcon({
            html: `<div style="background: #6b7280; color: white; border-radius: 50%; width: ${fallbackSize}px; height: ${fallbackSize}px; display: flex; align-items: center; justify-content: center; font-weight: bold;">•</div>`,
            iconSize: [fallbackSize, fallbackSize],
            iconAnchor: [fallbackSize/2, fallbackSize/2]
          });
        }
      }}
    >
      {markers}
    </MarkerClusterGroup>
  );
};