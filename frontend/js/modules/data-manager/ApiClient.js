// Client API pour Spatial Research Lab
// Gère toutes les communications avec le backend

class ApiClient {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.token = null;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Intercepteurs de requêtes
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Cache pour les requêtes
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.setupInterceptors();
    }

    getBaseURL() {
        // Déterminer l'URL de base en fonction de l'environnement
        if (typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:8000/api';
            } else {
                return '/api';
            }
        }
        return '/api';
    }

    setupInterceptors() {
        // Intercepteur de requête pour ajouter le token d'authentification
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${this.token}`;
            }
            return config;
        });

        // Intercepteur de réponse pour gérer les erreurs
        this.addResponseInterceptor(
            (response) => response,
            (error) => this.handleResponseError(error)
        );
    }

    // Gestion de l'authentification
    async login(email, password) {
        try {
            const response = await this.post('/auth', {
                action: 'login',
                email,
                password
            });

            if (response.success && response.token) {
                this.setToken(response.token);
                return response;
            } else {
                throw new Error(response.error || 'Erreur de connexion');
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async register(userData) {
        try {
            const response = await this.post('/auth', {
                action: 'register',
                ...userData
            });

            if (response.success && response.token) {
                this.setToken(response.token);
                return response;
            } else {
                throw new Error(response.error || 'Erreur d\'inscription');
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    async validateToken(token = null) {
        try {
            const currentToken = token || this.token;
            if (!currentToken) {
                throw new Error('Aucun token fourni');
            }

            const response = await this.post('/auth', {
                action: 'refresh',
                token: currentToken
            });

            if (response.success && response.token) {
                this.setToken(response.token);
                return response.user;
            } else {
                throw new Error('Token invalide');
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    logout() {
        this.token = null;
        this.clearCache();
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem('spatial_auth_token');
        }
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('spatial_auth_token', token);
        }
    }

    // Gestion des simulations
    async getSimulations(filters = {}, page = 1, limit = 20) {
        const cacheKey = `simulations_${JSON.stringify(filters)}_${page}_${limit}`;
        
        return this.get('/simulations', {
            ...filters,
            page,
            limit
        }, cacheKey);
    }

    async getSimulation(id) {
        return this.get(`/simulations/${id}`, null, `simulation_${id}`);
    }

    async createSimulation(simulationData) {
        const response = await this.post('/simulations', simulationData);
        
        // Invalider le cache des simulations
        this.invalidateCache(/simulations/);
        
        return response;
    }

    async updateSimulation(id, updateData) {
        const response = await this.put(`/simulations/${id}`, updateData);
        
        // Invalider le cache
        this.invalidateCache(/simulations/);
        this.cache.delete(`simulation_${id}`);
        
        return response;
    }

    async deleteSimulation(id) {
        const response = await this.delete(`/simulations/${id}`);
        
        // Invalider le cache
        this.invalidateCache(/simulations/);
        this.cache.delete(`simulation_${id}`);
        
        return response;
    }

    async startSimulation(id) {
        return this.post(`/simulations/${id}/start`);
    }

    async pauseSimulation(id) {
        return this.post(`/simulations/${id}/pause`);
    }

    async stopSimulation(id) {
        return this.post(`/simulations/${id}/stop`);
    }

    // Données de recherche
    async getResearchData(filters = {}, limit = 100, offset = 0) {
        const cacheKey = `research_data_${JSON.stringify(filters)}_${limit}_${offset}`;
        
        return this.get('/research-data', {
            ...filters,
            limit,
            offset
        }, cacheKey);
    }

    async addResearchData(data) {
        const response = await this.post('/research-data', data);
        
        // Invalider le cache des données de recherche
        this.invalidateCache(/research_data/);
        
        return response;
    }

    async getResearchStatistics(simulationId = null) {
        const cacheKey = `research_stats_${simulationId || 'all'}`;
        
        return this.get('/research-data/statistics', {
            simulation_id: simulationId
        }, cacheKey);
    }

    // Collaboration
    async getCollaborationSessions() {
        return this.get('/collaboration', { action: 'list' }, 'collaboration_sessions');
    }

    async createCollaborationSession(sessionData) {
        const response = await this.post('/collaboration', {
            action: 'create_session',
            ...sessionData
        });
        
        this.invalidateCache('collaboration_sessions');
        return response;
    }

    async joinCollaborationSession(accessCode) {
        const response = await this.post('/collaboration', {
            action: 'join_session',
            access_code: accessCode
        });
        
        this.invalidateCache('collaboration_sessions');
        return response;
    }

    async sendCollaborationMessage(sessionId, message, messageType = 'text') {
        return this.post('/collaboration', {
            action: 'send_message',
            session_id: sessionId,
            message,
            message_type: messageType
        });
    }

    // Export de données
    async exportData(options) {
        return this.post('/export', options);
    }

    async getExports() {
        return this.get('/exports', {}, 'user_exports');
    }

    async downloadExport(exportId) {
        return this.get(`/export/${exportId}?download=true`, null, null, {
            responseType: 'blob'
        });
    }

    // Méthodes HTTP génériques
    async get(endpoint, params = null, cacheKey = null, config = {}) {
        // Vérifier le cache
        if (cacheKey && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        const url = this.buildURL(endpoint, params);
        const response = await this.fetchWithRetry(url, {
            method: 'GET',
            headers: this.defaultHeaders,
            ...config
        });

        const data = await this.parseResponse(response);

        // Mettre en cache si nécessaire
        if (cacheKey && data.success !== false) {
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
        }

        return data;
    }

    async post(endpoint, data = null, config = {}) {
        const url = this.buildURL(endpoint);
        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: this.defaultHeaders,
            body: data ? JSON.stringify(data) : undefined,
            ...config
        });

        return this.parseResponse(response);
    }

    async put(endpoint, data = null, config = {}) {
        const url = this.buildURL(endpoint);
        const response = await this.fetchWithRetry(url, {
            method: 'PUT',
            headers: this.defaultHeaders,
            body: data ? JSON.stringify(data) : undefined,
            ...config
        });

        return this.parseResponse(response);
    }

    async delete(endpoint, config = {}) {
        const url = this.buildURL(endpoint);
        const response = await this.fetchWithRetry(url, {
            method: 'DELETE',
            headers: this.defaultHeaders,
            ...config
        });

        return this.parseResponse(response);
    }

    // Utilitaires
    buildURL(endpoint, params = null) {
        let url = `${this.baseURL}${endpoint}`;
        
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    searchParams.append(key, params[key]);
                }
            });
            url += `?${searchParams.toString()}`;
        }
        
        return url;
    }

    async fetchWithRetry(url, options, retries = 3, backoff = 300) {
        for (let i = 0; i < retries; i++) {
            try {
                // Appliquer les intercepteurs de requête
                let config = { ...options };
                for (const interceptor of this.requestInterceptors) {
                    config = await interceptor(config);
                }

                const response = await fetch(url, config);

                // Appliquer les intercepteurs de réponse
                let processedResponse = response;
                for (const interceptor of this.responseInterceptors) {
                    processedResponse = await interceptor(processedResponse);
                }

                return processedResponse;

            } catch (error) {
                if (i === retries - 1) throw error;
                
                // Attendre avant de réessayer (backoff exponentiel)
                await this.sleep(backoff * Math.pow(2, i));
            }
        }
    }

    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (!response.ok) {
                throw {
                    status: response.status,
                    statusText: response.statusText,
                    data
                };
            }
            
            return data;
        } else if (contentType && contentType.includes('text/')) {
            const text = await response.text();
            
            if (!response.ok) {
                throw {
                    status: response.status,
                    statusText: response.statusText,
                    data: text
                };
            }
            
            return { success: true, data: text };
        } else {
            // Pour les fichiers binaires, retourner le blob
            const blob = await response.blob();
            
            if (!response.ok) {
                throw {
                    status: response.status,
                    statusText: response.statusText
                };
            }
            
            return {
                success: true,
                data: blob,
                contentType: contentType,
                filename: this.getFilenameFromResponse(response)
            };
        }
    }

    getFilenameFromResponse(response) {
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                return filenameMatch[1];
            }
        }
        return 'download';
    }

    handleResponseError(error) {
        console.error('Erreur API:', error);
        
        // Gérer les erreurs spécifiques
        if (error.status === 401) {
            // Token expiré ou invalide
            this.logout();
            this.redirectToLogin();
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else if (error.status === 403) {
            throw new Error('Accès non autorisé');
        } else if (error.status === 404) {
            throw new Error('Ressource non trouvée');
        } else if (error.status === 429) {
            throw new Error('Trop de requêtes. Veuillez patienter.');
        } else if (error.status >= 500) {
            throw new Error('Erreur serveur. Veuillez réessayer plus tard.');
        }
        
        // Erreur personnalisée du serveur
        if (error.data && error.data.error) {
            throw new Error(error.data.error);
        }
        
        throw new Error(error.statusText || 'Erreur de connexion');
    }

    redirectToLogin() {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    normalizeError(error) {
        if (error instanceof Error) {
            return error;
        } else if (typeof error === 'string') {
            return new Error(error);
        } else {
            return new Error('Une erreur est survenue');
        }
    }

    // Gestion du cache
    setCache(key, data, timeout = this.cacheTimeout) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            timeout
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        return null;
    }

    invalidateCache(pattern) {
        if (pattern instanceof RegExp) {
            for (const key of this.cache.keys()) {
                if (pattern.test(key)) {
                    this.cache.delete(key);
                }
            }
        } else if (typeof pattern === 'string') {
            this.cache.delete(pattern);
        } else {
            this.cache.clear();
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // Intercepteurs
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(onSuccess, onError = null) {
        this.responseInterceptors.push({
            onSuccess,
            onError
        });
    }

    // Utilitaires
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Statistiques et monitoring
    async getApiStatistics() {
        return this.get('/statistics/api');
    }

    async getSystemStatus() {
        return this.get('/status');
    }

    // Upload de fichiers
    async uploadFile(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        if (options.simulationId) {
            formData.append('simulation_id', options.simulationId);
        }
        
        if (options.dataType) {
            formData.append('data_type', options.dataType);
        }

        const response = await this.fetchWithRetry(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : ''
            },
            body: formData
        });

        return this.parseResponse(response);
    }

    // WebSocket pour les mises à jour en temps réel
    connectWebSocket() {
        if (typeof window === 'undefined') return null;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${protocol}//${window.location.host}/api/ws`;
        
        const ws = new WebSocket(wsURL);
        
        ws.onopen = () => {
            console.log('🔌 WebSocket connecté');
            
            // Authentifier la connexion WebSocket
            if (this.token) {
                ws.send(JSON.stringify({
                    type: 'auth',
                    token: this.token
                }));
            }
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket déconnecté');
            // Tentative de reconnexion après un délai
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        ws.onerror = (error) => {
            console.error('Erreur WebSocket:', error);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Erreur parsing message WebSocket:', error);
            }
        };
        
        return ws;
    }

    handleWebSocketMessage(data) {
        // Distribuer les messages aux écouteurs appropriés
        const event = new CustomEvent(`websocket:${data.type}`, {
            detail: data
        });
        
        window.dispatchEvent(event);
        
        // Gérer les types de messages spécifiques
        switch (data.type) {
            case 'simulation_update':
                this.invalidateCache(/simulations/);
                break;
            case 'research_data':
                this.invalidateCache(/research_data/);
                break;
            case 'collaboration_message':
                // Mettre à jour l'interface de collaboration
                break;
        }
    }

    // Destruction
    destroy() {
        this.clearCache();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        console.log('🧹 ApiClient détruit');
    }
}

// Export singleton
let apiClientInstance = null;

export function getApiClient() {
    if (!apiClientInstance) {
        apiClientInstance = new ApiClient();
        
        // Récupérer le token depuis le localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedToken = localStorage.getItem('spatial_auth_token');
            if (savedToken) {
                apiClientInstance.setToken(savedToken);
            }
        }
    }
    return apiClientInstance;
}

export { ApiClient };