class LocalStorage {
    constructor() {
        this.prefix = 'spatial_research_';
        this.encryptionKey = 'quantum_research_2024';
    }

    // Méthodes de base
    set(key, value, encrypt = false) {
        try {
            const storageKey = this.prefix + key;
            const dataToStore = encrypt ? this.encrypt(value) : JSON.stringify(value);
            localStorage.setItem(storageKey, dataToStore);
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde localStorage:', error);
            return false;
        }
    }

    get(key, decrypt = false) {
        try {
            const storageKey = this.prefix + key;
            const item = localStorage.getItem(storageKey);
            
            if (!item) return null;
            
            return decrypt ? this.decrypt(item) : JSON.parse(item);
        } catch (error) {
            console.error('Erreur lecture localStorage:', error);
            return null;
        }
    }

    remove(key) {
        try {
            const storageKey = this.prefix + key;
            localStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('Erreur suppression localStorage:', error);
            return false;
        }
    }

    clear() {
        try {
            // Supprimer seulement les clés de notre application
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Erreur nettoyage localStorage:', error);
            return false;
        }
    }

    // Gestion des simulations
    saveSimulation(simulation) {
        const simulations = this.getSimulations();
        const existingIndex = simulations.findIndex(s => s.id === simulation.id);
        
        if (existingIndex >= 0) {
            simulations[existingIndex] = {
                ...simulations[existingIndex],
                ...simulation,
                updatedAt: new Date().toISOString()
            };
        } else {
            simulations.push({
                ...simulation,
                id: simulation.id || this.generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        return this.set('simulations', simulations);
    }

    getSimulations() {
        return this.get('simulations') || [];
    }

    getSimulation(id) {
        const simulations = this.getSimulations();
        return simulations.find(s => s.id === id) || null;
    }

    deleteSimulation(id) {
        const simulations = this.getSimulations();
        const filtered = simulations.filter(s => s.id !== id);
        return this.set('simulations', filtered);
    }

    // Gestion des données de recherche
    saveResearchData(simulationId, dataType, dataValues) {
        const key = `research_${simulationId}`;
        const allData = this.get(key) || [];
        
        allData.push({
            id: this.generateId(),
            simulationId: simulationId,
            dataType: dataType,
            dataValues: dataValues,
            recordedAt: new Date().toISOString()
        });
        
        return this.set(key, allData);
    }

    getResearchData(simulationId, dataType = null) {
        const key = `research_${simulationId}`;
        const allData = this.get(key) || [];
        
        if (dataType) {
            return allData.filter(item => item.dataType === dataType);
        }
        
        return allData;
    }

    // Gestion des préférences utilisateur
    saveUserPreferences(preferences) {
        const current = this.getUserPreferences();
        const merged = { ...current, ...preferences, updatedAt: new Date().toISOString() };
        return this.set('user_preferences', merged, true);
    }

    getUserPreferences() {
        return this.get('user_preferences', true) || {
            theme: 'dark',
            language: 'fr',
            units: 'metric',
            autoSave: true,
            notifications: true
        };
    }

    // Gestion de l'historique
    addToHistory(type, data) {
        const history = this.getHistory();
        const maxHistorySize = 100;
        
        history.unshift({
            id: this.generateId(),
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        // Garder seulement les N derniers éléments
        if (history.length > maxHistorySize) {
            history.splice(maxHistorySize);
        }
        
        return this.set('history', history);
    }

    getHistory(limit = null) {
        const history = this.get('history') || [];
        return limit ? history.slice(0, limit) : history;
    }

    clearHistory() {
        return this.set('history', []);
    }

    // Gestion du cache
    setCache(key, value, ttl = 3600000) { // 1 heure par défaut
        const cacheData = {
            value: value,
            expiresAt: Date.now() + ttl
        };
        
        return this.set(`cache_${key}`, cacheData);
    }

    getCache(key) {
        const cacheData = this.get(`cache_${key}`);
        
        if (!cacheData) return null;
        
        if (Date.now() > cacheData.expiresAt) {
            this.remove(`cache_${key}`);
            return null;
        }
        
        return cacheData.value;
    }

    clearExpiredCache() {
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix + 'cache_')) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    if (now > cacheData.expiresAt) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    // Ignorer les erreurs de parsing
                }
            }
        }
    }

    // Chiffrement simple (pour données sensibles)
    encrypt(data) {
        try {
            // Chiffrement basique (à remplacer par une solution plus sécurisée en production)
            const text = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
            }
            return btoa(result);
        } catch (error) {
            console.error('Erreur chiffrement:', error);
            return JSON.stringify(data);
        }
    }

    decrypt(encryptedData) {
        try {
            const text = atob(encryptedData);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
            }
            return JSON.parse(result);
        } catch (error) {
            console.error('Erreur déchiffrement:', error);
            return null;
        }
    }

    // Utilitaires
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    getStorageInfo() {
        let totalSize = 0;
        let ourAppSize = 0;
        let itemCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = (key.length + value.length) * 2; // Approximation en bytes
            
            totalSize += size;
            
            if (key.startsWith(this.prefix)) {
                ourAppSize += size;
                itemCount++;
            }
        }
        
        return {
            totalSize: this.formatBytes(totalSize),
            ourAppSize: this.formatBytes(ourAppSize),
            itemCount: itemCount,
            quota: this.formatBytes(5 * 1024 * 1024) // 5MB quota typical
        };
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Export/Import des données
    exportData() {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: {}
        };
        
        // Collecter toutes les données de notre application
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                exportData.data[cleanKey] = this.get(cleanKey.replace(this.prefix, ''));
            }
        }
        
        return JSON.stringify(exportData, null, 2);
    }

    importData(jsonData, clearExisting = false) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (clearExisting) {
                this.clear();
            }
            
            Object.entries(importData.data).forEach(([key, value]) => {
                this.set(key, value);
            });
            
            return {
                success: true,
                importedItems: Object.keys(importData.data).length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Synchronisation
    getUnsyncedData() {
        const unsynced = {};
        const simulations = this.getSimulations();
        
        simulations.forEach(sim => {
            if (!sim.syncedWithServer) {
                unsynced[sim.id] = {
                    simulation: sim,
                    researchData: this.getResearchData(sim.id)
                };
            }
        });
        
        return unsynced;
    }

    markAsSynced(simulationId) {
        const simulations = this.getSimulations();
        const simulation = simulations.find(s => s.id === simulationId);
        
        if (simulation) {
            simulation.syncedWithServer = true;
            simulation.lastSynced = new Date().toISOString();
            this.saveSimulation(simulation);
        }
    }
}

// Export global
if (typeof window !== 'undefined') {
    window.LocalStorage = LocalStorage;
}