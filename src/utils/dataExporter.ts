import type { Business } from '../types';

export interface ExportFilter {
  hasIssues?: boolean;
  hasNotes?: boolean;
  hasRichNotes?: boolean;
  interestLevel?: 'high' | 'low' | 'none';
  status?: string[];
  canContact?: boolean;
  hasChangedProvider?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeNotes: boolean;
  includeRichNotes: boolean;
  includeMetadata: boolean;
}

/**
 * Filter businesses based on export criteria
 */
export function filterBusinessesForExport(businesses: Business[], filter: ExportFilter): Business[] {
  return businesses.filter(business => {
    // Filter by issues
    if (filter.hasIssues !== undefined && business.metadata?.hasIssues !== filter.hasIssues) {
      return false;
    }

    // Filter by notes existence
    if (filter.hasNotes && (!business.notes || business.notes.length === 0 || !business.notes.some(note => note.trim()))) {
      return false;
    }

    // Filter by rich notes existence
    if (filter.hasRichNotes && (!business.richNotes || business.richNotes.length === 0)) {
      return false;
    }

    // Filter by interest level
    if (filter.interestLevel && business.metadata?.interest !== filter.interestLevel) {
      return false;
    }

    // Filter by status
    if (filter.status && filter.status.length > 0 && !filter.status.includes(business.status)) {
      return false;
    }

    // Filter by contact permission
    if (filter.canContact !== undefined && business.metadata?.canContact !== filter.canContact) {
      return false;
    }

    // Filter by provider change
    if (filter.hasChangedProvider !== undefined && business.metadata?.hasChangedProvider !== filter.hasChangedProvider) {
      return false;
    }

    return true;
  });
}

/**
 * Convert businesses to CSV format
 */
export function businessesToCSV(businesses: Business[], options: ExportOptions): string {
  const headers = [
    'Name',
    'Address',
    'Town',
    'Province',
    'Phone',
    'Email',
    'Website',
    'Provider',
    'Category',
    'Status',
    'Last Contacted',
    'Maps Link'
  ];

  if (options.includeMetadata) {
    headers.push(
      'Has Issues',
      'Active on Current Provider',
      'Changed Provider',
      'Length with Current Provider',
      'Can Contact',
      'Interest Level'
    );
  }

  if (options.includeNotes) {
    headers.push('Legacy Notes');
  }

  if (options.includeRichNotes) {
    headers.push('Rich Notes Count', 'Latest Rich Note', 'Rich Notes Summary');
  }

  const csvRows = [headers.join(',')];

  businesses.forEach(business => {
    const row = [
      escapeCSV(business.name),
      escapeCSV(business.address),
      escapeCSV(business.town),
      escapeCSV(business.province),
      escapeCSV(business.phone),
      escapeCSV(business.email || ''),
      escapeCSV(business.website || ''),
      escapeCSV(business.provider),
      escapeCSV(business.category),
      escapeCSV(business.status),
      business.lastContacted ? new Date(business.lastContacted).toLocaleDateString() : '',
      escapeCSV(business.mapsLink || '')
    ];

    if (options.includeMetadata) {
      row.push(
        business.metadata?.hasIssues ? 'Yes' : 'No',
        business.metadata?.isActiveOnCurrentProvider ? 'Yes' : business.metadata?.isActiveOnCurrentProvider === false ? 'No' : '',
        business.metadata?.hasChangedProvider ? 'Yes' : business.metadata?.hasChangedProvider === false ? 'No' : '',
        escapeCSV(business.metadata?.lengthWithCurrentProvider || ''),
        business.metadata?.canContact ? 'Yes' : business.metadata?.canContact === false ? 'No' : '',
        escapeCSV(business.metadata?.interest || '')
      );
    }

    if (options.includeNotes) {
      row.push(escapeCSV(business.notes.join('; ')));
    }

    if (options.includeRichNotes) {
      const richNotes = business.richNotes || [];
      const latestNote = richNotes.length > 0 ? richNotes[richNotes.length - 1] : null;
      const notesSummary = richNotes.map(note => `[${note.category.toUpperCase()}] ${note.content}`).join('; ');
      
      row.push(
        richNotes.length.toString(),
        latestNote ? `${latestNote.category}: ${latestNote.content}` : '',
        escapeCSV(notesSummary)
      );
    }

    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download data as file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export businesses with filters
 */
export function exportBusinesses(
  businesses: Business[], 
  filter: ExportFilter, 
  options: ExportOptions,
  filename?: string
): void {
  const filteredBusinesses = filterBusinessesForExport(businesses, filter);
  
  if (filteredBusinesses.length === 0) {
    alert('No businesses match the export criteria.');
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = filename || `switchradar-export-${timestamp}`;

  if (options.format === 'csv') {
    const csvContent = businessesToCSV(filteredBusinesses, options);
    downloadFile(csvContent, `${defaultFilename}.csv`, 'text/csv');
  } else {
    // For now, we'll export as CSV even for xlsx requests
    // In the future, we could add a library like xlsx to generate actual Excel files
    const csvContent = businessesToCSV(filteredBusinesses, options);
    downloadFile(csvContent, `${defaultFilename}.csv`, 'text/csv');
  }
}

/**
 * Get export summary for preview
 */
export function getExportSummary(businesses: Business[], filter: ExportFilter): {
  totalCount: number;
  filteredCount: number;
  hasIssuesCount: number;
  hasNotesCount: number;
  highInterestCount: number;
} {
  const filtered = filterBusinessesForExport(businesses, filter);
  
  return {
    totalCount: businesses.length,
    filteredCount: filtered.length,
    hasIssuesCount: filtered.filter(b => b.metadata?.hasIssues === true).length,
    hasNotesCount: filtered.filter(b => 
      (b.notes && b.notes.some(note => note.trim())) || 
      (b.richNotes && b.richNotes.length > 0)
    ).length,
    highInterestCount: filtered.filter(b => b.metadata?.interest === 'high').length
  };
}