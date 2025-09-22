/**
 * Green Button XML to CSV Converter - Main Application
 * Handles user interface interactions and coordinates parsing and export
 */

class GreenButtonApp {
    constructor() {
        this.parser = new GreenButtonParser();
        this.exporter = new CSVExporter();
        this.currentData = null;
        this.currentFlatData = null;
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File input change
        const fileInput = document.getElementById('xmlFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Export button
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, () => this.highlight(), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, () => this.unhighlight(), false);
        });

        // Handle dropped files
        document.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    /**
     * Handle file selection from input
     */
    async handleFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            await this.processFile(files[0]);
        }
    }

    /**
     * Handle file drop
     */
    async handleDrop(event) {
        const dt = event.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            // Update file input to reflect dropped file
            const fileInput = document.getElementById('xmlFileInput');
            if (fileInput) {
                fileInput.files = files;
            }
            await this.processFile(files[0]);
        }
    }

    /**
     * Process the selected XML file
     */
    async processFile(file) {
        try {
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.xml')) {
                throw new Error('Please select an XML file');
            }

            // Show file info
            this.showFileInfo(file);
            
            // Show processing section
            this.showProcessingSection();
            
            // Read file content
            this.updateProgress(10, 'Reading file...');
            const xmlContent = await this.readFileAsText(file);
            
            // Parse XML
            this.updateProgress(30, 'Parsing Green Button XML...');
            this.currentData = await this.parser.parseXML(xmlContent);
            
            // Transform to flat data
            this.updateProgress(60, 'Transforming data...');
            this.currentFlatData = this.parser.toFlatData(this.currentData);
            
            // Generate statistics
            this.updateProgress(80, 'Generating statistics...');
            const stats = this.exporter.generateSummaryStats(this.currentFlatData);
            
            // Complete processing
            this.updateProgress(100, 'Processing complete!');
            
            // Show results
            setTimeout(() => {
                this.showResults(stats);
            }, 500);
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showError(error.message);
        }
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Show file information
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        if (fileInfo && fileName && fileSize) {
            fileName.textContent = `File: ${file.name}`;
            fileSize.textContent = `Size: ${this.formatFileSize(file.size)}`;
            fileInfo.style.display = 'block';
        }
    }

    /**
     * Show processing section with progress
     */
    showProcessingSection() {
        this.hideAllSections();
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.style.display = 'block';
        }
    }

    /**
     * Update progress bar and status
     */
    updateProgress(percentage, status) {
        const progressFill = document.getElementById('progressFill');
        const processingStatus = document.getElementById('processingStatus');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (processingStatus) {
            processingStatus.textContent = status;
        }
    }

    /**
     * Show results section
     */
    showResults(stats) {
        this.hideAllSections();
        
        // Update metadata information
        if (this.currentData && this.currentData.metadata) {
            const metadata = this.currentData.metadata;
            this.updateElement('feedId', this.truncateText(metadata.feedId, 50));
            this.updateElement('feedTitle', metadata.feedTitle || 'N/A');
            this.updateElement('feedUpdated', this.formatDateTime(metadata.updated));
            this.updateElement('totalEntries', metadata.totalEntries);
        }
        
        // Update data statistics
        this.updateElement('usagePointsCount', stats.usagePoints);
        this.updateElement('meterReadingsCount', stats.meterReadings);  
        this.updateElement('intervalsCount', stats.totalIntervals);
        
        // Update date range if available
        if (stats.dateRange) {
            const startDate = new Date(stats.dateRange.min).toLocaleDateString();
            const endDate = new Date(stats.dateRange.max).toLocaleDateString();
            this.updateElement('dateRange', `${startDate} - ${endDate}`);
        } else {
            this.updateElement('dateRange', 'N/A');
        }
        
        // Generate preview
        const preview = this.exporter.generatePreview(this.currentFlatData, 10);
        this.updatePreviewTable(preview);
        
        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    }

    /**
     * Update preview table
     */
    updatePreviewTable(preview) {
        const tableHead = document.getElementById('previewTableHead');
        const tableBody = document.getElementById('previewTableBody');
        
        if (!tableHead || !tableBody || !preview.headers.length) {
            return;
        }

        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Add headers
        const headerRow = document.createElement('tr');
        preview.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = this.formatHeaderName(header);
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Add data rows
        preview.rows.forEach(row => {
            const tr = document.createElement('tr');
            preview.headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = this.formatCellValue(row[header]);
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        // Add preview notice if data is truncated
        if (preview.isPreview) {
            const noticeRow = document.createElement('tr');
            const noticeCell = document.createElement('td');
            noticeCell.colSpan = preview.headers.length;
            noticeCell.textContent = `... and ${preview.totalRows - preview.rows.length} more rows`;
            noticeCell.style.textAlign = 'center';
            noticeCell.style.fontStyle = 'italic';
            noticeCell.style.color = '#666';
            noticeRow.appendChild(noticeCell);
            tableBody.appendChild(noticeRow);
        }
    }

    /**
     * Handle CSV export
     */
    async handleExport() {
        if (!this.currentData || !this.currentFlatData) {
            this.showError('No data available to export');
            return;
        }

        try {
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `green_button_data_${timestamp}.csv`;

            // Export data (metadata now shown in UI, not in CSV)
            const result = await this.exporter.exportGreenButtonData(this.currentData, {
                filename: filename,
                downloadFile: true,
                includeMetadata: false
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            // Show success message temporarily
            const exportBtn = document.getElementById('exportCsvBtn');
            if (exportBtn) {
                const originalText = exportBtn.innerHTML;
                exportBtn.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                    </svg>
                    Downloaded!
                `;
                exportBtn.style.background = '#4caf50';
                
                setTimeout(() => {
                    exportBtn.innerHTML = originalText;
                    exportBtn.style.background = '';
                }, 2000);
            }

        } catch (error) {
            console.error('Export error:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideAllSections();
        
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';
        }
    }

    /**
     * Handle reset/try another file
     */
    handleReset() {
        // Clear data
        this.currentData = null;
        this.currentFlatData = null;
        
        // Reset file input
        const fileInput = document.getElementById('xmlFileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Hide all sections
        this.hideAllSections();
        
        // Hide file info
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }
    }

    /**
     * Hide all result sections
     */
    hideAllSections() {
        const sections = [
            'processingSection',
            'resultsSection', 
            'errorSection'
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    /**
     * Update text content of element
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '0';
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format header names for display
     */
    formatHeaderName(header) {
        return header
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format cell values for display
     */
    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 50) + '...';
        }
        
        return String(value);
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Format datetime for display
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Highlight drop area
     */
    highlight() {
        document.body.classList.add('drag-over');
    }

    /**
     * Remove highlight from drop area
     */
    unhighlight() {
        document.body.classList.remove('drag-over');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GreenButtonApp();
    
    // Make app globally available for debugging
    window.greenButtonApp = app;
});

// Add drag-over styles
const dragStyles = `
    .drag-over {
        background-color: #e8f5e8 !important;
    }
    
    .drag-over .upload-section {
        border: 2px dashed #2e7d32 !important;
        background-color: #f1f8e9 !important;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = dragStyles;
document.head.appendChild(styleSheet);