// Gestionnaire de collaboration en temps réel pour Spatial Research Lab
class CollaborationManager {
    constructor() {
        this.socket = null;
        this.session = null;
        this.participants = new Map();
        this.messages = [];
        this.isConnected = false;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 5;
        
        // État de la collaboration
        this.state = {
            isActive: false,
            isSharing: false,
            hasControl: false,
            annotations: [],
            cursorPositions: new Map()
        };
    }

    async init(user) {
        this.user = user;
        
        try {
            await this.connectWebSocket();
            this.setupEventListeners();
            this.loadPreviousSessions();
            
            console.log('✅ CollaborationManager initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation collaboration:', error);
            throw error;
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsURL = `${protocol}//${window.location.host}/api/collaboration/ws`;
            
            this.socket = new WebSocket(wsURL);
            
            this.socket.onopen = () => {
                console.log('🔌 WebSocket collaboration connecté');
                this.isConnected = true;
                this.reconnectionAttempts = 0;
                
                // Authentifier la connexion
                this.send('auth', { token: this.user.token });
                resolve();
            };
            
            this.socket.onclose = (event) => {
                console.log('🔌 WebSocket collaboration déconnecté:', event.code, event.reason);
                this.isConnected = false;
                this.handleDisconnection();
            };
            
            this.socket.onerror = (error) => {
                console.error('❌ Erreur WebSocket collaboration:', error);
                reject(error);
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
        });
    }

    handleMessage(message) {
        const { type, data, timestamp, sender } = message;
        
        switch (type) {
            case 'session_joined':
                this.handleSessionJoined(data);
                break;
            case 'participant_joined':
                this.handleParticipantJoined(data);
                break;
            case 'participant_left':
                this.handleParticipantLeft(data);
                break;
            case 'message':
                this.handleChatMessage(data);
                break;
            case 'annotation':
                this.handleAnnotation(data);
                break;
            case 'cursor_move':
                this.handleCursorMove(data);
                break;
            case 'control_take':
                this.handleControlTake(data);
                break;
            case 'control_release':
                this.handleControlRelease(data);
                break;
            case 'screen_share':
                this.handleScreenShare(data);
                break;
            case 'simulation_update':
                this.handleSimulationUpdate(data);
                break;
            default:
                console.warn('Type de message non géré:', type);
        }
        
        // Émettre un événement personnalisé
        this.emit(`collaboration:${type}`, { data, timestamp, sender });
    }

    // Gestion des sessions
    async createSession(sessionData) {
        if (!this.isConnected) {
            throw new Error('Non connecté au serveur de collaboration');
        }
        
        const response = await this.sendWithResponse('create_session', sessionData);
        
        if (response.success) {
            this.session = response.session;
            this.state.isActive = true;
            this.emit('session_created', this.session);
            return this.session;
        } else {
            throw new Error(response.error);
        }
    }

    async joinSession(accessCode) {
        if (!this.isConnected) {
            throw new Error('Non connecté au serveur de collaboration');
        }
        
        const response = await this.sendWithResponse('join_session', { access_code: accessCode });
        
        if (response.success) {
            this.session = response.session;
            this.state.isActive = true;
            this.participants = new Map(response.participants || []);
            this.emit('session_joined', this.session);
            return this.session;
        } else {
            throw new Error(response.error);
        }
    }

    async leaveSession() {
        if (!this.session) return;
        
        await this.send('leave_session', { session_id: this.session.id });
        
        this.session = null;
        this.state.isActive = false;
        this.participants.clear();
        this.messages = [];
        this.state.annotations = [];
        
        this.emit('session_left');
    }

    handleSessionJoined(data) {
        this.session = data.session;
        this.participants = new Map(data.participants);
        this.state.isActive = true;
        
        console.log(`👥 Rejoint la session: ${this.session.name}`);
        this.addSystemMessage(`Vous avez rejoint la session "${this.session.name}"`);
    }

    // Gestion des participants
    handleParticipantJoined(data) {
        this.participants.set(data.user.id, data.user);
        this.addSystemMessage(`${data.user.name} a rejoint la session`);
        this.emit('participant_joined', data.user);
    }

