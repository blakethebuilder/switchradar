import React, { useMemo, useCallback } from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Business } from '../types';
import { createProviderIcon, createFallbackIcon } from '../utils/mapIcons';

interface MapMarkersProps {
  businesses: Business[];
  selectedBusinessId?: string;
  onBusinessSelect?: (business: Business) => void;
}

export const MapMarkers: React.FC<MapMarkersProps> = React.memo((props) => {
  const { businesses, selectedBusinessId, onBusinessSelect } = props;
  const businessCount = businesses?.length || 0;
  console.log('🗺️ MAPMARKERS: Rendering', businessCount, 'businesses');

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

  // Cluster radius configuration - Adjusted for better mobile/tablet experience
  const clusterRadius = useCallback((zoom: number) => {
    // Smaller radius at high zoom to prevent icons overlapping too much
    // Larger radius at low zoom to keep map clean
    if (zoom < 8) return 100;
    if (zoom < 12) return 80;
    if (zoom < 14) return 60;
    if (zoom < 16) return 40;
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
      disableClusteringAtZoom={17} // Reverted for performance: Keep clustering active longer
      iconCreateFunction={createClusterIcon}
      chunkedLoading={true}
      removeOutsideVisibleBounds={true}
      animate={businessCount < 1000} // Reduce animation threshold to prioritise performance
      spiderfyOnMaxZoom={true}
      spiderfyDistanceMultiplier={1} // Reduced spreading distance for manageability
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {validBusinesses.map((business) => {
        const isSelected = business.id === selectedBusinessId;

        // Forced use of DOM Markers with labels (3 letters)
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
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => handleMarkerClick(business)
            }}
          />
        );
      })}
    </MarkerClusterGroup>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these specific values change
  return (
    prevProps.businesses.length === nextProps.businesses.length &&
    prevProps.selectedBusinessId === nextProps.selectedBusinessId &&
    prevProps.onBusinessSelect === nextProps.onBusinessSelect
  );
});