// Gestionnaire d'état global de l'application
class StateManager {
    constructor() {
        this.state = {
            // Utilisateur
            user: null,
            
            // Données de l'application
            simulations: [],
            researchData: [],
            experiments: [],
            collaborationSessions: [],
            
            // État courant
            currentSimulation: null,
            currentExperiment: null,
            currentSession: null,
            
            // Métriques en temps réel
            orbital: {
                altitude: { value: 408.2, unit: 'km', variation: 0.1 },
                inclination: { value: 51.65, unit: '°', variation: 0.01 },
                eccentricity: { value: 0.0012, unit: '', variation: 0.0001 },
                period: { value: 92.68, unit: 'min', variation: 0.05 },
                regression: { value: -0.12, unit: '°/jour', variation: 0.01 },
                raan: { value: -2.45, unit: '°/jour', variation: 0.02 }
            },
            
            research: {
                qFactor: { value: 1.24, unit: '', variation: 0.02 },
                ispEfficiency: { value: 98.7, unit: '%', variation: 0.1 },
                deltaVResidual: { value: 142, unit: 'm/s', variation: 1 },
                structuralMargin: { value: 15.3, unit: '%', variation: 0.1 },
                safetyFactor: { value: 2.1, unit: '', variation: 0.01 }
            },
            
            scientific: {
                quantumDeltaV: { value: 12.4, unit: 'km/s', variation: 0.1 },
                quantumEfficiency: { value: 99.7, unit: '%', variation: 0.05 },
                effectiveISP: { value: 15240, unit: 's', variation: 10 },
                plasmaTemp: { value: 1.2, unit: '×10⁶ K', variation: 0.05 },
                magneticPressure: { value: 12.5, unit: 'T', variation: 0.1 }
            },
            
            // Statistiques
            statistics: {
                total_simulations: 0,
                active_experiments: 0,
                data_points: 0,
                collaborators: 0,
                success_rate: 0
            },
            
            // Configuration
            config: {
                theme: 'dark',
                autoSave: true,
                realTimeUpdates: true,
                notifications: true
            },
            
            // État de l'interface
            ui: {
                sidebarVisible: true,
                fullscreenMode: false,
                currentView: 'dashboard',
                loading: false,
                errors: []
            }
        };
        
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 100;
    }

    async init() {
        console.log('🔄 Initialisation du StateManager...');
        
        // Charger l'état depuis le localStorage
        await this.loadFromStorage();
        
        // Démarrer les mises à jour automatiques
        this.startAutoUpdates();
        
        console.log('✅ StateManager initialisé');
    }

    // Getters
    getState() {
        return this.deepClone(this.state);
    }

    getUser() {
        return this.state.user;
    }

    getSimulations() {
        return this.state.simulations;
    }

    getResearchData() {
        return this.state.researchData;
    }

    getStatistics() {
        return this.state.statistics;
    }

    // Setters
    setUser(user) {
        const oldState = this.deepClone(this.state);
        this.state.user = user;
        this.saveToStorage('user', user);
        this.notifyListeners('user', user, oldState.user);
        this.addToHistory('user_updated', { old: oldState.user, new: user });
    }

    setSimulations(simulations) {
        const oldState = this.deepClone(this.state);
        this.state.simulations = simulations;
        this.notifyListeners('simulations', simulations, oldState.simulations);
        this.addToHistory('simulations_updated', { 
            count: simulations.length,
            added: simulations.length - oldState.simulations.length
        });
    }

    setResearchData(researchData) {
        const oldState = this.deepClone(this.state);
        this.state.researchData = researchData;
        this.notifyListeners('researchData', researchData, oldState.researchData);
    }

    setStatistics(statistics) {
        const oldState = this.deepClone(this.state);
        this.state.statistics = { ...this.state.statistics, ...statistics };
        this.notifyListeners('statistics', this.state.statistics, oldState.statistics);
    }

