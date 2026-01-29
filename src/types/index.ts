export interface BusinessMetadata {
  interest?: 'high' | 'low' | 'none' | string;
  // Enhanced contact status fields
  hasIssues?: boolean;
  isActiveOnCurrentProvider?: boolean;
  lengthWithCurrentProvider?: string; // e.g., "2 years", "6 months"
  canContact?: boolean;
  [key: string]: unknown; // Allow other properties
}

export interface NoteEntry {
  id: string;
  content: string;
  category: 'call' | 'visit' | 'follow-up' | 'general' | 'issue' | 'opportunity';
  timestamp: Date;
  template?: string; // If created from a template
}

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
  notes: string[]; // Keep for backward compatibility
  richNotes?: NoteEntry[]; // New rich notes system
  importedAt: Date;
  source: 'manual' | 'klerksdorp' | 'scraped' | 'api';
  phoneTypeOverride?: 'landline' | 'mobile';
  metadata: BusinessMetadata;
  mapsLink?: string;
}

export type ViewMode = 'table' | 'map' | 'stats' | 'settings' | 'route';

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

export interface RouteItem {
  id?: number;
  businessId: string;
  order: number;
  addedAt: Date;
}
