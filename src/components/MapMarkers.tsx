import React, { useMemo, useCallback } from 'react';
import { Marker, CircleMarker, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Business } from '../types';
import { createProviderIcon, createFallbackIcon } from '../utils/mapIcons';
import { getProviderColor } from '../utils/providerColors';

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
  const businessCount = businesses?.length || 0;
  console.log('🗺️ MAPMARKERS: Rendering', businessCount, 'businesses');

  // PERFORMANCE: Decide whether to use Canvas-based CircleMarkers or DOM-based Markers
  // CircleMarkers are MUCH faster for large datasets as they render to a single canvas
  const useCanvasMarkers = businessCount > 500;

  // Filter valid businesses
  const validBusinesses = useMemo(() => {
    if (!businesses || businesses.length === 0) return [];

    return businesses.filter(business =>
      business?.id &&
      business.coordinates &&
      typeof business.coordinates.lat === 'number' &&
      typeof business.coordinates.lng === 'number' &&
      !isNaN(business.coordinates.lat) &&
      !isNaN(business.coordinates.lng) &&
      Math.abs(business.coordinates.lat) > 0.001 &&
      Math.abs(business.coordinates.lng) > 0.001
    );
  }, [businesses]);

  // Cluster radius configuration
  const clusterRadius = useCallback((zoom: number) => {
    if (zoom < 8) return 80;
    if (zoom < 12) return 60;
    if (zoom < 15) return 40;
    return 20;
  }, []);

  // Optimized cluster icon
  const createClusterIcon = useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    const size = count > 1000 ? 55 : count > 100 ? 45 : 35;
    const color = count > 1000 ? '#1e3a8a' : count > 100 ? '#2563eb' : '#3b82f6';

    return L.divIcon({
      html: `<div style="
        background: ${color};
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: ${size > 40 ? '14px' : '12px'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 3px solid rgba(255,255,255,0.8);
        cursor: pointer;
        transition: transform 0.2s;
      ">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: 'custom-cluster-icon'
    });
  }, []);

  const handleMarkerClick = useCallback((business: Business) => {
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }
  }, [onBusinessSelect]);

  return (
    <MarkerClusterGroup
      maxClusterRadius={clusterRadius}
      disableClusteringAtZoom={16}
      iconCreateFunction={createClusterIcon}
      chunkedLoading={true}
      removeOutsideVisibleBounds={true}
      animate={businessCount < 1000} // Disable animation for very large datasets
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {validBusinesses.map((business) => {
        const isSelected = business.id === selectedBusinessId;

        // If we use canvas markers (CircleMarker), they render to the canvas layer
        // which is much more performant for thousands of items.
        if (useCanvasMarkers && !isSelected) {
          const color = getProviderColor(business.provider || 'Unknown');

          return (
            <CircleMarker
              key={business.id}
              center={[business.coordinates.lat, business.coordinates.lng]}
              radius={isSelected ? 8 : 6}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.9,
                color: isSelected ? '#fbbf24' : 'white',
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  handleMarkerClick(business);
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={false}>
                <div className="font-bold text-xs">{business.name}</div>
              </Tooltip>
            </CircleMarker>
          );
        }

        // Standard Marker with custom icons for detail view or selected item
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