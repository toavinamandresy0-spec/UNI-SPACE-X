// Application principale Spatial Research Lab
// Point d'entrée de l'application

import { StateManager } from './state-manager.js';
import { EventManager } from './event-handlers.js';
import { ApiClient } from '../modules/data-manager/ApiClient.js';
import { LocalStorage } from '../modules/data-manager/LocalStorage.js';
import { SimulationEngine } from '../modules/simulation-engine/SimulationEngine.js';
import { Visualization3D } from '../modules/visualization/Visualization3D.js';
import { CollaborationManager } from '../modules/collaboration/CollaborationManager.js';
import { initCharts, updatePerformanceChart } from '../lib/chartjs-config.js';
import { initThreeJS } from '../lib/threejs-setup.js';

class SpatialResearchApp {
    constructor() {
        this.stateManager = new StateManager();
        this.eventManager = new EventManager();
        this.apiClient = new ApiClient();
        this.localStorage = new LocalStorage();
        this.simulationEngine = new SimulationEngine();
        this.visualization = new Visualization3D();
        this.collaborationManager = new CollaborationManager();
        
        this.isInitialized = false;
        this.currentUser = null;
    }

    async init() {
        try {
            console.log('🚀 Initialisation de Spatial Research Lab...');
            
            // Initialiser le state manager
            await this.stateManager.init();
            
            // Vérifier l'authentification
            await this.checkAuthentication();
            
            // Initialiser les composants d'interface
            await this.initUI();
            
            // Initialiser les visualisations
            await this.initVisualizations();
            
            // Initialiser la collaboration
            await this.initCollaboration();
            
            // Charger les données initiales
            await this.loadInitialData();
            
            // Démarrer les mises à jour en temps réel
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Spatial Research Lab initialisé avec succès');
            
            this.addTerminalOutput('> Système spatial initialisé');
            this.addTerminalOutput('> Moteur de simulation quantique prêt');
            this.addTerminalOutput('> Interface de recherche opérationnelle');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError('Erreur d\'initialisation', error.message);
        }
    }

    async checkAuthentication() {
        const token = this.localStorage.get('auth_token');
        if (token) {
            try {
                const user = await this.apiClient.validateToken(token);
                this.currentUser = user;
                this.stateManager.setUser(user);
                this.updateUIForUser(user);
            } catch (error) {
                console.warn('Token invalide, déconnexion...');
                this.localStorage.remove('auth_token');
            }
        }
    }

    async initUI() {
        // Initialiser les écouteurs d'événements
        this.eventManager.init(this);
        
        // Initialiser les composants d'interface
        this.initNavigation();
        this.initSidebars();
        this.initModals();
        this.initTooltips();
        
        // Mettre à jour l'interface
        this.updateUI();
    }

    async initVisualizations() {
        // Initialiser les graphiques
        initCharts();
        
        // Initialiser la visualisation 3D
        await this.visualization.init('quantum-field-visualization');
        
        // Initialiser Three.js
        await initThreeJS();
    }

    async initCollaboration() {
        if (this.currentUser) {
            await this.collaborationManager.init(this.currentUser);
        }
    }

    async loadInitialData() {
        try {
            // Charger les simulations
            const simulations = await this.apiClient.getSimulations();
            this.stateManager.setSimulations(simulations);
            
            // Charger les données de recherche
            const researchData = await this.apiClient.getResearchData();
            this.stateManager.setResearchData(researchData);
            
            // Charger les statistiques
            const stats = await this.apiClient.getStatistics();
            this.stateManager.setStatistics(stats);
            
            // Mettre à jour les visualisations
            this.updateCharts();
            this.updateVisualizations();
            
        } catch (error) {
            console.warn('Erreur lors du chargement des données:', error);
        }
    }

    startRealTimeUpdates() {
        // Mettre à jour les données toutes les 30 secondes
        setInterval(() => {
            this.updateRealTimeData();
        }, 30000);
        
        // Mettre à jour l'interface utilisateur
        setInterval(() => {
            this.updateUI();
        }, 1000);
    }

    async updateRealTimeData() {
        try {
            const [simulations, researchData, stats] = await Promise.all([
                this.apiClient.getSimulations(),
                this.apiClient.getResearchData({ limit: 50 }),
                this.apiClient.getStatistics()
            ]);
            
            this.stateManager.setSimulations(simulations);
            this.stateManager.setResearchData(researchData);
            this.stateManager.setStatistics(stats);
            
            this.updateCharts();
            this.updateVisualizations();
            
        } catch (error) {
            console.warn('Erreur mise à jour temps réel:', error);
        }
    }