    setCurrentSimulation(simulation) {
        const oldState = this.deepClone(this.state);
        this.state.currentSimulation = simulation;
        this.notifyListeners('currentSimulation', simulation, oldState.currentSimulation);
        this.addToHistory('simulation_selected', { simulation: simulation?.id });
    }

    setConfig(config) {
        const oldState = this.deepClone(this.state);
        this.state.config = { ...this.state.config, ...config };
        this.saveToStorage('config', this.state.config);
        this.notifyListeners('config', this.state.config, oldState.config);
    }

    // Métriques en temps réel
    updateOrbitalMetrics(metrics) {
        const oldState = this.deepClone(this.state);
        
        // Appliquer des variations aléatoires pour simuler des données en temps réel
        Object.keys(metrics).forEach(key => {
            if (this.state.orbital[key]) {
                const variation = this.state.orbital[key].variation || 0.1;
                const randomChange = (Math.random() - 0.5) * 2 * variation;
                this.state.orbital[key].value = metrics[key] + randomChange;
                
                // Limiter les valeurs à des plages réalistes
                this.state.orbital[key].value = this.limitValue(
                    this.state.orbital[key].value, 
                    key, 
                    'orbital'
                );
            }
        });
        
        this.notifyListeners('orbital', this.state.orbital, oldState.orbital);
    }

    updateResearchMetrics(metrics) {
        const oldState = this.deepClone(this.state);
        
        Object.keys(metrics).forEach(key => {
            if (this.state.research[key]) {
                const variation = this.state.research[key].variation || 0.1;
                const randomChange = (Math.random() - 0.5) * 2 * variation;
                this.state.research[key].value = metrics[key] + randomChange;
                
                this.state.research[key].value = this.limitValue(
                    this.state.research[key].value, 
                    key, 
                    'research'
                );
            }
        });
        
        this.notifyListeners('research', this.state.research, oldState.research);
    }