    handleParticipantLeft(data) {
        const user = this.participants.get(data.user_id);
        if (user) {
            this.participants.delete(data.user_id);
            this.addSystemMessage(`${user.name} a quitté la session`);
            this.emit('participant_left', user);
        }
    }

    // Messagerie
    async sendMessage(content, type = 'text') {
        if (!this.session) {
            throw new Error('Aucune session active');
        }
        
        const message = {
            session_id: this.session.id,
            content,
            type,
            timestamp: new Date().toISOString()
        };
        
        await this.send('send_message', message);
        
        // Ajouter localement immédiatement
        this.addMessage({
            ...message,
            sender: this.user,
            isOwn: true
        });
    }

    handleChatMessage(data) {
        this.addMessage({
            ...data,
            isOwn: data.sender.id === this.user.id
        });
    }

    addMessage(message) {
        this.messages.push(message);
        
        // Garder seulement les 100 derniers messages
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        
        this.emit('message_received', message);
    }

    addSystemMessage(content) {
        this.addMessage({
            content,
            type: 'system',
            timestamp: new Date().toISOString(),
            sender: { name: 'Système' },
            isOwn: false
        });
    }

    // Annotations
    async sendAnnotation(annotation) {
        if (!this.session) return;
        
        const annotationData = {
            session_id: this.session.id,
            ...annotation,
            timestamp: new Date().toISOString()
        };
        
        await this.send('send_annotation', annotationData);
        this.addLocalAnnotation(annotationData);
    }

    handleAnnotation(data) {
        // Ne pas ajouter ses propres annotations deux fois
        if (data.sender.id !== this.user.id) {
            this.addLocalAnnotation(data);
        }
    }

    addLocalAnnotation(annotation) {
        this.state.annotations.push(annotation);
        this.emit('annotation_added', annotation);
    }

    clearAnnotations() {
        this.state.annotations = [];
        this.emit('annotations_cleared');
    }

    // Contrôle partagé
    async takeControl(resource) {
        if (!this.session) return;
        
        await this.send('take_control', {
            session_id: this.session.id,
            resource,
            timestamp: new Date().toISOString()
        });
        
        this.state.hasControl = true;
        this.emit('control_taken', resource);
    }

    async releaseControl() {
        if (!this.session) return;
        
        await this.send('release_control', {
            session_id: this.session.id
        });
        
        this.state.hasControl = false;
        this.emit('control_released');
    }

    handleControlTake(data) {
        this.state.hasControl = data.user_id === this.user.id;
        this.emit('control_changed', {
            hasControl: this.state.hasControl,
            controller: data.user_id
        });
    }

    handleControlRelease(data) {
        this.state.hasControl = false;
        this.emit('control_released');
    }

