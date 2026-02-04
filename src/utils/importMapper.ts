import type { Business } from '../types';

// Global window type extension
declare global {
  interface Window {
    __coordTestRun?: boolean;
  }
}

const findCoordinatesFromUrl = (url: string, index: number = 0) => {
  // Only log for first few URLs to avoid performance issues
  if (index < 5) {
    console.log('🗺️ COORDS: Extracting coordinates from URL:', url);
  }
  
  // Pattern 1: @-26.8521,26.6667
  const match1 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match1) {
    const coords = { lat: Number(match1[1]), lng: Number(match1[2]) };
    if (index < 5) {
      console.log('🗺️ COORDS: Pattern 1 match (@lat,lng):', coords);
    }
    return coords;
  }

  // Pattern 2: !3d-26.85007!4d26.67659 (also handles 3d and 4d independently)
  const match2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match2) {
    const coords = { lat: Number(match2[1]), lng: Number(match2[2]) };
    if (index < 5) {
      console.log('🗺️ COORDS: Pattern 2 match (!3d!4d):', coords);
    }
    return coords;
  }

  // Pattern 3: q=-26.8521,26.6667 or ll=-26.8521,26.6667
  const match3 = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match3) {
    const coords = { lat: Number(match3[1]), lng: Number(match3[2]) };
    if (index < 5) {
      console.log('🗺️ COORDS: Pattern 3 match (q= or ll=):', coords);
    }
    return coords;
  }

  // Pattern 4: General comma separated extraction (fallback)
  // Looks for "number,number" where numbers are float-like coordinates
  const match4 = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  // Basic validation to ensure they look like coords (e.g. lat -90 to 90)
  if (match4) {
    const lat = Number(match4[1]);
    const lng = Number(match4[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const coords = { lat, lng };
      if (index < 5) {
        console.log('🗺️ COORDS: Pattern 4 match (general):', coords);
      }
      return coords;
    }
  }

  if (index < 5) {
    console.log('🗺️ COORDS: ❌ No coordinate patterns matched for URL:', url);
  }
  return null;
};

// Test the coordinate extraction with a real URL - only run once
if (typeof window !== 'undefined' && !window.__coordTestRun) {
  window.__coordTestRun = true;
  const testUrl = "https://www.google.com/maps/place/Greyhorn+Engineering+Consultants+%28Pty%29+Ltd/data=!4m7!3m6!1s0x1e96f13e5c9b2015:0x3bf0e8f5d6ca8169!8m2!3d-26.8490145!4d26.6749577!16s%2Fg%2F11f102gv1j!19sChIJFSCbXD7xlh4RaYHK1vXo8Ds?authuser=0&hl=en&rclk=1";
  console.log('🧪 TESTING coordinate extraction with real URL...');
  const testResult = findCoordinatesFromUrl(testUrl, 0);
  console.log('🧪 TEST RESULT:', testResult);
}

export const deriveCoordinates = (row: Record<string, unknown>, fallback: { lat: number; lng: number }, index: number = 0) => {
  // Only log for first few businesses to avoid performance issues
  if (index < 5) {
    console.log('🗺️ DERIVE: Starting coordinate derivation for row', index, ':', {
      maps_link: row.maps_link,
      maps_address: row.maps_address,
      maps_url: row.maps_url,
      google_maps_url: row.google_maps_url,
      map_link: row.map_link
    });
  }
  
  const possibleUrl = row.maps_link || row.maps_address || row.maps_url || row.google_maps_url || row.map_link;
  if (typeof possibleUrl === 'string' && possibleUrl.trim() !== '') {
    if (index < 5) {
      console.log('🗺️ DERIVE: Found URL to process:', possibleUrl);
    }
    const coords = findCoordinatesFromUrl(possibleUrl, index);
    if (coords) {
      if (index < 5) {
        console.log('🗺️ DERIVE: ✅ Successfully extracted coordinates:', coords);
      }
      return coords;
    } else if (index < 5) {
      console.log('🗺️ DERIVE: ❌ Failed to extract coordinates, using fallback:', fallback);
    }
  } else if (index < 5) {
    console.log('🗺️ DERIVE: ❌ No valid URL found, using fallback:', fallback);
  }
  return fallback;
};

export const normalizeProvider = (provider: string) => {
  return provider.replace(/\.+$/, '').trim();
};

export const mapRowToBusiness = (
  row: Record<string, unknown>,
  index: number,
  defaults: { lat: number; lng: number }
): Business => {
  const provider = normalizeProvider(String(row.provider || row.network || 'Unknown'));
  const coordinates = deriveCoordinates(row, defaults);

  return {
    id: `import-${Date.now()}-${index}`,
    name: String(row.name || row['Customer Name'] || `Business ${index + 1}`),
    address: String(row.address || row.maps_address || ''),
    phone: String(row.phone || row.telephone || ''),
    email: row.email ? String(row.email) : undefined,
    website: row.website ? String(row.website) : undefined,
    provider,
    category: String(row.category || row.type_of_business || 'General'),
    town: String(row.town || 'Unknown'),
    province: String(row.province || 'North West'),
    coordinates,
    status: 'active',
    notes: [],
    importedAt: new Date(),
    source: 'scraped',
    metadata: row
  };
};
