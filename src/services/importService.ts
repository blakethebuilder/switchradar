import * as XLSX from 'xlsx';
import { processImportedData, sampleData } from '../utils/dataProcessors';
import { serverDataService } from './serverData';
import type { ImportMapping } from '../types';

export class ImportService {
  static async processFile(
    file: File,
    onProgress?: (message: string) => void
  ): Promise<{ rows: Record<string, unknown>[], columns: string[] }> {
    return new Promise((resolve, reject) => {
      onProgress?.('Reading file...');
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error('File is too large. Maximum size is 50MB.'));
        return;
      }
      
      // Validate file type
      const validExtensions = ['.csv', '.xlsx', '.xls', '.json'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        reject(new Error(`Unsupported file type: ${fileExtension}. Please use CSV, Excel, or JSON files.`));
        return;
      }
      
      const reader = new FileReader();
      reader.onerror = () => {
        reject(new Error('Failed to read file. The file may be corrupted or in an unsupported format.'));
      };
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          
          if (!data) {
            reject(new Error('File appears to be empty or corrupted.'));
            return;
          }
          
          if (file.name.endsWith('.json')) {
            this.processJsonFile(data as string, resolve, reject);
          } else {
            this.processExcelFile(data as ArrayBuffer, resolve, reject, onProgress);
          }
        } catch (error) {
          reject(new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      // Read file based on type
      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private static processJsonFile(
    data: string,
    resolve: (value: { rows: Record<string, unknown>[], columns: string[] }) => void,
    reject: (reason: Error) => void
  ) {
    try {
      const json = JSON.parse(data);
      const rows = Array.isArray(json) ? json : [json];
      
      if (rows.length === 0) {
        reject(new Error('JSON file is empty or contains no data.'));
        return;
      }
      
      if (rows.length > 0 && typeof rows[0] !== 'object') {
        reject(new Error('JSON file must contain an array of objects or a single object.'));
        return;
      }
      
      const columns = Object.keys(rows[0] || {});
      resolve({ rows, columns });
    } catch (error) {
      reject(new Error('Invalid JSON file format. Please check the file structure.'));
    }
  }

  private static processExcelFile(
    data: ArrayBuffer,
    resolve: (value: { rows: Record<string, unknown>[], columns: string[] }) => void,
    reject: (reason: Error) => void,
    onProgress?: (message: string) => void
  ) {
    try {
      onProgress?.('Processing spreadsheet...');
      
      const workbook = XLSX.read(data, { type: 'array' });
      
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        reject(new Error('No sheets found in the file. Please check the Excel file.'));
        return;
      }
      
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        reject(new Error('Selected sheet is empty or corrupted.'));
        return;
      }
      
      const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
      
      if (rows.length === 0) {
        reject(new Error('The spreadsheet appears to be empty. Please check that it contains data.'));
        return;
      }
      
      const columns = Object.keys(rows[0] || {});
      if (columns.length === 0) {
        reject(new Error('No columns found in the spreadsheet. Please check the file format.'));
        return;
      }
      
      resolve({ rows, columns });
    } catch (error) {
      reject(new Error(`Failed to process spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the file format.`));
    }
  }

  static async importData(
    rows: Record<string, unknown>[],
    mapping: ImportMapping,
    token: string,
    sourceName: string,
    onProgress?: (message: string) => void,
    clearFirst = false
  ): Promise<void> {
    if (!rows || rows.length === 0) {
      throw new Error('No data to import');
    }
    
    if (!mapping.name) {
      throw new Error('Business name mapping is required');
    }
    
    onProgress?.('Processing data...');
    
    // Process data in chunks with progress updates
    const processed = await processImportedData(rows, mapping, (processed, total) => {
      const percentage = Math.round((processed / total) * 100);
      onProgress?.(`Processing data... ${percentage}% complete (${processed}/${total} records)`);
    });
    
    if (processed.length === 0) {
      throw new Error('No businesses were processed from the data. Please check your field mappings.');
    }
    
    // Validate processed data
    const validBusinesses = processed.filter(b => b.name && b.name.trim() !== '');
    
    if (validBusinesses.length === 0) {
      throw new Error('No valid businesses found. Please check that the name field is mapped correctly.');
    }
    
    onProgress?.(`Uploading ${validBusinesses.length} businesses to server...`);
    
    // Send data to server (append to existing data by default)
    const result = await serverDataService.saveBusinesses(validBusinesses, token, {
      source: sourceName,
      town: validBusinesses[0]?.town || 'Mixed',
      clearFirst // Use the clearFirst parameter
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save data to server');
    }
    
    onProgress?.(`✅ Successfully imported ${validBusinesses.length} businesses!`);
  }

  static async importSampleData(token: string): Promise<void> {
    const result = await serverDataService.saveBusinesses(sampleData, token, {
      source: 'Global Sample Dataset',
      town: 'Mixed',
      clearFirst: false // Don't clear existing data - append sample data
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to import sample data');
    }
  }
}