    updateUI() {
        this.updateSidebars();
        this.updateHeader();
        this.updateDashboard();
    }

    updateSidebars() {
        const state = this.stateManager.getState();
        
        // Mettre à jour la sidebar gauche
        this.updateLeftSidebar(state);
        
        // Mettre à jour la sidebar droite
        this.updateRightSidebar(state);
    }

    updateLeftSidebar(state) {
        // Métriques orbitales
        this.updateElement('altitude-value', `${state.orbital.altitude.value} ${state.orbital.altitude.unit}`);
        this.updateElement('inclination-value', `${state.orbital.inclination.value}${state.orbital.inclination.unit}`);
        this.updateElement('eccentricity-value', state.orbital.eccentricity.value);
        this.updateElement('period-value', `${state.orbital.period.value} ${state.orbital.period.unit}`);
        
        // Métriques de recherche
        this.updateElement('q-factor', state.research.qFactor.value);
        this.updateElement('isp-efficiency', `${state.research.ispEfficiency.value}${state.research.ispEfficiency.unit}`);
        this.updateElement('delta-v-residual', `${state.research.deltaVResidual.value} ${state.research.deltaVResidual.unit}`);
    }

    updateRightSidebar(state) {
        // Métriques scientifiques
        this.updateElement('quantum-delta-v', `${state.scientific.quantumDeltaV.value} ${state.scientific.quantumDeltaV.unit}`);
        this.updateElement('quantum-efficiency-value', `${state.scientific.quantumEfficiency.value}${state.scientific.quantumEfficiency.unit}`);
        this.updateElement('effective-isp', state.scientific.effectiveISP.value);
        this.updateElement('plasma-temp', state.scientific.plasmaTemp.value + state.scientific.plasmaTemp.unit);
        
        // Mettre à jour le graphique de performance
        updatePerformanceChart(state);
    }

    updateHeader() {
        const user = this.stateManager.getUser();
        if (user) {
            this.updateElement('user-name', `${user.first_name} ${user.last_name}`);
            this.updateElement('user-institution', user.institution);
        }
    }

    updateDashboard() {
        const state = this.stateManager.getState();
        
        // Mettre à jour les cartes de simulation
        this.updateSimulationCards(state.simulations);
        
        // Mettre à jour les statistiques
        this.updateStatistics(state.statistics);
    }

    updateSimulationCards(simulations) {
        const container = document.getElementById('simulation-cards-container');
        if (!container) return;
        
        container.innerHTML = simulations.map(sim => `
            <div class="simulation-card" data-id="${sim.id}">
                <div class="simulation-header">
                    <div>
                        <h4 class="simulation-title">${sim.name}</h4>
                        <span class="simulation-type badge badge-${sim.type}">${sim.type}</span>
                    </div>
                    <div class="simulation-status status-${sim.status}"></div>
                </div>
                <p class="simulation-description">${sim.description}</p>
                <div class="simulation-meta">
                    <span class="simulation-date">${new Date(sim.updated_at).toLocaleDateString()}</span>
                    <div class="simulation-actions">
                        <button class="btn btn-outline btn-sm" onclick="app.openSimulation(${sim.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="app.exportSimulation(${sim.id})">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStatistics(stats) {
        this.updateElement('total-simulations', stats.total_simulations || 0);
        this.updateElement('active-experiments', stats.active_experiments || 0);
        this.updateElement('data-points', this.formatNumber(stats.data_points || 0));
        this.updateElement('collaborators', stats.collaborators || 0);
    }

    updateCharts() {
        const state = this.stateManager.getState();
        
        // Mettre à jour tous les graphiques
        if (window.updateAllCharts) {
            window.updateAllCharts(state);
        }
    }

    updateVisualizations() {
        const state = this.stateManager.getState();
        
        // Mettre à jour la visualisation 3D
        if (this.visualization && this.visualization.update) {
            this.visualization.update(state);
        }
    }

    // Méthodes utilitaires
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    }

    addTerminalOutput(message) {
        const terminal = document.getElementById('terminal-output');
        if (terminal) {
            const line = document.createElement('div');
            line.textContent = `> ${message}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        }
    }

