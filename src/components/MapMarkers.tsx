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
    businessesSample: businesses?.slice(0, 3)?.map(b => ({
      id: b.id,
      name: b.name,
      provider: b.provider,
      hasCoords: !!b.coordinates,
      coords: b.coordinates,
      coordsType: typeof b.coordinates?.lat + ',' + typeof b.coordinates?.lng
    })),
    selectedBusinessId,
    selectedBusinessIdsCount: selectedBusinessIds.length
  });

  // Memoize markers for performance
  const markers = React.useMemo(() => {
    console.log('🗺️ MARKERS: useMemo triggered - Creating markers for', businesses?.length || 0, 'businesses');
    
    if (!businesses || businesses.length === 0) {
      console.log('🗺️ MARKERS: No businesses provided, returning empty array');
      return [];
    }
    
    const validMarkers: React.ReactElement[] = [];
    const selectedSet = new Set([selectedBusinessId, ...selectedBusinessIds].filter(Boolean));
    let validCount = 0;
    let invalidCount = 0;
    let coordinateIssues = 0;
    let iconIssues = 0;
    
    console.log('🗺️ MARKERS: Starting marker creation loop...');
    
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      try {
        // Validate business data
        if (!business?.id || !business.coordinates) {
          invalidCount++;
          if (i < 5) { // Log first 5 invalid businesses
            console.log('🗺️ MARKERS: Invalid business (no id/coords)', {
              index: i,
              id: business?.id,
              hasCoords: !!business?.coordinates,
              business: business
            });
          }
          continue;
        }
        
        // More detailed coordinate validation
        const { lat, lng } = business.coordinates;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
          coordinateIssues++;
          if (coordinateIssues <= 5) { // Log first 5 coordinate issues
            console.log('🗺️ MARKERS: Invalid coordinates (type/NaN)', {
              index: i,
              id: business.id,
              name: business.name,
              lat: lat,
              lng: lng,
              latType: typeof lat,
              lngType: typeof lng,
              latIsNaN: isNaN(lat),
              lngIsNaN: isNaN(lng)
            });
          }
          continue;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          coordinateIssues++;
          if (coordinateIssues <= 5) {
            console.log('🗺️ MARKERS: Coordinates out of range', {
              index: i,
              id: business.id,
              name: business.name,
              lat: lat,
              lng: lng
            });
          }
          continue;
        }

        // Create icon with detailed error handling
        let icon;
        try {
          const isSelected = selectedSet.has(business.id);
          icon = createProviderIcon(business.provider || 'Unknown', isSelected);
          
          if (!icon) {
            console.warn('🗺️ MARKERS: createProviderIcon returned null, using fallback for business:', business.id);
            icon = createFallbackIcon();
            iconIssues++;
          }
        } catch (iconError) {
          console.error(`🗺️ MARKERS: Error creating icon for business ${business.id}:`, iconError);
          icon = createFallbackIcon();
          iconIssues++;
        }

        if (!icon) {
          invalidCount++;
          console.error('🗺️ MARKERS: No icon created for business', business.id);
          continue;
        }

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
        
        // Log first few successful markers
        if (validCount <= 5) {
          console.log(`🗺️ MARKERS: ✅ Created marker ${validCount}:`, {
            id: business.id,
            name: business.name,
            provider: business.provider,
            position: [lat, lng],
            isSelected: selectedSet.has(business.id)
          });
        }
        
        // Log progress for large datasets
        if (validCount % 500 === 0) {
          console.log(`🗺️ MARKERS: Progress - ${validCount} valid markers created so far...`);
        }
        
      } catch (error) {
        invalidCount++;
        console.error(`🗺️ MARKERS: Error creating marker for business ${business.id}:`, error);
        continue;
      }
    }

    console.log(`🗺️ MARKERS: ✅ MARKER CREATION COMPLETED`);
    console.log(`🗺️ MARKERS: Summary:`, {
      totalBusinesses: businesses.length,
      validMarkers: validCount,
      invalidBusinesses: invalidCount,
      coordinateIssues: coordinateIssues,
      iconIssues: iconIssues,
      markersReturned: validMarkers.length
    });
    
    if (validCount === 0 && businesses.length > 0) {
      console.error('🗺️ MARKERS: ❌ CRITICAL: NO VALID MARKERS CREATED despite having businesses!');
      console.log('🗺️ MARKERS: First 3 businesses for debugging:', businesses.slice(0, 3).map(b => ({
        id: b.id,
        name: b.name,
        coordinates: b.coordinates,
        provider: b.provider
      })));
    }
    
    return validMarkers;
  }, [businesses, selectedBusinessId, selectedBusinessIds, onBusinessSelect]);

  console.log('🗺️ MAPMARKERS: About to return', markers.length, 'markers to MarkerClusterGroup');
  
  if (markers.length === 0) {
    console.log('🗺️ MAPMARKERS: ❌ NO MARKERS TO RENDER - returning empty MarkerClusterGroup');
    return <MarkerClusterGroup>{[]}</MarkerClusterGroup>;
  }
  
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