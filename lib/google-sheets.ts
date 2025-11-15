import { google } from 'googleapis';
import { CampaignElement } from '@/app/types/Campaign';

class GoogleSheetsService {
  private auth: string | null = null;
  private sheets: any = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Use API key for public sheets
      this.auth = process.env.GOOGLE_SHEETS_API_KEY || '';
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized with API key');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  extractSheetIdFromUrl(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  async readSheet(sheetUrl: string, sheetName = 'Sheet1') {
    await this.initialize();
    
    const sheetId = this.extractSheetIdFromUrl(sheetUrl);
    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL');
    }

    try {
      const range = `${sheetName}!A:Z`; // Read all columns
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      return {
        values: response.data.values || []
      };
    } catch (error: any) {
      console.error('Error reading Google Sheet:', error.message);
      throw new Error(`Unable to access Google Sheet: ${error.message}`);
    }
  }

  detectKeyValueFormat(values: string[][]): boolean {
    // Check if we have "Key" and "Value" headers in the first few rows
    for (let i = 0; i < Math.min(5, values.length); i++) {
      const row = values[i];
      if (row && row.length >= 2) {
        const col1 = (row[0] || '').toString().toLowerCase().trim();
        const col2 = (row[1] || '').toString().toLowerCase().trim();
        
        if ((col1 === 'key' && col2 === 'value') || 
            (col1.includes('key') && col2.includes('value'))) {
          return true;
        }
      }
    }
    return false;
  }

  parseKeyValueFormat(values: string[][]): { fields: any[], data: any[], rowCount: number } {
    console.log('Parsing key-value format');
    
    // Find the header row (contains "Key" and "Value")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, values.length); i++) {
      const row = values[i];
      if (row && row.length >= 2) {
        const col1 = (row[0] || '').toString().toLowerCase().trim();
        const col2 = (row[1] || '').toString().toLowerCase().trim();
        
        if ((col1 === 'key' && col2 === 'value') || 
            (col1.includes('key') && col2.includes('value'))) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find Key-Value header row');
    }

    // Extract key-value pairs from rows after the header
    const dataRows = values.slice(headerRowIndex + 1);
    const fields: any[] = [];
    const singleRowData: any = {};

    dataRows.forEach(row => {
      if (row && row.length >= 2) {
        const key = (row[0] || '').toString().trim();
        const value = (row[1] || '').toString().trim();
        
        if (key) {
          // Determine field type
          let fieldType = 'string';
          if (key.toLowerCase().includes('budget') || 
              key.toLowerCase().includes('cost') ||
              key.toLowerCase().includes('price') ||
              key.toLowerCase().includes('id')) {
            fieldType = 'number';
          } else if (key.toLowerCase().includes('date')) {
            fieldType = 'date';
          } else if (key.toLowerCase().includes('zip') ||
                    key.toLowerCase().includes('target') ||
                    key.toLowerCase().includes('audience')) {
            fieldType = 'array';
          }

          fields.push({
            name: key,
            type: fieldType,
            required: true
          });

          // Parse the value based on type
          if (fieldType === 'number') {
            singleRowData[key] = parseFloat(value.replace(/[,$]/g, '')) || 0;
          } else if (fieldType === 'array') {
            singleRowData[key] = value.split(',').map(v => v.trim()).filter(v => v);
          } else {
            singleRowData[key] = value;
          }
        }
      }
    });

    return {
      fields,
      data: [singleRowData], // Single row of data with all the key-value pairs
      rowCount: 1
    };
  }

  parseColumnFormat(values: string[][]): { fields: any[], data: any[], rowCount: number } {
    const headers = values[0];
    const rows = values.slice(1);

    // Create header-to-index mapping for valid (non-empty) headers
    const validHeaders: string[] = [];
    const headerIndexMap: { [key: string]: number } = {};
    
    headers.forEach((header, index) => {
      const fieldName = header ? header.trim() : '';
      if (fieldName) {
        validHeaders.push(fieldName);
        headerIndexMap[fieldName] = index;
      }
    });

    // Detect field types and create field definitions
    const fields = validHeaders.map(fieldName => {
      let fieldType = 'string';
      let required = true;

      // Determine field type based on name patterns
      if (fieldName.toLowerCase().includes('budget') || 
          fieldName.toLowerCase().includes('cost') ||
          fieldName.toLowerCase().includes('price')) {
        fieldType = 'number';
      } else if (fieldName.toLowerCase().includes('date')) {
        fieldType = 'date';
      } else if (fieldName.toLowerCase().includes('zip') ||
                fieldName.toLowerCase().includes('target') ||
                fieldName.toLowerCase().includes('audience')) {
        fieldType = 'array';
      }

      return {
        name: fieldName,
        type: fieldType,
        required: required
      };
    });

    // Parse data rows using the valid headers and their correct indices
    const parsedRows = rows.map(row => {
      const rowData: any = {};
      
      fields.forEach(field => {
        const headerIndex = headerIndexMap[field.name];
        const value = row[headerIndex] || '';
        
        if (field.type === 'number') {
          rowData[field.name] = parseFloat(value.replace(/[,$]/g, '')) || 0;
        } else if (field.type === 'array') {
          rowData[field.name] = value.split(',').map(v => v.trim()).filter(v => v);
        } else {
          rowData[field.name] = value;
        }
      });
      
      return rowData;
    });

    return {
      fields,
      data: parsedRows,
      rowCount: rows.length
    };
  }

  parseMediaPlanData(sheetData: { values: string[][] }) {
    if (!sheetData.values || sheetData.values.length < 2) {
      throw new Error('Invalid sheet data - no headers or data rows found');
    }

    console.log('Raw sheet data structure:', {
      totalRows: sheetData.values.length,
      firstRow: sheetData.values[0],
      secondRow: sheetData.values[1],
      thirdRow: sheetData.values[2]
    });

    // Check if this is a key-value format (rows instead of columns)
    const isKeyValueFormat = this.detectKeyValueFormat(sheetData.values);
    
    if (isKeyValueFormat) {
      console.log('Detected key-value format (rows instead of columns)');
      return this.parseKeyValueFormat(sheetData.values);
    } else {
      console.log('Using standard column-based format');
      return this.parseColumnFormat(sheetData.values);
    }
  }

  convertToCampaignElements(parsedData: { fields: any[], data: any[] }): CampaignElement[] {
    const elements: CampaignElement[] = [];
    let elementId = 1;

    // Process each field from the parsed data
    parsedData.fields.forEach(field => {
      // Determine campaign element category based on field name
      let category: CampaignElement['category'] = 'other';
      const fieldNameLower = field.name.toLowerCase();

      if (fieldNameLower.includes('budget') || fieldNameLower.includes('cost') || fieldNameLower.includes('price') || fieldNameLower.includes('bid')) {
        category = 'budget';
      } else if (fieldNameLower.includes('target') || fieldNameLower.includes('audience') || fieldNameLower.includes('demo') || fieldNameLower.includes('geo')) {
        category = 'targeting';
      } else if (fieldNameLower.includes('creative') || fieldNameLower.includes('ad') || fieldNameLower.includes('banner') || fieldNameLower.includes('image')) {
        category = 'creative';
      } else if (fieldNameLower.includes('date') || fieldNameLower.includes('start') || fieldNameLower.includes('end') || fieldNameLower.includes('schedule')) {
        category = 'dates';
      } else if (fieldNameLower.includes('placement') || fieldNameLower.includes('site') || fieldNameLower.includes('inventory')) {
        category = 'placement';
      }

      // Get the expected value from the first data row
      const expectedValue = parsedData.data.length > 0 ? 
        String(parsedData.data[0][field.name] || '') : '';

      if (expectedValue.trim()) {
        elements.push({
          id: `element-${elementId++}`,
          category,
          label: field.name,
          expectedValue: expectedValue.trim(),
          selected: false
        });
      }
    });

    return elements;
  }
}

export const googleSheetsService = new GoogleSheetsService();