    showError(title, message) {
        // Implémentation basique d'affichage d'erreur
        console.error(`${title}: ${message}`);
        this.addTerminalOutput(`ERREUR: ${title} - ${message}`);
        
        // Vous pouvez utiliser une librairie de notifications ici
        if (window.showNotification) {
            window.showNotification(title, message, 'error');
        }
    }

    // Méthodes publiques pour l'interface
    async openSimulation(simulationId) {
        try {
            const simulation = await this.apiClient.getSimulation(simulationId);
            this.stateManager.setCurrentSimulation(simulation);
            this.showSimulationModal(simulation);
        } catch (error) {
            this.showError('Erreur', 'Impossible de charger la simulation');
        }
    }

    async exportSimulation(simulationId) {
        try {
            this.addTerminalOutput(`Export de la simulation ${simulationId}...`);
            const result = await this.apiClient.exportSimulation(simulationId);
            
            if (result.success) {
                this.addTerminalOutput('Export terminé avec succès');
                // Télécharger le fichier
                window.location.href = result.download_url;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError('Erreur d\'export', error.message);
        }
    }

    showSimulationModal(simulation) {
        // Implémentation de la modal de simulation
        const modal = document.getElementById('simulation-modal');
        if (modal) {
            // Remplir la modal avec les données de simulation
            modal.querySelector('.modal-title').textContent = simulation.name;
            modal.querySelector('.modal-content').innerHTML = `
                <div class="simulation-details">
                    <p><strong>Type:</strong> ${simulation.type}</p>
                    <p><strong>Statut:</strong> ${simulation.status}</p>
                    <p><strong>Description:</strong> ${simulation.description}</p>
                    <div class="simulation-parameters">
                        <h5>Paramètres</h5>
                        <pre>${JSON.stringify(simulation.parameters, null, 2)}</pre>
                    </div>
                </div>
            `;
            
            // Afficher la modal
            modal.style.display = 'block';
        }
    }

    // Gestion de l'authentification
    async login(email, password) {
        try {
            const result = await this.apiClient.login(email, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.stateManager.setUser(result.user);
                this.localStorage.set('auth_token', result.token, true);
                this.updateUIForUser(result.user);
                this.addTerminalOutput(`Connexion réussie: ${result.user.first_name} ${result.user.last_name}`);
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError('Erreur de connexion', error.message);
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.stateManager.setUser(null);
        this.localStorage.remove('auth_token');
        this.updateUIForUser(null);
        this.addTerminalOutput('Déconnexion réussie');
    }

    updateUIForUser(user) {
        if (user) {
            document.body.classList.add('user-logged-in');
            document.body.classList.remove('user-logged-out');
        } else {
            document.body.classList.add('user-logged-out');
            document.body.classList.remove('user-logged-in');
        }
    }

    // Gestion du mode plein écran
    toggleFullscreen() {
        const isFullscreen = document.body.classList.toggle('fullscreen-mode');
        
        const btn = document.getElementById('toggle-fullscreen');
        if (btn) {
            if (isFullscreen) {
                btn.innerHTML = '<i class="fas fa-compress"></i> Mode Normal';
                this.addTerminalOutput('Mode grand écran activé');
            } else {
                btn.innerHTML = '<i class="fas fa-expand"></i> Mode Grand Écran';
                this.addTerminalOutput('Mode normal activé');
            }
        }
        
        // Redimensionner les visualisations
        setTimeout(() => {
            if (this.visualization && this.visualization.resize) {
                this.visualization.resize();
            }
        }, 100);
    }

    // Destruction propre
    destroy() {
        if (this.visualization && this.visualization.destroy) {
            this.visualization.destroy();
        }
        
        if (this.collaborationManager && this.collaborationManager.destroy) {
            this.collaborationManager.destroy();
        }
        
        this.eventManager.destroy();
        this.isInitialized = false;
        
        console.log('🧹 Spatial Research Lab nettoyé');
    }
}

// Initialisation globale
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new SpatialResearchApp();
    await app.init();
    
    // Exposer l'application globalement pour le débogage
    window.app = app;
});

// Gestion de la fermeture de la page
window.addEventListener('beforeunload', () => {
    if (app && app.destroy) {
        app.destroy();
    }
});

// Export pour les modules
export { SpatialResearchApp };