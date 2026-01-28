export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  provider: string;
  category: string;
  town: string;
  province: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'contacted' | 'converted' | 'inactive';
  lastContacted?: Date;
  notes: string[];
  importedAt: Date;
  source: 'manual' | 'klerksdorp' | 'scraped' | 'api';
  metadata: Record<string, any>;
}

export type ViewMode = 'table' | 'map';

export interface FilterState {
  searchTerm: string;
  selectedTown: string;
  selectedProvider: string;
  visibleProviders: string[];
  statusFilter: string[];
}

export type ImportFieldKey =
  | 'name'
  | 'address'
  | 'phone'
  | 'email'
  | 'website'
  | 'provider'
  | 'category'
  | 'town'
  | 'province'
  | 'lat'
  | 'lng'
  | 'status'
  | 'mapsLink';

export type ImportMapping = Partial<Record<ImportFieldKey, string>>;
