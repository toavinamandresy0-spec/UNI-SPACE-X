// Gestionnaire d'export de données pour Spatial Research Lab
class DataExporter {
    constructor() {
        this.supportedFormats = ['csv', 'json', 'xml', 'pdf', 'xlsx'];
        this.exportQueue = [];
        this.isExporting = false;
    }

    async exportData(data, options = {}) {
        const {
            format = 'json',
            filename = `export_${Date.now()}`,
            includeMetadata = true,
            compression = false
        } = options;

        if (!this.supportedFormats.includes(format)) {
            throw new Error(`Format non supporté: ${format}. Formats supportés: ${this.supportedFormats.join(', ')}`);
        }

        try {
            this.isExporting = true;
            
            // Préparer les données pour l'export
            const exportData = this.prepareData(data, { includeMetadata });
            
            // Générer le fichier selon le format
            let fileContent;
            let mimeType;
            let fileExtension;

            switch (format) {
                case 'csv':
                    ({ content: fileContent, mimeType, fileExtension } = await this.toCSV(exportData));
                    break;
                case 'json':
                    ({ content: fileContent, mimeType, fileExtension } = await this.toJSON(exportData));
                    break;
                case 'xml':
                    ({ content: fileContent, mimeType, fileExtension } = await this.toXML(exportData));
                    break;
                case 'pdf':
                    ({ content: fileContent, mimeType, fileExtension } = await this.toPDF(exportData, options));
                    break;
                case 'xlsx':
                    ({ content: fileContent, mimeType, fileExtension } = await this.toExcel(exportData, options));
                    break;
            }

            // Appliquer la compression si demandée
            if (compression) {
                fileContent = await this.compressData(fileContent);
                fileExtension = `${fileExtension}.gz`;
            }

            // Télécharger le fichier
            this.downloadFile(fileContent, `${filename}.${fileExtension}`, mimeType);

            return {
                success: true,
                filename: `${filename}.${fileExtension}`,
                size: this.getSize(fileContent),
                format,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Erreur lors de l'export: ${error.message}`);
        } finally {
            this.isExporting = false;
        }
    }

    prepareData(data, options) {
        const { includeMetadata } = options;
        
        const preparedData = {
            data: Array.isArray(data) ? data : [data]
        };

        if (includeMetadata) {
            preparedData.metadata = {
                exportedAt: new Date().toISOString(),
                dataCount: preparedData.data.length,
                version: '1.0',
                source: 'Spatial Research Lab'
            };
        }

        return preparedData;
    }

    async toCSV(data) {
        return new Promise((resolve) => {
            const items = data.data;
            if (!items || items.length === 0) {
                resolve({ content: '', mimeType: 'text/csv', fileExtension: 'csv' });
                return;
            }

            // Obtenir les en-têtes
            const headers = this.extractHeaders(items[0]);
            
            // Créer le contenu CSV
            let csvContent = headers.join(',') + '\n';
            
            items.forEach(item => {
                const row = headers.map(header => {
                    const value = this.getNestedValue(item, header);
                    return this.escapeCSV(value);
                });
                csvContent += row.join(',') + '\n';
            });

            resolve({
                content: csvContent,
                mimeType: 'text/csv',
                fileExtension: 'csv'
            });
        });
    }

    async toJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        
        return {
            content: jsonContent,
            mimeType: 'application/json',
            fileExtension: 'json'
        };
    }

    async toXML(data) {
        const xmlContent = this.convertToXML(data);
        
        return {
            content: xmlContent,
            mimeType: 'application/xml',
            fileExtension: 'xml'
        };
    }

