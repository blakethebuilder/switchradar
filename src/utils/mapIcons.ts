import L from 'leaflet';
import { getProviderColor } from './providerColors';

// Icon cache for performance
const iconCache: Record<string, L.DivIcon> = {};

// Simple fallback icon that should never fail
export const createFallbackIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'fallback-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #6b7280;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">?</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const getProviderLabel = (provider: string): string => {
  try {
    if (!provider || typeof provider !== 'string') return '?';
    const trimmed = provider.trim();
    if (!trimmed) return '?';
    const words = trimmed.split(' ').filter(Boolean);
    if (words.length === 1) return trimmed.slice(0, 3).toUpperCase();
    return words.map(word => word[0]).join('').slice(0, 3).toUpperCase();
  } catch (error) {
    console.error('Error in getProviderLabel:', error);
    return '?';
  }
};

export const createProviderIcon = (provider: string, isSelected: boolean = false): L.DivIcon => {
  try {
    // Always ensure we have a valid provider string
    const safeProvider = (provider && typeof provider === 'string') ? provider.trim() : 'Unknown';
    if (!safeProvider) {
      return createFallbackIcon();
    }

    const cacheKey = `${safeProvider}-${isSelected}`;
    
    // Check cache first
    if (iconCache[cacheKey]) {
      return iconCache[cacheKey];
    }

    // Get color and label with fallbacks
    let color: string;
    let label: string;
    
    try {
      color = getProviderColor(safeProvider);
      if (!color || typeof color !== 'string') {
        color = '#6b7280'; // Default gray
      }
    } catch (error) {
      console.error('Error getting provider color:', error);
      color = '#6b7280';
    }

    try {
      label = getProviderLabel(safeProvider);
      if (!label || typeof label !== 'string') {
        label = '?';
      }
    } catch (error) {
      console.error('Error getting provider label:', error);
      label = '?';
    }
    
    const size = isSelected ? 32 : 24;
    const borderWidth = isSelected ? 3 : 2;
    const fontSize = isSelected ? '10px' : '8px';
    
    // Create the icon with maximum safety
    const iconOptions = {
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${isSelected ? '#fbbf24' : 'white'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize};
        cursor: pointer;
      ">${label}</div>`,
      iconSize: [size, size] as [number, number],
      iconAnchor: [size/2, size/2] as [number, number],
    };

    const icon = L.divIcon(iconOptions);
    
    // Verify the icon was created successfully
    if (!icon) {
      console.error('L.divIcon returned null/undefined');
      return createFallbackIcon();
    }

    // Cache the successful icon
    iconCache[cacheKey] = icon;
    return icon;
    
  } catch (error) {
    console.error('Critical error in createProviderIcon:', error, { provider, isSelected });
    // Always return a fallback icon, never null
    return createFallbackIcon();
  }
};

// Custom icon for the dropped pin
export const DroppedPinIcon = L.divIcon({
  className: 'dropped-pin-marker',
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: #ef4444;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  "><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Clear icon cache when needed
export const clearIconCache = (): void => {
  Object.keys(iconCache).forEach(key => delete iconCache[key]);
};