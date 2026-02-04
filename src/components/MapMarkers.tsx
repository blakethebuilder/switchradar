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
  console.log('🗺️ MAPMARKERS: Component render', {
    businessesCount: businesses?.length || 0,
    selectedBusinessId,
    selectedBusinessIdsCount: selectedBusinessIds.length
  });

  // Memoize markers for performance
  const markers = React.useMemo(() => {
    console.log('🗺️ MARKERS: Creating markers for', businesses?.length || 0, 'businesses');
    
    if (!businesses || businesses.length === 0) {
      console.log('🗺️ MARKERS: No businesses provided, returning empty array');
      return [];
    }
    
    const validMarkers: React.ReactElement[] = [];
    const selectedSet = new Set([selectedBusinessId, ...selectedBusinessIds].filter(Boolean));
    let validCount = 0;
    let invalidCount = 0;
    
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      try {
        // Validate business data
        if (!business?.id || !business.coordinates) {
          invalidCount++;
          continue;
        }
        
        // Validate coordinates
        const { lat, lng } = business.coordinates;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
          invalidCount++;
          continue;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          invalidCount++;
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
          console.error(`🗺️ MARKERS: Error creating icon for business ${i}:`, iconError);
          icon = createFallbackIcon();
        }

        if (!icon) {
          invalidCount++;
          continue;
        }

        // Throttled click handler that preserves spiderfy state
        const throttledClick = throttle((e: L.LeafletMouseEvent) => {
          try {
            e.originalEvent?.stopPropagation();
            
            // Check if this marker is part of a spiderfied cluster
            const marker = e.target;
            const isSpiderfied = marker._spiderfied || (marker.__parent && marker.__parent._spiderfied);
            
            requestAnimationFrame(() => {
              onBusinessSelect?.(business);
              
              // If this was a spiderfied marker, try to keep the spiderfy open
              if (isSpiderfied && marker.__parent) {
                setTimeout(() => {
                  try {
                    if (typeof marker.__parent.spiderfy === 'function') {
                      marker.__parent.spiderfy();
                    }
                  } catch (spiderfyError) {
                    console.log('Could not re-spiderfy after selection:', spiderfyError);
                  }
                }, 100);
              }
            });
          } catch (error) {
            console.error('Error in marker click handler:', error);
          }
        }, 150);

        // Create the marker element
        const marker = (
          <Marker
            key={`marker-${business.id}`}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: throttledClick,
            }}
          />
        );

        validMarkers.push(marker);
        validCount++;
        
      } catch (error) {
        invalidCount++;
        console.error(`🗺️ MARKERS: Error creating marker for business ${i}:`, error);
        continue;
      }
    }

    console.log(`🗺️ MARKERS: Marker creation completed`);
    console.log(`🗺️ MARKERS: Summary:`, {
      totalBusinesses: businesses.length,
      validMarkers: validCount,
      invalidBusinesses: invalidCount,
      markersReturned: validMarkers.length
    });
    
    if (validCount === 0 && businesses.length > 0) {
      console.error('🗺️ MARKERS: ❌ CRITICAL: NO VALID MARKERS CREATED despite having businesses!');
    }
    
    return validMarkers;
  }, [businesses, selectedBusinessId, selectedBusinessIds, onBusinessSelect]);

  console.log('🗺️ MAPMARKERS: About to return', markers.length, 'markers to MarkerClusterGroup');
  
  if (markers.length === 0) {
    console.log('🗺️ MAPMARKERS: No markers to render - returning empty MarkerClusterGroup');
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }
  
  return (
    <MarkerClusterGroup
      chunkedLoading={true}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      animate={false}
      animateAddingMarkers={false}
      removeOutsideVisibleBounds={true}
      disableClusteringAtZoom={17}
      maxClusterRadius={(zoom: number) => {
        // More aggressive clustering at lower zooms, less at higher zooms
        const isMobile = window.innerWidth < 768;
        const baseMultiplier = isMobile ? 0.8 : 1.0;
        
        if (zoom <= 6) return Math.round(120 * baseMultiplier);
        if (zoom <= 8) return Math.round(100 * baseMultiplier);
        if (zoom <= 10) return Math.round(80 * baseMultiplier);
        if (zoom <= 12) return Math.round(60 * baseMultiplier);
        if (zoom <= 14) return Math.round(45 * baseMultiplier);
        if (zoom <= 15) return Math.round(35 * baseMultiplier);
        if (zoom <= 16) return Math.round(25 * baseMultiplier);
        return Math.round(15 * baseMultiplier);
      }}
      spiderfyDistanceMultiplier={window.innerWidth < 768 ? 1.2 : 1.5}
      spiderfyOnEveryZoom={false}
      spiderfyShapePositions={undefined}
      zoomToBoundsOnClick={false}
      maxZoom={18}
      // Disable hover effects that cause glitches
      singleMarkerMode={false}
      // Additional options for better spiderfy behavior
      polygonOptions={{
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 2,
        opacity: 0.5,
        fillOpacity: 0.2
      }}
      clockHelpingCircleOptions={{
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.1
      }}
      eventHandlers={{
        clusterclick: (cluster: any) => {
          try {
            console.log('🗺️ CLUSTER: Click event triggered');
            
            // Get the cluster layer from the event
            const clusterLayer = cluster.layer || cluster.target;
            if (!clusterLayer) {
              console.warn('🗺️ CLUSTER: No cluster layer found');
              return false;
            }
            
            // Check if it has the required methods
            if (typeof clusterLayer.getChildCount !== 'function') {
              console.warn('🗺️ CLUSTER: Cluster layer missing getChildCount method');
              return false;
            }
            
            const map = clusterLayer._map;
            if (!map) {
              console.warn('🗺️ CLUSTER: No map found on cluster layer');
              return false;
            }
            
            const currentZoom = map.getZoom();
            const childCount = clusterLayer.getChildCount();
            const clusterLatLng = clusterLayer.getLatLng();
            
            console.log('🗺️ CLUSTER: Processing click', {
              currentZoom,
              childCount,
              clusterLatLng
            });
            
            // Prevent default behavior
            if (cluster.originalEvent) {
              cluster.originalEvent.preventDefault();
              cluster.originalEvent.stopPropagation();
            }
            
            // Improved zoom vs spiderfy logic
            if (currentZoom <= 10) {
              // At low zoom levels, always zoom in
              const targetZoom = Math.min(currentZoom + 3, 13);
              map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.8 });
            } else if (currentZoom <= 13 && childCount > 15) {
              // Medium zoom with many items, zoom in more
              const targetZoom = Math.min(currentZoom + 2, 15);
              map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.6 });
            } else if (currentZoom <= 15 && childCount > 8) {
              // Higher zoom with moderate items, zoom in slightly
              const targetZoom = Math.min(currentZoom + 1, 16);
              map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.5 });
            } else {
              // High zoom or few items, use spiderfy
              if (typeof clusterLayer.spiderfy === 'function') {
                console.log('🗺️ CLUSTER: Using spiderfy for', childCount, 'items at zoom', currentZoom);
                clusterLayer.spiderfy();
              } else {
                // Fallback: minimal zoom
                const targetZoom = Math.min(currentZoom + 1, 17);
                map.setView(clusterLatLng, targetZoom, { animate: true, duration: 0.3 });
              }
            }
            
            return false;
          } catch (error) {
            console.error('🗺️ CLUSTER: Error in cluster click handler:', error);
            return false;
          }
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
            html: `<div class="cluster-marker-stable" style="
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
              transition: none;
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
              transform: none;
              animation: none;
            ">${count}</div>`,
            className: 'cluster-icon-stable',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
          });
        } catch (error) {
          console.error('Cluster icon error:', error);
          const fallbackSize = 32;
          return L.divIcon({
            html: `<div class="cluster-marker-stable" style="
              background: #6b7280; 
              color: white; 
              border-radius: 50%; 
              width: ${fallbackSize}px; 
              height: ${fallbackSize}px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-weight: bold;
              transition: none;
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
              transform: none;
              animation: none;
            ">•</div>`,
            className: 'cluster-icon-stable',
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