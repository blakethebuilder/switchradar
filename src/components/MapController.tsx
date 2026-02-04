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
  radiusKm: number;
}

export const MapController: React.FC<MapControllerProps> = ({
  targetLocation,
  zoom,
  isDropMode,
  setIsDropMode,
  setDroppedPin,
  onMapReady,
  setCurrentZoom,
  radiusKm
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
      const newPin = { lat: e.latlng.lat, lng: e.latlng.lng };
      setDroppedPin(newPin);
      setIsDropMode(false);
      
      // Focus on the pin with appropriate zoom level for the radius
      // Calculate zoom level based on radius - larger radius needs lower zoom
      // Respect zoom limits: min 5, max 18
      let targetZoom = 13; // Default zoom
      if (radiusKm <= 0.5) targetZoom = Math.min(16, 18); // Clamp to max 18
      else if (radiusKm <= 1) targetZoom = 15;
      else if (radiusKm <= 2) targetZoom = 14;
      else if (radiusKm <= 5) targetZoom = 13;
      else if (radiusKm <= 10) targetZoom = 12;
      else targetZoom = Math.max(10, 5); // Clamp to min 5
      
      // Ensure zoom is within safe limits
      targetZoom = Math.max(5, Math.min(18, targetZoom));
      
      // Smoothly pan and zoom to the pin
      map.setView([newPin.lat, newPin.lng], targetZoom, { 
        animate: true, 
        duration: 1.0 
      });
    }
  }, [isDropMode, setDroppedPin, setIsDropMode, map]);

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