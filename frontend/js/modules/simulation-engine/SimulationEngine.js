// Moteur de simulation pour Spatial Research Lab
// Gère les calculs scientifiques et les simulations

class SimulationEngine {
    constructor() {
        this.isRunning = false;
        this.currentSimulation = null;
        this.simulationData = new Map();
        this.workers = new Map();
        this.callbacks = new Map();
        
        // Configuration par défaut
        this.config = {
            timeStep: 0.1, // secondes
            maxIterations: 10000,
            precision: 1e-6,
            realTimeFactor: 1.0
        };
        
        // État de la simulation
        this.state = {
            iteration: 0,
            currentTime: 0,
            progress: 0,
            status: 'idle',
            lastUpdate: Date.now()
        };
        
        this.setupWorkers();
    }

    // Initialisation
    async init() {
        console.log('🔄 Initialisation du moteur de simulation...');
        
        try {
            // Vérifier le support Web Worker
            if (typeof Worker === 'undefined') {
                throw new Error('Web Workers non supportés');
            }
            
            // Précharger les workers
            await this.preloadWorkers();
            
            // Initialiser les modèles physiques
            await this.initPhysicalModels();
            
            console.log('✅ Moteur de simulation initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation moteur:', error);
            throw error;
        }
    }

    async preloadWorkers() {
        const workerTypes = [
            'physics-calculator',
            'trajectory-optimizer', 
            'quantum-simulator',
            'data-processor'
        ];
        
        for (const type of workerTypes) {
            await this.createWorker(type);
        }
    }

