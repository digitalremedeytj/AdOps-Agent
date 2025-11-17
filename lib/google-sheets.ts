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
      // Read a much larger range to capture all possible data
      const range = `${sheetName}!A1:ZZ1000`; // Expanded range
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rawValues = response.data.values || [];
      console.log('Raw sheet data captured:', {
        totalRows: rawValues.length,
        maxColumns: Math.max(...rawValues.map((row: any) => row ? row.length : 0)),
        sampleRows: rawValues.slice(0, 10).map((row: any, i: number) => ({ row: i, data: row }))
      });

      return {
        values: rawValues
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
    console.log('Parsing key-value format with enhanced detection');
    
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

    console.log(`Processing ${dataRows.length} data rows for key-value pairs`);

    dataRows.forEach((row, rowIndex) => {
      if (row && row.length >= 1) { // Only require at least one column
        const key = (row[0] || '').toString().trim();
        const value = row.length >= 2 ? (row[1] || '').toString().trim() : '';
        
        console.log(`Row ${rowIndex}: key="${key}", value="${value}"`);
        
        // Accept any non-empty key, even if value is empty (we'll filter later)
        if (key && key.toLowerCase() !== 'key') { // Skip header row if it appears again
          fields.push({
            name: key,
            type: 'string', // Always treat as string to avoid conversion issues
            required: true
          });

          // Store the raw value without any type conversion
          singleRowData[key] = value;
          
          console.log(`Added field: "${key}" = "${value}"`);
        }
      }
    });

    console.log(`Total fields extracted: ${fields.length}`);
    console.log('Field names:', fields.map(f => f.name));

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
    const firstDataRow = parsedData.data.length > 0 ? parsedData.data[0] : {};

    // Process each field individually - no complex grouping or categorization
    parsedData.fields.forEach(field => {
      const expectedValue = String(firstDataRow[field.name] || '').trim();
      
      // Only skip truly empty values or common non-meaningful values
      if (!expectedValue || 
          expectedValue.toLowerCase() === 'n/a' || 
          expectedValue.toLowerCase() === 'none' ||
          expectedValue === '-' ||
          expectedValue === '') {
        return;
      }

      // No categorization - just the essential fields
      elements.push({
        id: `element-${elementId++}`,
        label: field.name, // Use exact field name from media plan
        expectedValue: expectedValue,
        selected: false
      });
    });

    return elements;
  }

  private groupRelatedFields(fields: any[], data: any[]): Array<{
    fields: any[],
    label: string,
    expectedValue: string
  }> {
    const groups: Array<{
      fields: any[],
      label: string,
      expectedValue: string
    }> = [];
    
    const processedFields = new Set<string>();
    const firstDataRow = data.length > 0 ? data[0] : {};

    fields.forEach(field => {
      if (processedFields.has(field.name)) return;

      const fieldNameLower = field.name.toLowerCase();
      
      // Check if this field is part of a related group
      const relatedFields = this.findRelatedFields(field, fields, firstDataRow);
      
      if (relatedFields.length > 1) {
        // This is a grouped field
        const groupLabel = this.createGroupLabel(relatedFields, firstDataRow);
        const groupValue = this.createGroupValue(relatedFields, firstDataRow);
        
        groups.push({
          fields: relatedFields,
          label: groupLabel,
          expectedValue: groupValue
        });
        
        // Mark all related fields as processed
        relatedFields.forEach(rf => processedFields.add(rf.name));
      } else {
        // This is a standalone field
        const expectedValue = String(firstDataRow[field.name] || '');
        if (expectedValue.trim()) {
          groups.push({
            fields: [field],
            label: field.name,
            expectedValue: expectedValue
          });
        }
        processedFields.add(field.name);
      }
    });

    return groups;
  }

  private findRelatedFields(baseField: any, allFields: any[], dataRow: any): any[] {
    const baseFieldLower = baseField.name.toLowerCase();
    const relatedFields = [baseField];
    
    // Define patterns for related fields
    const relationshipPatterns = [
      // Additional Cost patterns
      {
        base: /additional\s*cost$/,
        related: [/additional\s*cost\s*type/, /additional\s*cost\s*name/]
      },
      // Budget patterns
      {
        base: /budget$/,
        related: [/budget\s*type/, /budget\s*name/, /budget\s*period/]
      },
      // Targeting patterns
      {
        base: /target$/,
        related: [/target\s*type/, /target\s*name/, /target\s*criteria/]
      },
      // Creative patterns
      {
        base: /creative$/,
        related: [/creative\s*type/, /creative\s*name/, /creative\s*size/]
      }
    ];

    // Check if base field matches any pattern
    for (const pattern of relationshipPatterns) {
      if (pattern.base.test(baseFieldLower)) {
        // Find related fields
        allFields.forEach(field => {
          if (field.name !== baseField.name) {
            const fieldLower = field.name.toLowerCase();
            for (const relatedPattern of pattern.related) {
              if (relatedPattern.test(fieldLower)) {
                const fieldValue = String(dataRow[field.name] || '').trim();
                if (fieldValue) {
                  relatedFields.push(field);
                }
                break;
              }
            }
          }
        });
        break;
      }
    }

    // Also check for reverse relationships (if this field is a "type" or "name" field)
    if (baseFieldLower.includes('type') || baseFieldLower.includes('name')) {
      const basePrefix = baseFieldLower.replace(/\s*(type|name).*$/, '').trim();
      
      allFields.forEach(field => {
        if (field.name !== baseField.name) {
          const fieldLower = field.name.toLowerCase();
          if (fieldLower.startsWith(basePrefix) && !fieldLower.includes('type') && !fieldLower.includes('name')) {
            const fieldValue = String(dataRow[field.name] || '').trim();
            if (fieldValue) {
              relatedFields.unshift(field); // Put the main field first
            }
          }
        }
      });
    }

    return relatedFields;
  }

  private createGroupLabel(relatedFields: any[], dataRow: any): string {
    // Sort fields to put the main field first, then type, then name
    const sortedFields = [...relatedFields].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      
      // Main field (without type/name) comes first
      const aIsMain = !aLower.includes('type') && !aLower.includes('name');
      const bIsMain = !bLower.includes('type') && !bLower.includes('name');
      
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      
      // Type comes before name
      const aIsType = aLower.includes('type');
      const bIsType = bLower.includes('type');
      
      if (aIsType && !bIsType) return -1;
      if (!aIsType && bIsType) return 1;
      
      return 0;
    });

    const mainField = sortedFields[0];
    const typeField = sortedFields.find(f => f.name.toLowerCase().includes('type'));
    const nameField = sortedFields.find(f => f.name.toLowerCase().includes('name'));

    let label = mainField.name;
    
    // Add type and name information if available
    const typeValue = typeField ? String(dataRow[typeField.name] || '').trim() : '';
    const nameValue = nameField ? String(dataRow[nameField.name] || '').trim() : '';
    
    if (typeValue && nameValue) {
      label += ` - ${typeValue}: ${nameValue}`;
    } else if (typeValue) {
      label += ` - ${typeValue}`;
    } else if (nameValue) {
      label += ` - ${nameValue}`;
    }

    return label;
  }

  private createGroupValue(relatedFields: any[], dataRow: any): string {
    // Find the field with the actual value (usually the main field without type/name)
    const mainField = relatedFields.find(f => {
      const fieldLower = f.name.toLowerCase();
      return !fieldLower.includes('type') && !fieldLower.includes('name');
    }) || relatedFields[0];

    return String(dataRow[mainField.name] || '');
  }
}

export const googleSheetsService = new GoogleSheetsService();
