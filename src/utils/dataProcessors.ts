import type { Business, ImportMapping } from '../types';
import { deriveCoordinates, normalizeProvider } from './importMapper';
import { isMobileProvider } from './phoneUtils';

const DEFAULT_COORDINATES = { lat: -26.8521, lng: 26.6667 };

export const sampleData: Business[] = [
  {
    id: '1',
    name: 'ABC Accounting',
    address: '123 Main St, Klerksdorp',
    phone: '+27 11 123 4567',
    email: 'info@abcaccounting.co.za',
    provider: 'Vodacom',
    category: 'Accounting',
    town: 'Klerksdorp',
    province: 'North West',
    coordinates: { lat: -26.8521, lng: 26.6667 },
    status: 'active',
    notes: [],
    importedAt: new Date(),
    source: 'manual',
    metadata: {}
  },
  {
    id: '2',
    name: 'XYZ Manufacturing',
    address: '456 Industry Rd, Klerksdorp',
    phone: '+27 11 987 6543',
    provider: 'MTN',
    category: 'Manufacturing',
    town: 'Klerksdorp',
    province: 'North West',
    coordinates: { lat: -26.8621, lng: 26.6767 },
    status: 'active',
    notes: [],
    importedAt: new Date(),
    source: 'manual',
    metadata: {}
  },
  {
    id: '3',
    name: 'Tech Solutions Inc',
    address: '789 Innovation Ave, Klerksdorp',
    phone: '+27 11 555 1234',
    email: 'contact@techsolutions.co.za',
    provider: 'Telkom',
    category: 'Technology',
    town: 'Klerksdorp',
    province: 'North West',
    coordinates: { lat: -26.8421, lng: 26.6567 },
    status: 'active',
    notes: [],
    importedAt: new Date(),
    source: 'manual',
    metadata: {}
  },
  {
    id: '4',
    name: 'Premium Cellular',
    address: '101 Telecom St, Klerksdorp',
    phone: '+27 11 222 3333',
    provider: 'Cell C',
    category: 'Retail',
    town: 'Klerksdorp',
    province: 'North West',
    coordinates: { lat: -26.8471, lng: 26.6617 },
    status: 'active',
    notes: [],
    importedAt: new Date(),
    source: 'manual',
    metadata: {}
  }
];