    async createWorker(type) {
        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(`/js/workers/${type}-worker.js`);
                
                worker.onmessage = (event) => {
                    this.handleWorkerMessage(type, event.data);
                };
                
                worker.onerror = (error) => {
                    console.error(`Erreur worker ${type}:`, error);
                    this.handleWorkerError(type, error);
                };
                
                this.workers.set(type, worker);
                this.callbacks.set(type, new Map());
                
                // Attendre que le worker soit prêt
                worker.postMessage({ type: 'init' });
                
                const readyHandler = (event) => {
                    if (event.data.type === 'ready') {
                        worker.removeEventListener('message', readyHandler);
                        resolve(worker);
                    }
                };
                
                worker.addEventListener('message', readyHandler);
                
            } catch (error) {
                reject(new Error(`Impossible de créer le worker ${type}: ${error.message}`));
            }
        });
    }

    // Gestion des simulations
    async startSimulation(simulationConfig) {
        if (this.isRunning) {
            throw new Error('Une simulation est déjà en cours');
        }
        
        try {
            this.isRunning = true;
            this.currentSimulation = simulationConfig;
            this.state = {
                iteration: 0,
                currentTime: 0,
                progress: 0,
                status: 'running',
                lastUpdate: Date.now()
            };
            
            // Initialiser les données de simulation
            this.simulationData.clear();
            this.initializeSimulationData(simulationConfig);
            
            // Démarrer la boucle de simulation
            this.simulationLoop();
            
            // Notifier le début de la simulation
            this.emit('simulationStarted', {
                simulation: simulationConfig,
                timestamp: Date.now()
            });
            
            console.log('🚀 Simulation démarrée:', simulationConfig.name);
            
        } catch (error) {
            this.isRunning = false;
            this.state.status = 'error';
            this.emit('simulationError', { error: error.message });
            throw error;
        }
    }

    async stopSimulation() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.state.status = 'stopped';
        
        // Arrêter tous les workers
        for (const [type, worker] of this.workers) {
            worker.postMessage({ type: 'stop' });
        }
        
        // Notifier l'arrêt
        this.emit('simulationStopped', {
            simulation: this.currentSimulation,
            finalState: this.state,
            timestamp: Date.now()
        });
        
        console.log('🛑 Simulation arrêtée');
    }

    async pauseSimulation() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.state.status = 'paused';
        
        this.emit('simulationPaused', {
            simulation: this.currentSimulation,
            state: this.state
        });
    }

    async resumeSimulation() {
        if (this.state.status !== 'paused') return;
        
        this.isRunning = true;
        this.state.status = 'running';
        this.simulationLoop();
        
        this.emit('simulationResumed', {
            simulation: this.currentSimulation,
            state: this.state
        });
    }

    // Boucle de simulation principale
    async simulationLoop() {
        const startTime = Date.now();
        let frameCount = 0;
        
        while (this.isRunning && this.state.iteration < this.config.maxIterations) {
            const frameStart = Date.now();
            
            try {
                // Exécuter une itération de simulation
                await this.simulationStep();
                
                frameCount++;
                
                // Limiter le taux de rafraîchissement
                const frameTime = Date.now() - frameStart;
                const targetFrameTime = 1000 / 60; // 60 FPS
                
                if (frameTime < targetFrameTime) {
                    await this.sleep(targetFrameTime - frameTime);
                }
                
                // Mettre à jour les statistiques périodiquement
                if (frameCount % 10 === 0) {
                    this.updateStatistics();
                }
                
            } catch (error) {
                console.error('Erreur dans la boucle de simulation:', error);
                this.handleSimulationError(error);
                break;
            }
            
            // Vérifier la condition d'arrêt
            if (this.checkStopCondition()) {
                await this.completeSimulation();
                break;
            }
        }
        
        // Simulation terminée naturellement
        if (this.state.iteration >= this.config.maxIterations) {
            await this.completeSimulation();
        }
    }

    async simulationStep() {
        this.state.iteration++;
        this.state.currentTime += this.config.timeStep * this.config.realTimeFactor;
        
        // Exécuter les calculs en parallèle
        const calculations = [
            this.calculateOrbitalDynamics(),
            this.calculatePropulsion(),
            this.calculateEnvironmentalEffects(),
            this.calculateQuantumEffects()
        ];
        
        await Promise.all(calculations);
        
        // Mettre à jour la progression
        this.state.progress = (this.state.iteration / this.config.maxIterations) * 100;
        this.state.lastUpdate = Date.now();
        
        // Émettre les données de l'itération
        this.emit('simulationStep', {
            iteration: this.state.iteration,
            time: this.state.currentTime,
            progress: this.state.progress,
            data: this.getCurrentSimulationData()
        });
    }

    // Calculs scientifiques
    async calculateOrbitalDynamics() {
        const worker = this.workers.get('physics-calculator');
        if (!worker) return;
        
        return new Promise((resolve) => {
            const calculationId = this.generateId();
            
            this.callbacks.get('physics-calculator').set(calculationId, resolve);
            
            worker.postMessage({
                type: 'calculateOrbital',
                id: calculationId,
                data: {
                    time: this.state.currentTime,
                    timeStep: this.config.timeStep,
                    bodies: this.getCelestialBodies(),
                    spacecraft: this.getSpacecraftState()
                }
            });
        });
    }

    async calculatePropulsion() {
        const worker = this.workers.get('physics-calculator');
        if (!worker) return;
        
        return new Promise((resolve) => {
            const calculationId = this.generateId();
            
            this.callbacks.get('physics-calculator').set(calculationId, resolve);
            
            worker.postMessage({
                type: 'calculatePropulsion',
                id: calculationId,
                data: {
                    time: this.state.currentTime,
                    propulsionSystem: this.currentSimulation.propulsion,
                    fuelState: this.getFuelState(),
                    throttle: this.getThrottleSetting()
                }
            });
        });
    }

    async calculateQuantumEffects() {
        if (!this.currentSimulation.quantumEnabled) return;
        
        const worker = this.workers.get('quantum-simulator');
        if (!worker) return;
        
        return new Promise((resolve) => {
            const calculationId = this.generateId();
            
            this.callbacks.get('quantum-simulator').set(calculationId, resolve);
            
            worker.postMessage({
                type: 'calculateQuantum',
                id: calculationId,
                data: {
                    time: this.state.currentTime,
                    quantumState: this.getQuantumState(),
                    entanglement: this.getEntanglementData()
                }
            });
        });
    }

    // Gestion des données
    initializeSimulationData(config) {
        // Données orbitales initiales
        this.simulationData.set('trajectory', []);
        this.simulationData.set('telemetry', []);
        this.simulationData.set('performance', []);
        this.simulationData.set('quantum', []);
        
        // État initial du vaisseau
        const initialState = {
            position: config.initialConditions.position || [0, 0, 0],
            velocity: config.initialConditions.velocity || [0, 0, 0],
            attitude: config.initialConditions.attitude || [0, 0, 0],
            mass: config.initialConditions.mass || 1000,
            fuel: config.initialConditions.fuel || 800
        };
        
        this.simulationData.set('spacecraft', initialState);
        this.simulationData.set('celestialBodies', this.getInitialCelestialBodies());
    }

    getCurrentSimulationData() {
        return {
            iteration: this.state.iteration,
            time: this.state.currentTime,
            progress: this.state.progress,
            spacecraft: this.simulationData.get('spacecraft'),
            trajectory: this.simulationData.get('trajectory'),
            telemetry: this.simulationData.get('telemetry'),
            performance: this.simulationData.get('performance'),
            quantum: this.simulationData.get('quantum')
        };
    }

    // Modèles physiques
    async initPhysicalModels() {
        // Charger les modèles physiques
        const models = [
            this.loadGravitationalModel(),
            this.loadAtmosphericModel(),
            this.loadPropulsionModel(),
            this.loadQuantumModel()
        ];
        
        await Promise.all(models);
    }

    async loadGravitationalModel() {
        // Modèle gravitationnel (JGM, EGM, etc.)
        // Pour le moment, utilisation d'un modèle simplifié
        this.gravitationalModel = {
            calculateAcceleration: (position, celestialBodies) => {
                let totalAcceleration = [0, 0, 0];
                
                for (const body of celestialBodies) {
                    const r = this.vectorSubtract(position, body.position);
                    const distance = this.vectorMagnitude(r);
                    const acceleration = (body.gravitationalParameter) / (distance * distance);
                    const direction = this.vectorNormalize(r);
                    
                    totalAcceleration = this.vectorAdd(
                        totalAcceleration,
                        this.vectorScale(direction, acceleration)
                    );
                }
                
                return totalAcceleration;
            }
        };
    }

    // Utilitaires mathématiques
    vectorAdd(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    }

    vectorSubtract(v1, v2) {
        return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
    }

    vectorScale(v, scalar) {
        return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
    }

    vectorMagnitude(v) {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }

    vectorNormalize(v) {
        const mag = this.vectorMagnitude(v);
        if (mag === 0) return [0, 0, 0];
        return [v[0] / mag, v[1] / mag, v[2] / mag];
    }

    // Gestion des workers
    handleWorkerMessage(workerType, message) {
        const callbacks = this.callbacks.get(workerType);
        
        if (message.id && callbacks.has(message.id)) {
            const callback = callbacks.get(message.id);
            callbacks.delete(message.id);
            callback(message.data);
        }
        
        // Traiter les messages sans ID (notifications, erreurs)
        switch (message.type) {
            case 'error':
                this.handleWorkerError(workerType, message.error);
                break;
            case 'progress':
                this.emit('workerProgress', {
                    worker: workerType,
                    progress: message.progress
                });
                break;
        }
    }

    handleWorkerError(workerType, error) {
        console.error(`Erreur dans le worker ${workerType}:`, error);
        
        this.emit('workerError', {
            worker: workerType,
            error: error
        });
        
        // Si l'erreur est critique, arrêter la simulation
        if (error.critical) {
            this.stopSimulation();
        }
    }

    // Événements
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, new Set());
        }
        this.callbacks.get(event).add(callback);
        
        return () => {
            const listeners = this.callbacks.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    emit(event, data) {
        const listeners = this.callbacks.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erreur dans l'écouteur ${event}:`, error);
                }
            });
        }
    }

    // Conditions d'arrêt
    checkStopCondition() {
        if (!this.currentSimulation) return false;
        
        const spacecraft = this.simulationData.get('spacecraft');
        
        // Vérifier les conditions d'arrêt définies
        if (this.currentSimulation.stopConditions) {
            for (const condition of this.currentSimulation.stopConditions) {
                if (this.evaluateStopCondition(condition, spacecraft)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    evaluateStopCondition(condition, spacecraft) {
        switch (condition.type) {
            case 'fuel_depleted':
                return spacecraft.fuel <= 0;
            case 'orbit_achieved':
                return this.checkOrbitAchievement(condition.parameters, spacecraft);
            case 'time_elapsed':
                return this.state.currentTime >= condition.duration;
            case 'distance_reached':
                const distance = this.vectorMagnitude(spacecraft.position);
                return distance >= condition.distance;
            default:
                return false;
        }
    }

    checkOrbitAchievement(parameters, spacecraft) {
        // Vérifier si l'orbite cible est atteinte
        const currentOrbit = this.calculateOrbitalElements(spacecraft);
        
        return (
            Math.abs(currentOrbit.semiMajorAxis - parameters.semiMajorAxis) < parameters.tolerance &&
            Math.abs(currentOrbit.eccentricity - parameters.eccentricity) < parameters.tolerance &&
            Math.abs(currentOrbit.inclination - parameters.inclination) < parameters.tolerance
        );
    }

    calculateOrbitalElements(spacecraft) {
        // Calcul des éléments orbitaux à partir de la position et vitesse
        // Implémentation simplifiée pour l'exemple
        const position = spacecraft.position;
        const velocity = spacecraft.velocity;
        
        // Calcul du moment angulaire
        const h = this.vectorCross(position, velocity);
        const hMag = this.vectorMagnitude(h);
        
        // Calcul du vecteur d'excentricité
        const r = this.vectorMagnitude(position);
        const v = this.vectorMagnitude(velocity);
        const rv = this.vectorDot(position, velocity);
        
        const eccentricityVector = this.vectorSubtract(
            this.vectorScale(this.vectorCross(velocity, h), 1 / this.EARTH_MU),
            this.vectorScale(position, 1 / r)
        );
        
        const eccentricity = this.vectorMagnitude(eccentricityVector);
        
        // Calcul du demi-grand axe
        const energy = (v * v) / 2 - this.EARTH_MU / r;
        const semiMajorAxis = -this.EARTH_MU / (2 * energy);
        
        // Calcul de l'inclinaison
        const inclination = Math.acos(h[2] / hMag);
        
        return {
            semiMajorAxis,
            eccentricity,
            inclination: inclination * 180 / Math.PI // Conversion en degrés
        };
    }

    vectorCross(v1, v2) {
        return [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    }

    vectorDot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }

    // Constantes physiques
    get EARTH_MU() {
        return 3.986004418e14; // m^3/s^2 (paramètre gravitationnel de la Terre)
    }

    // Finalisation
    async completeSimulation() {
        this.isRunning = false;
        this.state.status = 'completed';
        this.state.progress = 100;
        
        // Générer le rapport de simulation
        const report = await this.generateSimulationReport();
        
        // Notifier la fin de la simulation
        this.emit('simulationCompleted', {
            simulation: this.currentSimulation,
            finalState: this.state,
            report: report,
            data: this.getCurrentSimulationData()
        });
        
        console.log('✅ Simulation terminée');
    }

    async generateSimulationReport() {
        return {
            simulationId: this.currentSimulation.id,
            duration: this.state.currentTime,
            iterations: this.state.iteration,
            success: this.checkMissionSuccess(),
            metrics: this.calculatePerformanceMetrics(),
            recommendations: this.generateRecommendations(),
            timestamp: new Date().toISOString()
        };
    }

    // Utilitaires
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStatistics() {
        this.emit('statisticsUpdate', {
            fps: this.calculateFPS(),
            memory: this.getMemoryUsage(),
            performance: this.getPerformanceMetrics()
        });
    }

    calculateFPS() {
        // Calcul simplifié du FPS
        const now = Date.now();
        const elapsed = now - this.state.lastUpdate;
        return elapsed > 0 ? 1000 / elapsed : 0;
    }

    getMemoryUsage() {
        // Estimation de l'utilisation mémoire
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    // Destruction
    destroy() {
        this.stopSimulation();
        
        // Terminer tous les workers
        for (const [type, worker] of this.workers) {
            worker.terminate();
        }
        
        this.workers.clear();
        this.callbacks.clear();
        this.simulationData.clear();
        
        console.log('🧹 SimulationEngine détruit');
    }
}

// Export singleton
let simulationEngineInstance = null;

export function getSimulationEngine() {
    if (!simulationEngineInstance) {
        simulationEngineInstance = new SimulationEngine();
    }
    return simulationEngineInstance;
}

export { SimulationEngine };