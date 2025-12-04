class DataManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.cache = new Map();
    }

    async saveSimulation(simulationData) {
        try {
            const response = await this.apiClient.post('simulations.php', simulationData);
            
            // Sauvegarde locale
            this.saveToLocalStorage('simulations', simulationData);
            
            return {
                success: true,
                data: response,
                simulationId: response.simulation_id
            };
        } catch (error) {
            console.error('Error saving simulation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async loadSimulation(simulationId) {
        const cacheKey = `simulation_${simulationId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const simulation = await this.apiClient.get(`simulations.php?id=${simulationId}`);
            this.cache.set(cacheKey, simulation);
            return simulation;
        } catch (error) {
            // Fallback sur le stockage local
            return this.loadFromLocalStorage('simulations', simulationId);
        }
    }

    async storeResearchData(simulationId, dataType, dataValues) {
        const researchData = {
            simulation_id: simulationId,
            data_type: dataType,
            data_values: dataValues
        };

        try {
            await this.apiClient.post('research-data.php', researchData);
            return true;
        } catch (error) {
            console.error('Error storing research data:', error);
            return false;
        }
    }

    async getResearchData(simulationId, dataType = null) {
        let url = `research-data.php?simulation_id=${simulationId}`;
        if (dataType) {
            url += `&data_type=${dataType}`;
        }

        try {
            return await this.apiClient.get(url);
        } catch (error) {
            console.error('Error loading research data:', error);
            return [];
        }
    }

    async exportData(simulationId, format = 'json') {
        try {
            const simulation = await this.loadSimulation(simulationId);
            const researchData = await this.getResearchData(simulationId);
            
            const exportData = {
                metadata: {
                    export_date: new Date().toISOString(),
                    simulation: simulation.name,
                    format: format
                },
                simulation: simulation,
                research_data: researchData
            };

            return this.formatExportData(exportData, format);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    formatExportData(data, format) {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            case 'xml':
                return this.convertToXML(data);
                
            default:
                return JSON.stringify(data);
        }
    }

    convertToCSV(data) {
        let csv = 'Timestamp,Category,Parameter,Value\n';
        
        // Données de simulation
        if (data.simulation.parameters) {
            Object.entries(data.simulation.parameters).forEach(([key, value]) => {
                csv += `${data.metadata.export_date},Simulation,${key},${value}\n`;
            });
        }
        
        // Données de recherche
        data.research_data.forEach(item => {
            if (typeof item.data_values === 'object') {
                Object.entries(item.data_values).forEach(([key, value]) => {
                    csv += `${item.recorded_at},Research,${key},${value}\n`;
                });
            }
        });
        
        return csv;
    }

    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<SpatialResearchExport>\n';
        xml += `  <exportDate>${data.metadata.export_date}</exportDate>\n`;
        xml += `  <simulationName>${data.metadata.simulation}</simulationName>\n`;
        
        xml += '  <simulationData>\n';
        if (data.simulation.parameters) {
            Object.entries(data.simulation.parameters).forEach(([key, value]) => {
                xml += `    <${key}>${value}</${key}>\n`;
            });
        }
        xml += '  </simulationData>\n';
        
        xml += '  <researchData>\n';
        data.research_data.forEach(item => {
            xml += '    <dataPoint>\n';
            xml += `      <timestamp>${item.recorded_at}</timestamp>\n`;
            xml += `      <type>${item.data_type}</type>\n`;
            if (typeof item.data_values === 'object') {
                Object.entries(item.data_values).forEach(([key, value]) => {
                    xml += `      <${key}>${value}</${key}>\n`;
                });
            }
            xml += '    </dataPoint>\n';
        });
        xml += '  </researchData>\n';
        
        xml += '</SpatialResearchExport>';
        return xml;
    }

    // Méthodes utilitaires
    saveToLocalStorage(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({...data, id: Date.now()});
            localStorage.setItem(key, JSON.stringify(existing));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromLocalStorage(key, id = null) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (id) {
                return data.find(item => item.id === id) || null;
            }
            return data;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return id ? null : [];
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

class ApiClient {
    constructor() {
        this.baseURL = window.location.origin + '/backend/api/';
    }

    async get(url) {
        const response = await fetch(this.baseURL + url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async post(url, data) {
        const response = await fetch(this.baseURL + url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
    window.ApiClient = ApiClient;
}