const getValue = (row: Record<string, unknown>, key?: string) => {
  if (!key) {
    return undefined;
  }
  const value = row[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : value;
};

const normalizeStatus = (value: unknown) => {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';
  if (raw === 'contacted' || raw === 'converted' || raw === 'inactive') {
    return raw as Business['status'];
  }
  return 'active';
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    if (cleaned === '') return undefined;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const buildCoordinates = (row: Record<string, unknown>, mapping: ImportMapping) => {
  const latValue = getValue(row, mapping.lat);
  const lngValue = getValue(row, mapping.lng);

  const lat = toNumber(latValue);
  const lng = toNumber(lngValue);

  if (lat !== undefined && lng !== undefined) {
    return { lat, lng };
  }

  const mapsLinkValue = getValue(row, mapping.mapsLink);
  if (typeof mapsLinkValue === 'string' && mapsLinkValue.trim() !== '') {
    const coords = deriveCoordinates({ maps_link: mapsLinkValue }, DEFAULT_COORDINATES);
    if (coords !== DEFAULT_COORDINATES) {
      return coords;
    }
  }

  return DEFAULT_COORDINATES;
};

export const processImportedData = async (
  rows: Record<string, unknown>[],
  mapping?: ImportMapping,
  onProgress?: (processed: number, total: number) => void
): Promise<Business[]> => {
  const now = Date.now();
  const results: Business[] = [];
  const chunkSize = 100; // Process in chunks to avoid blocking UI
  
  console.log('🚀 Processing', rows.length, 'rows in chunks of', chunkSize);
  
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    
    // Process chunk
    const chunkResults = chunk.map((row, chunkIndex) => {
      const index = i + chunkIndex;
      const resolvedMapping = mapping ?? {};
      const name = getValue(row, resolvedMapping.name) ?? `Business ${index + 1}`;
      const town = getValue(row, resolvedMapping.town) ?? 'Unknown';
      const provider = getValue(row, resolvedMapping.provider) ?? 'Unknown';

      return {
        id: `import-${now}-${index}`,
        name: String(name),
        address: String(getValue(row, resolvedMapping.address) ?? ''),
        phone: String(getValue(row, resolvedMapping.phone) ?? ''),
        email: getValue(row, resolvedMapping.email)
          ? String(getValue(row, resolvedMapping.email))
          : undefined,
        website: getValue(row, resolvedMapping.website)
          ? String(getValue(row, resolvedMapping.website))
          : undefined,
        provider: normalizeProvider(String(provider)),
        category: String(getValue(row, resolvedMapping.category) ?? 'General'),
        town: String(town),
        province: String(getValue(row, resolvedMapping.province) ?? ''),
        coordinates: buildCoordinates(row, resolvedMapping),
        status: normalizeStatus(getValue(row, resolvedMapping.status)),
        notes: [],
        importedAt: new Date(),
        source: 'scraped',
        metadata: row,
        mapsLink: resolvedMapping.mapsLink ? String(getValue(row, resolvedMapping.mapsLink) ?? '') : undefined
      };
    });
    
    results.push(...chunkResults);
    
    // Report progress
    if (onProgress) {
      onProgress(results.length, rows.length);
    }
    
    // Yield control to prevent UI blocking
    if (i + chunkSize < rows.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  console.log('✅ Processed', results.length, 'businesses');
  return results;
};


const toRad = (value: number) => (value * Math.PI) / 180;
const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * @returns Distance in kilometers.
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

// Performance optimizations for large datasets
const searchCache = new Map<string, Business[]>();
const filterCache = new Map<string, Business[]>();

// Optimized search with caching and early exit
const optimizedSearch = (businesses: Business[], searchTerm: string): Business[] => {
  if (!searchTerm) return businesses;
  
  const cacheKey = searchTerm.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  const lowerSearchTerm = cacheKey;
  const results = businesses.filter(biz => {
    // Early exit optimizations - check most likely matches first
    return biz.name.toLowerCase().includes(lowerSearchTerm) ||
           biz.provider.toLowerCase().includes(lowerSearchTerm) ||
           biz.address.toLowerCase().includes(lowerSearchTerm);
  });
  
  // Cache results but limit cache size
  if (searchCache.size > 50) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) {
      searchCache.delete(firstKey);
    }
  }
  searchCache.set(cacheKey, results);
  
  return results;
};

// Optimized filtering with early exits and reduced calculations
export const filterBusinesses = (
  businesses: Business[],
  filters: {
    searchTerm: string;
    selectedCategory: string;
    visibleProviders: string[];
    phoneType?: 'all' | 'landline' | 'mobile';
    droppedPin?: { lat: number, lng: number };
    radiusKm?: number;
  }
): Business[] => {
  // Create cache key for this filter combination
  const cacheKey = JSON.stringify(filters);
  if (filterCache.has(cacheKey)) {
    return filterCache.get(cacheKey)!;
  }

  const { droppedPin, radiusKm, searchTerm, selectedCategory, visibleProviders, phoneType } = filters;
  
  // Early exit if no providers selected
  if (visibleProviders.length === 0) {
    return [];
  }
  
  // Start with search filtering (most selective usually)
  let filtered = searchTerm ? optimizedSearch(businesses, searchTerm) : businesses;
  
  // Apply other filters in order of selectivity
  if (selectedCategory) {
    filtered = filtered.filter(biz => biz.category === selectedCategory);
  }
  
  // Provider filtering with Set for O(1) lookup
  const providerSet = new Set(visibleProviders);
  filtered = filtered.filter(biz => providerSet.has(biz.provider));
  
  // Phone type filtering
  if (phoneType && phoneType !== 'all') {
    filtered = filtered.filter(biz => {
      const isMobile = biz.phoneTypeOverride
        ? biz.phoneTypeOverride === 'mobile'
        : isMobileProvider(biz.provider);
      return phoneType === 'mobile' ? isMobile : !isMobile;
    });
  }
  
  // Distance filtering (most expensive, do last)
  if (droppedPin && radiusKm && filtered.length > 0) {
    filtered = filtered.filter(biz => {
      if (!biz.coordinates) return false;
      return getDistance(
        droppedPin.lat,
        droppedPin.lng,
        biz.coordinates.lat,
        biz.coordinates.lng
      ) <= radiusKm;
    });
  }
  
  // Cache results but limit cache size
  if (filterCache.size > 20) {
    const firstKey = filterCache.keys().next().value;
    if (firstKey) {
      filterCache.delete(firstKey);
    }
  }
  filterCache.set(cacheKey, filtered);
  
  return filtered;
};

// Clear caches when data changes
export const clearFilterCaches = () => {
  searchCache.clear();
  filterCache.clear();
};
