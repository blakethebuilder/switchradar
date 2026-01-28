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

export const processImportedData = (
  rows: Record<string, unknown>[],
  mapping?: ImportMapping
): Business[] => {
  const now = Date.now();
  return rows.map((row, index) => {
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
};

export const filterBusinesses = (
  businesses: Business[],
  filters: {
    searchTerm: string;
    selectedCategory: string;
    visibleProviders: string[];
    phoneType?: 'all' | 'landline' | 'mobile';
  }
): Business[] => {
  return businesses.filter(biz => {
    const matchesSearch = filters.searchTerm === '' ||
      biz.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      biz.address.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      biz.provider.toLowerCase().includes(filters.searchTerm.toLowerCase());

    const matchesCategory = filters.selectedCategory === '' || biz.category === filters.selectedCategory;
    const matchesProvider = filters.visibleProviders.length === 0 || filters.visibleProviders.includes(biz.provider);

    const isMobile = biz.phoneTypeOverride
      ? biz.phoneTypeOverride === 'mobile'
      : isMobileProvider(biz.provider);

    const matchesPhoneType = !filters.phoneType || filters.phoneType === 'all' ||
      (filters.phoneType === 'landline' && !isMobile) ||
      (filters.phoneType === 'mobile' && isMobile);

    return matchesSearch && matchesCategory && matchesProvider && matchesPhoneType;
  });
};
