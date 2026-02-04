import { useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import type { Business } from '../types';

interface MapControllerProps {
  targetLocation?: [number, number];
  zoom?: number;
  businesses: Business[];
  isDropMode: boolean;
  setIsDropMode: (mode: boolean) => void;
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void;
  onMapReady?: (map: L.Map) => void;
  currentZoom: number;
  setCurrentZoom: (zoom: number) => void;
}

export const MapController: React.FC<MapControllerProps> = ({
  targetLocation,
  zoom,
  isDropMode,
  setIsDropMode,
  setDroppedPin,
  onMapReady,
  setCurrentZoom
}) => {
  const map = useMap();

  // Notify parent component when map is ready
  useEffect(() => {
    if (map && onMapReady) {
      try {
        onMapReady(map);
        setCurrentZoom(map.getZoom());
        
        // Add zoom event listener
        map.on('zoomend', () => {
          setCurrentZoom(map.getZoom());
        });
      } catch (error) {
        console.error('Error in map ready callback:', error);
      }
    }
  }, [map, onMapReady, setCurrentZoom]);

  // Handle view changes
  useEffect(() => {
    if (targetLocation && !isDropMode) {
      map.setView(targetLocation, zoom || map.getZoom(), { animate: true });
    }
  }, [targetLocation, zoom, map, isDropMode]);

  // Handle map click for pin dropping
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (isDropMode) {
      setDroppedPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsDropMode(false);
    }
  }, [isDropMode, setDroppedPin, setIsDropMode]);

  // Set up event listeners
  useEffect(() => {
    if (isDropMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
    }
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDropMode, handleMapClick, map]);

  return null; // This component doesn't render anything
};