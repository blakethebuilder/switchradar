import L from 'leaflet';
import { getProviderColor } from './providerColors';

// Simple fallback icon
export const createFallbackIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'simple-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #6b7280;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Simple provider label - first 3 letters of provider name
const getProviderLabel = (provider: string): string => {
  if (!provider) return '?';
  return provider.trim().slice(0, 3).toUpperCase();
};

// Simple, robust provider icon
export const createProviderIcon = (provider: string, isSelected: boolean = false): L.DivIcon => {
  const safeProvider = provider || 'Unknown';
  const color = getProviderColor(safeProvider) || '#6b7280';
  const label = getProviderLabel(safeProvider);
  const size = isSelected ? 28 : 24;
  
  return L.divIcon({
    className: 'simple-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid ${isSelected ? '#fbbf24' : 'white'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
      cursor: pointer;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

// Dropped pin icon
export const DroppedPinIcon = L.divIcon({
  className: 'dropped-pin',
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #ef4444;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});