    async toPDF(data, options) {
        // Utiliser jsPDF pour générer le PDF
        const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        
        const doc = new jsPDF();
        const { title = 'Export de données', author = 'Spatial Research Lab' } = options;

        // En-tête du document
        doc.setFontSize(20);
        doc.text(title, 20, 30);
        doc.setFontSize(12);
        doc.text(`Exporté le: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.text(`Auteur: ${author}`, 20, 55);

        let yPosition = 80;

        // Ajouter les données
        doc.setFontSize(14);
        doc.text('Données:', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        const dataText = JSON.stringify(data.data, null, 2);
        const lines = doc.splitTextToSize(dataText, 170);
        doc.text(lines, 20, yPosition);

        const pdfContent = doc.output('bloburi');
        
        return {
            content: pdfContent,
            mimeType: 'application/pdf',
            fileExtension: 'pdf'
        };
    }

    async toExcel(data, options) {
        // Utiliser SheetJS pour générer le fichier Excel
        const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        
        const worksheet = XLSX.utils.json_to_sheet(data.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');

        // Ajouter les métadonnées
        if (data.metadata) {
            const metadataSheet = XLSX.utils.json_to_sheet([data.metadata]);
            XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Métadonnées');
        }

        const excelContent = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        return {
            content: excelContent,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileExtension: 'xlsx'
        };
    }

    // Méthodes utilitaires
    extractHeaders(obj, prefix = '') {
        const headers = [];
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    headers.push(...this.extractHeaders(value, fullKey));
                } else {
                    headers.push(fullKey);
                }
            }
        }
        
        return headers;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    convertToXML(data, rootName = 'data') {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        
        const convertObject = (obj, nodeName) => {
            let xml = `<${nodeName}>`;
            
            if (Array.isArray(obj)) {
                obj.forEach(item => {
                    xml += convertObject(item, 'item');
                });
            } else if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const value = obj[key];
                        if (typeof value === 'object' && value !== null) {
                            xml += convertObject(value, key);
                        } else {
                            xml += `<${key}>${this.escapeXML(String(value))}</${key}>`;
                        }
                    }
                }
            } else {
                xml += this.escapeXML(String(obj));
            }
            
            xml += `</${nodeName}>`;
            return xml;
        };
        
        xml += convertObject(data, rootName);
        return xml;
    }

    escapeXML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    async compressData(data) {
        // Compression simple avec gzip (utilisation de pako ou autre librairie)
        if (typeof window !== 'undefined' && window.pako) {
            const compressed = window.pako.gzip(data);
            return compressed;
        }
        
        // Fallback: retourner les données non compressées
        console.warn('Compression non disponible, retour des données non compressées');
        return data;
    }

    downloadFile(content, filename, mimeType) {
        let blob;
        
        if (content instanceof Blob) {
            blob = content;
        } else if (typeof content === 'string') {
            blob = new Blob([content], { type: mimeType });
        } else {
            blob = new Blob([content], { type: mimeType });
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    getSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        } else if (data instanceof Blob) {
            return data.size;
        } else {
            return new Blob([data]).size;
        }
    }

    // Export par lots
    async exportBatch(datasets, options = {}) {
        const results = [];
        
        for (const dataset of datasets) {
            try {
                const result = await this.exportData(dataset.data, {
                    ...options,
                    filename: dataset.filename || `export_${Date.now()}`
                });
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    filename: dataset.filename
                });
            }
        }
        
        return results;
    }

    // Export progressif pour les grandes quantités de données
    async exportLargeDataset(data, options = {}) {
        const { chunkSize = 1000, onProgress } = options;
        const totalChunks = Math.ceil(data.length / chunkSize);
        const results = [];

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = data.slice(start, end);

            try {
                const result = await this.exportData(chunk, {
                    ...options,
                    filename: `${options.filename || 'export'}_part_${i + 1}`
                });
                results.push(result);

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: totalChunks,
                        percent: ((i + 1) / totalChunks) * 100
                    });
                }
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    chunk: i + 1
                });
            }
        }

        return results;
    }

    // Validation des données
    validateData(data, schema = null) {
        if (!data) {
            throw new Error('Aucune donnée fournie');
        }

        if (schema) {
            return this.validateAgainstSchema(data, schema);
        }

        return { valid: true, errors: [] };
    }

    validateAgainstSchema(data, schema) {
        const errors = [];
        
        // Implémentation basique de validation
        // Pour une implémentation complète, utiliser une librairie comme AJV
        if (schema.required) {
            schema.required.forEach(field => {
                if (!data.hasOwnProperty(field)) {
                    errors.push(`Champ requis manquant: ${field}`);
                }
            });
        }

        if (schema.properties) {
            for (const field in data) {
                if (schema.properties[field]) {
                    const fieldSchema = schema.properties[field];
                    const value = data[field];
                    
                    if (fieldSchema.type && typeof value !== fieldSchema.type) {
                        errors.push(`Type incorrect pour ${field}: attendu ${fieldSchema.type}, reçu ${typeof value}`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Destruction
    destroy() {
        this.exportQueue = [];
        this.isExporting = false;
    }
}

export { DataExporter };