    // Gestion des écouteurs
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Retourner une fonction de désabonnement
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    notifyListeners(key, newValue, oldValue) {
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, this.state);
                } catch (error) {
                    console.error(`Erreur dans l'écouteur pour ${key}:`, error);
                }
            });
        }
        
        // Notifier les écouteurs globaux
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
            globalListeners.forEach(callback => {
                try {
                    callback(key, newValue, oldValue, this.state);
                } catch (error) {
                    console.error('Erreur dans l\'écouteur global:', error);
                }
            });
        }
    }

    // Historique des actions
    addToHistory(action, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            data,
            stateSnapshot: this.deepClone(this.state)
        };
        
        this.history.unshift(entry);
        
        // Limiter la taille de l'historique
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
    }

    getHistory() {
        return this.history;
    }

    undo() {
        if (this.history.length > 1) {
            const previousState = this.history[1].stateSnapshot;
            this.state = this.deepClone(previousState);
            this.history = this.history.slice(1);
            this.notifyListeners('*', this.state, null);
            return true;
        }
        return false;
    }

    // Persistance
    async saveToStorage(key, value) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(`spatial_${key}`, JSON.stringify(value));
            }
        } catch (error) {
            console.warn('Impossible de sauvegarder dans le storage:', error);
        }
    }

    async loadFromStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                // Charger l'utilisateur
                const user = localStorage.getItem('spatial_user');
                if (user) {
                    this.state.user = JSON.parse(user);
                }
                
                // Charger la configuration
                const config = localStorage.getItem('spatial_config');
                if (config) {
                    this.state.config = { ...this.state.config, ...JSON.parse(config) };
                }
            }
        } catch (error) {
            console.warn('Impossible de charger depuis le storage:', error);
        }
    }

    // Mises à jour automatiques
    startAutoUpdates() {
        // Mettre à jour les métriques orbitales toutes les 5 secondes
        setInterval(() => {
            this.updateOrbitalMetrics(this.state.orbital);
        }, 5000);
        
        // Mettre à jour les métriques de recherche toutes les 8 secondes
        setInterval(() => {
            this.updateResearchMetrics(this.state.research);
        }, 8000);
        
        // Mettre à jour les métriques scientifiques toutes les 10 secondes
        setInterval(() => {
            this.updateScientificMetrics(this.state.scientific);
        }, 10000);
    }

    updateScientificMetrics(metrics) {
        const oldState = this.deepClone(this.state);
        
        Object.keys(metrics).forEach(key => {
            if (this.state.scientific[key]) {
                const variation = this.state.scientific[key].variation || 0.1;
                const randomChange = (Math.random() - 0.5) * 2 * variation;
                this.state.scientific[key].value = metrics[key] + randomChange;
                
                this.state.scientific[key].value = this.limitValue(
                    this.state.scientific[key].value, 
                    key, 
                    'scientific'
                );
            }
        });
        
        this.notifyListeners('scientific', this.state.scientific, oldState.scientific);
    }

    // Utilitaires
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    limitValue(value, key, category) {
        // Définir des limites réalistes pour les différentes métriques
        const limits = {
            orbital: {
                altitude: { min: 200, max: 35786 },
                inclination: { min: 0, max: 180 },
                eccentricity: { min: 0, max: 1 },
                period: { min: 80, max: 150 }
            },
            research: {
                qFactor: { min: 0.5, max: 2.0 },
                ispEfficiency: { min: 80, max: 100 },
                deltaVResidual: { min: 0, max: 500 },
                structuralMargin: { min: 5, max: 30 }
            },
            scientific: {
                quantumDeltaV: { min: 5, max: 20 },
                quantumEfficiency: { min: 95, max: 100 },
                effectiveISP: { min: 10000, max: 20000 },
                plasmaTemp: { min: 0.5, max: 2.0 }
            }
        };
        
        const categoryLimits = limits[category];
        if (categoryLimits && categoryLimits[key]) {
            const { min, max } = categoryLimits[key];
            return Math.max(min, Math.min(max, value));
        }
        
        return value;
    }

    // Gestion des erreurs
    addError(error) {
        const errorEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: error.context
        };
        
        this.state.ui.errors.unshift(errorEntry);
        
        // Limiter à 50 erreurs maximum
        if (this.state.ui.errors.length > 50) {
            this.state.ui.errors = this.state.ui.errors.slice(0, 50);
        }
        
        this.notifyListeners('errors', this.state.ui.errors, null);
    }

    clearErrors() {
        const oldErrors = this.deepClone(this.state.ui.errors);
        this.state.ui.errors = [];
        this.notifyListeners('errors', this.state.ui.errors, oldErrors);
    }

    // Réinitialisation
    reset() {
        const oldState = this.deepClone(this.state);
        
        this.state = {
            ...this.state,
            simulations: [],
            researchData: [],
            experiments: [],
            collaborationSessions: [],
            currentSimulation: null,
            currentExperiment: null,
            currentSession: null,
            statistics: {
                total_simulations: 0,
                active_experiments: 0,
                data_points: 0,
                collaborators: 0,
                success_rate: 0
            },
            ui: {
                ...this.state.ui,
                errors: []
            }
        };
        
        this.notifyListeners('*', this.state, oldState);
        this.addToHistory('state_reset', {});
    }

    // Export/Import
    exportState() {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            state: this.deepClone(this.state),
            history: this.history
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    importState(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            const oldState = this.deepClone(this.state);
            
            if (importData.state) {
                this.state = { ...this.state, ...importData.state };
            }
            
            if (importData.history) {
                this.history = importData.history;
            }
            
            this.notifyListeners('*', this.state, oldState);
            this.addToHistory('state_imported', { source: 'external' });
            
            return true;
        } catch (error) {
            this.addError({
                message: 'Erreur lors de l\'import de l\'état',
                context: { error: error.message }
            });
            return false;
        }
    }

    // Destruction
    destroy() {
        this.listeners.clear();
        this.history = [];
        console.log('🧹 StateManager détruit');
    }
}

// Export singleton
let stateManagerInstance = null;

export function getStateManager() {
    if (!stateManagerInstance) {
        stateManagerInstance = new StateManager();
    }
    return stateManagerInstance;
}

export { StateManager };