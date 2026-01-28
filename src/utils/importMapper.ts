import type { Business } from '../types';

const findCoordinatesFromUrl = (url: string) => {
  // Pattern 1: @-26.8521,26.6667
  const match1 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match1) return { lat: Number(match1[1]), lng: Number(match1[2]) };

  // Pattern 2: !3d-26.85007!4d26.67659 (also handles 3d and 4d independently)
  const match2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match2) return { lat: Number(match2[1]), lng: Number(match2[2]) };

  // Pattern 3: q=-26.8521,26.6667 or ll=-26.8521,26.6667
  const match3 = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match3) return { lat: Number(match3[1]), lng: Number(match3[2]) };

  // Pattern 4: General comma separated extraction (fallback)
  // Looks for "number,number" where numbers are float-like coordinates
  const match4 = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  // Basic validation to ensure they look like coords (e.g. lat -90 to 90)
  if (match4) {
    const lat = Number(match4[1]);
    const lng = Number(match4[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
};

export const deriveCoordinates = (row: Record<string, any>, fallback: { lat: number; lng: number }) => {
  const possibleUrl = row.maps_link || row.maps_address || row.maps_url || row.google_maps_url || row.map_link;
  if (typeof possibleUrl === 'string') {
    const coords = findCoordinatesFromUrl(possibleUrl);
    if (coords) {
      return coords;
    }
  }
  return fallback;
};

export const normalizeProvider = (provider: string) => {
  return provider.replace(/\.+$/, '').trim();
};

export const mapRowToBusiness = (
  row: Record<string, any>,
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
