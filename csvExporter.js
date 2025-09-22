/**
 * CSV Exporter for Green Button Data
 * Handles conversion of parsed Green Button data to CSV format and file download
 */

class CSVExporter {
    constructor() {
        this.defaultHeaders = [
            'usage_point_id',
            'meter_reading_id', 
            'interval_block_id',
            'reading_type_id',
            'service_category',
            'commodity',
            'uom',
            'power_multiplier',
            'start_time',
            'duration',
            'end_time', 
            'value',
            'cost',
            'quality_flags',
            'interval_length',
            'calculated_value',
            'calculated_cost'
        ];
    }

    /**
     * Convert flat data array to CSV string
     * @param {Array} data - Array of objects with energy data
     * @param {Array} headers - Optional custom headers array
     * @returns {string} CSV formatted string
     */
    convertToCSV(data, headers = null) {
        if (!data || data.length === 0) {
            throw new Error('No data provided for CSV conversion');
        }

        // Use provided headers or extract from first data object or use defaults
        const csvHeaders = headers || Object.keys(data[0]) || this.defaultHeaders;
        
        // Create CSV content
        const csvRows = [];
        
        // Add header row
        csvRows.push(this.formatCSVRow(csvHeaders));
        
        // Add data rows
        for (const row of data) {
            const values = csvHeaders.map(header => {
                let value = row[header];
                
                // Handle null/undefined values
                if (value === null || value === undefined) {
                    return '';
                }
                
                // Convert to string and handle special cases
                value = String(value);
                
                // Handle values that need quoting (contain commas, quotes, or newlines)
                if (this.needsQuoting(value)) {
                    // Escape quotes by doubling them
                    value = value.replace(/"/g, '""');
                    // Wrap in quotes
                    value = `"${value}"`;
                }
                
                return value;
            });
            
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Format a single CSV row
     * @param {Array} values - Array of values for the row
     * @returns {string} Formatted CSV row
     */
    formatCSVRow(values) {
        return values.map(value => {
            if (value === null || value === undefined) {
                return '';
            }
            
            const stringValue = String(value);
            
            if (this.needsQuoting(stringValue)) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            
            return stringValue;
        }).join(',');
    }

    /**
     * Check if a value needs to be quoted in CSV
     * @param {string} value - Value to check
     * @returns {boolean} True if value needs quoting
     */
    needsQuoting(value) {
        return value.includes(',') || 
               value.includes('"') || 
               value.includes('\n') || 
               value.includes('\r') ||
               value.startsWith(' ') ||
               value.endsWith(' ');
    }

    /**
     * Download CSV file to user's computer
     * @param {string} csvContent - CSV formatted string
     * @param {string} filename - Name of the file to download
     */
    downloadCSV(csvContent, filename = 'green_button_data.csv') {
        try {
            // Create blob with CSV content
            const blob = new Blob([csvContent], { 
                type: 'text/csv;charset=utf-8' 
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up URL object
            URL.revokeObjectURL(url);
            
        } catch (error) {
            throw new Error(`Failed to download CSV file: ${error.message}`);
        }
    }

    /**
     * Generate preview data for display in web interface
     * @param {Array} data - Array of data objects
     * @param {number} maxRows - Maximum number of rows to preview (default: 10)
     * @returns {Object} Preview data with headers and rows
     */
    generatePreview(data, maxRows = 10) {
        if (!data || data.length === 0) {
            return {
                headers: [],
                rows: [],
                totalRows: 0,
                isPreview: false
            };
        }

        const headers = Object.keys(data[0]);
        const previewRows = data.slice(0, maxRows);
        
        return {
            headers: headers,
            rows: previewRows,
            totalRows: data.length,
            isPreview: data.length > maxRows
        };
    }

    /**
     * Validate data before CSV conversion
     * @param {Array} data - Data to validate
     * @returns {Object} Validation result
     */
    validateData(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {
                totalRows: 0,
                totalColumns: 0,
                emptyValues: 0,
                nullValues: 0
            }
        };

        // Check if data exists
        if (!data) {
            result.isValid = false;
            result.errors.push('No data provided');
            return result;
        }

        // Check if data is array
        if (!Array.isArray(data)) {
            result.isValid = false;
            result.errors.push('Data must be an array');
            return result;
        }

        // Check if data is empty
        if (data.length === 0) {
            result.isValid = false;
            result.errors.push('Data array is empty');
            return result;
        }

        result.stats.totalRows = data.length;

        // Get headers from first row
        const firstRow = data[0];
        if (typeof firstRow !== 'object' || firstRow === null) {
            result.isValid = false;
            result.errors.push('Data rows must be objects');
            return result;
        }

        const headers = Object.keys(firstRow);
        result.stats.totalColumns = headers.length;

        // Check data consistency and quality
        let emptyCount = 0;
        let nullCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Check if row is object
            if (typeof row !== 'object' || row === null) {
                result.warnings.push(`Row ${i + 1} is not an object`);
                continue;
            }

            // Check column consistency
            const rowHeaders = Object.keys(row);
            if (rowHeaders.length !== headers.length) {
                result.warnings.push(`Row ${i + 1} has ${rowHeaders.length} columns, expected ${headers.length}`);
            }

            // Count empty and null values
            for (const header of headers) {
                const value = row[header];
                if (value === null || value === undefined) {
                    nullCount++;
                } else if (String(value).trim() === '') {
                    emptyCount++;
                }
            }
        }

        result.stats.emptyValues = emptyCount;
        result.stats.nullValues = nullCount;

        // Add warnings for data quality
        const totalValues = result.stats.totalRows * result.stats.totalColumns;
        const emptyPercentage = (emptyCount / totalValues) * 100;
        const nullPercentage = (nullCount / totalValues) * 100;

        if (emptyPercentage > 10) {
            result.warnings.push(`${emptyPercentage.toFixed(1)}% of values are empty`);
        }

        if (nullPercentage > 10) {
            result.warnings.push(`${nullPercentage.toFixed(1)}% of values are null`);
        }

        return result;
    }

    /**
     * Process and export Green Button data to CSV
     * @param {Object} parsedData - Parsed Green Button data from parser
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     */
    async exportGreenButtonData(parsedData, options = {}) {
        const {
            filename = 'green_button_data.csv',
            downloadFile = true,
            includeMetadata = false // Changed default to false - metadata shown in UI instead
        } = options;

        try {
            // Convert to flat data structure
            const parser = new GreenButtonParser();
            const flatData = parser.toFlatData(parsedData);

            // Validate data
            const validation = this.validateData(flatData);
            if (!validation.isValid) {
                throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
            }

            // Generate clean CSV without metadata comments
            const csvContent = this.convertToCSV(flatData);

            // Only add metadata as comments if explicitly requested (now defaults to false)
            let finalCsvContent = csvContent;
            if (includeMetadata && parsedData.metadata) {
                const metadata = parsedData.metadata;
                const metadataComments = [
                    `# Green Button Data Export`,
                    `# Generated: ${new Date().toISOString()}`,
                    `# Feed ID: ${metadata.feedId || 'N/A'}`,
                    `# Feed Title: ${metadata.feedTitle || 'N/A'}`,
                    `# Total Entries: ${metadata.totalEntries || 0}`,
                    `# Data Rows: ${flatData.length}`,
                    `#`
                ];
                finalCsvContent = metadataComments.join('\n') + '\n' + csvContent;
            }

            // Download file if requested
            if (downloadFile) {
                this.downloadCSV(finalCsvContent, filename);
            }

            return {
                success: true,
                csvContent: finalCsvContent,
                filename: filename,
                stats: {
                    totalRows: flatData.length,
                    totalColumns: flatData.length > 0 ? Object.keys(flatData[0]).length : 0,
                    fileSize: new Blob([finalCsvContent]).size
                },
                validation: validation
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                csvContent: null,
                filename: null,
                stats: null,
                validation: null
            };
        }
    }

    /**
     * Generate summary statistics for the data
     * @param {Array} data - Flat data array  
     * @returns {Object} Summary statistics
     */
    generateSummaryStats(data) {
        if (!data || data.length === 0) {
            return {
                totalIntervals: 0,
                usagePoints: 0,
                meterReadings: 0,
                totalEnergyValue: 0,
                totalCost: 0,
                dateRange: null,
                commodities: []
            };
        }

        const stats = {
            totalIntervals: data.length,
            usagePoints: new Set(),
            meterReadings: new Set(),
            totalEnergyValue: 0,
            totalCost: 0,
            dateRange: { min: null, max: null },
            commodities: new Set()
        };

        for (const row of data) {
            // Count unique usage points and meter readings
            if (row.usage_point_id) {
                stats.usagePoints.add(row.usage_point_id);
            }
            if (row.meter_reading_id) {
                stats.meterReadings.add(row.meter_reading_id);
            }

            // Sum energy values and costs
            if (typeof row.value === 'number') {
                stats.totalEnergyValue += row.value;
            }
            if (typeof row.cost === 'number') {
                stats.totalCost += row.cost;
            }

            // Track date range
            if (row.start_time) {
                const date = new Date(row.start_time);
                if (!stats.dateRange.min || date < stats.dateRange.min) {
                    stats.dateRange.min = date;
                }
                if (!stats.dateRange.max || date > stats.dateRange.max) {
                    stats.dateRange.max = date;
                }
            }

            // Track commodities
            if (row.commodity) {
                stats.commodities.add(row.commodity);
            }
        }

        return {
            totalIntervals: stats.totalIntervals,
            usagePoints: stats.usagePoints.size,
            meterReadings: stats.meterReadings.size,
            totalEnergyValue: stats.totalEnergyValue,
            totalCost: stats.totalCost,
            dateRange: stats.dateRange.min ? {
                min: stats.dateRange.min.toISOString(),
                max: stats.dateRange.max.toISOString()
            } : null,
            commodities: Array.from(stats.commodities)
        };
    }
}