    // Partage d'écran
    async startScreenShare() {
        if (!this.session) return;
        
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            this.screenStream = stream;
            this.state.isSharing = true;
            
            // Envoyer l'URL du stream (dans une vraie app, utiliser WebRTC)
            await this.send('start_screen_share', {
                session_id: this.session.id,
                stream_url: '...' // À implémenter avec WebRTC
            });
            
            this.emit('screen_share_started');
            
            // Gérer la fin du partage
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    this.stopScreenShare();
                };
            });
            
        } catch (error) {
            console.error('Erreur partage écran:', error);
            throw error;
        }
    }

    async stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        this.state.isSharing = false;
        
        if (this.session) {
            await this.send('stop_screen_share', {
                session_id: this.session.id
            });
        }
        
        this.emit('screen_share_stopped');
    }

    handleScreenShare(data) {
        this.emit('screen_share_update', data);
    }

    // Mouvement du curseur
    async sendCursorPosition(position) {
        if (!this.session) return;
        
        await this.send('cursor_move', {
            session_id: this.session.id,
            position,
            timestamp: Date.now()
        });
    }

    handleCursorMove(data) {
        this.state.cursorPositions.set(data.sender.id, {
            position: data.position,
            user: data.sender,
            timestamp: data.timestamp
        });
        
        this.emit('cursor_moved', data);
    }

    // Mises à jour de simulation
    async sendSimulationUpdate(update) {
        if (!this.session) return;
        
        await this.send('simulation_update', {
            session_id: this.session.id,
            update,
            timestamp: new Date().toISOString()
        });
    }

    handleSimulationUpdate(data) {
        this.emit('simulation_updated', data);
    }

    // Utilitaires de communication
    send(type, data) {
        if (!this.isConnected || !this.socket) {
            throw new Error('WebSocket non connecté');
        }
        
        const message = {
            type,
            data,
            timestamp: new Date().toISOString(),
            sender: {
                id: this.user.id,
                name: this.user.name
            }
        };
        
        this.socket.send(JSON.stringify(message));
    }

    sendWithResponse(type, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('WebSocket non connecté'));
                return;
            }
            
            const messageId = this.generateMessageId();
            const message = {
                type,
                data,
                message_id: messageId,
                timestamp: new Date().toISOString()
            };
            
            // Gestionnaire de réponse temporaire
            const responseHandler = (event) => {
                const response = JSON.parse(event.data);
                if (response.message_id === messageId) {
                    this.socket.removeEventListener('message', responseHandler);
                    clearTimeout(timeoutId);
                    resolve(response.data);
                }
            };
            
            const timeoutId = setTimeout(() => {
                this.socket.removeEventListener('message', responseHandler);
                reject(new Error('Timeout de la requête'));
            }, timeout);
            
            this.socket.addEventListener('message', responseHandler);
            this.socket.send(JSON.stringify(message));
        });
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Gestion de la reconnexion
    handleDisconnection() {
        if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
            const delay = Math.pow(2, this.reconnectionAttempts) * 1000;
            
            console.log(`Tentative de reconnexion dans ${delay}ms...`);
            
            setTimeout(() => {
                this.reconnectionAttempts++;
                this.connectWebSocket().catch(error => {
                    console.error('Échec reconnexion:', error);
                });
            }, delay);
        } else {
            console.error('Nombre maximum de tentatives de reconnexion atteint');
            this.emit('connection_lost');
        }
    }

    // Événements
    on(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        
        this.eventListeners.get(event).add(callback);
        
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    emit(event, data) {
        if (this.eventListeners && this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erreur dans l'écouteur ${event}:`, error);
                }
            });
        }
    }

    // Configuration des écouteurs
    setupEventListeners() {
        // Écouteurs pour les interactions utilisateur
        document.addEventListener('mousemove', (event) => {
            if (this.session && this.state.isActive) {
                this.sendCursorPosition({
                    x: event.clientX,
                    y: event.clientY
                });
            }
        });
        
        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.send('user_away', { session_id: this.session?.id });
            } else {
                this.send('user_back', { session_id: this.session?.id });
            }
        });
    }

    // Persistance des sessions
    loadPreviousSessions() {
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedSessions = localStorage.getItem('spatial_collaboration_sessions');
            if (savedSessions) {
                try {
                    this.previousSessions = JSON.parse(savedSessions);
                } catch (error) {
                    console.warn('Erreur chargement sessions précédentes:', error);
                }
            }
        }
    }

    saveSession(session) {
        if (!this.previousSessions) {
            this.previousSessions = [];
        }
        
        // Ajouter ou mettre à jour la session
        const existingIndex = this.previousSessions.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
            this.previousSessions[existingIndex] = session;
        } else {
            this.previousSessions.push(session);
        }
        
        // Garder seulement les 10 dernières sessions
        this.previousSessions = this.previousSessions.slice(-10);
        
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('spatial_collaboration_sessions', JSON.stringify(this.previousSessions));
        }
    }

    // Statistiques
    getStats() {
        return {
            participants: this.participants.size,
            messages: this.messages.length,
            annotations: this.state.annotations.length,
            sessionDuration: this.session ? Date.now() - new Date(this.session.created_at).getTime() : 0,
            isConnected: this.isConnected
        };
    }

    // Nettoyage
    destroy() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        if (this.screenStream) {
            this.stopScreenShare();
        }
        
        this.session = null;
        this.participants.clear();
        this.messages = [];
        this.state.annotations = [];
        this.state.cursorPositions.clear();
        
        if (this.eventListeners) {
            this.eventListeners.clear();
        }
        
        console.log('🧹 CollaborationManager nettoyé');
    }
}

export { CollaborationManager };