// Gestionnaire centralisé des événements de l'application
class EventManager {
    constructor() {
        this.handlers = new Map();
        this.app = null;
    }

    init(app) {
        this.app = app;
        this.setupGlobalHandlers();
        this.setupNavigationHandlers();
        this.setupSimulationHandlers();
        this.setupCollaborationHandlers();
        this.setupUIHandlers();
        this.setupKeyboardHandlers();
        
        console.log('✅ EventManager initialisé');
    }

    // Handlers globaux
    setupGlobalHandlers() {
        // Gestion du redimensionnement de la fenêtre
        this.addHandler(window, 'resize', this.handleResize.bind(this));
        
        // Gestion de la visibilité de la page
        this.addHandler(document, 'visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Gestion des erreurs globales
        this.addHandler(window, 'error', this.handleGlobalError.bind(this));
        this.addHandler(window, 'unhandledrejection', this.handleUnhandledRejection.bind(this));
    }

    setupNavigationHandlers() {
        // Navigation entre les vues
        this.addHandler('#dashboard-btn', 'click', () => this.switchView('dashboard'));
        this.addHandler('#simulations-btn', 'click', () => this.switchView('simulations'));
        this.addHandler('#research-btn', 'click', () => this.switchView('research'));
        this.addHandler('#collaboration-btn', 'click', () => this.switchView('collaboration'));
        this.addHandler('#exports-btn', 'click', () => this.switchView('exports'));
        
        // Boutons d'action principaux
        this.addHandler('#launch-btn', 'click', this.handleLaunchSimulation.bind(this));
        this.addHandler('#quantum-sim', 'click', this.handleQuantumSimulation.bind(this));
        this.addHandler('#export-data', 'click', this.handleExportData.bind(this));
        this.addHandler('#mission-config', 'click', this.handleMissionConfig.bind(this));
    }

    setupSimulationHandlers() {
        // Contrôles de simulation
        this.addHandler('.simulation-control', 'click', this.handleSimulationControl.bind(this));
        this.addHandler('.simulation-param', 'input', this.handleParameterChange.bind(this));
        this.addHandler('.simulation-preset', 'change', this.handlePresetChange.bind(this));
        
        // Gestion des étapes de lancement
        this.addHandler('#start-launch', 'click', this.handleStartLaunch.bind(this));
        this.addHandler('#pause-simulation', 'click', this.handlePauseSimulation.bind(this));
        this.addHandler('#reset-simulation', 'click', this.handleResetSimulation.bind(this));
    }

    setupCollaborationHandlers() {
        // Session de collaboration
        this.addHandler('#start-collaboration', 'click', this.handleStartCollaboration.bind(this));
        this.addHandler('#invite-collaborator', 'click', this.handleInviteCollaborator.bind(this));
        this.addHandler('#send-message', 'click', this.handleSendMessage.bind(this));
        this.addHandler('#collaboration-input', 'keypress', this.handleCollaborationInput.bind(this));
        
        // Outils de collaboration
        this.addHandler('.annotation-tool', 'click', this.handleAnnotationTool.bind(this));
        this.addHandler('.share-screen', 'click', this.handleShareScreen.bind(this));
    }

    setupUIHandlers() {
        // Mode plein écran
        this.addHandler('#toggle-fullscreen', 'click', this.handleFullscreenToggle.bind(this));
        
        // Panneaux dépliants
        this.addHandler('.panel-toggle', 'click', this.handlePanelToggle.bind(this));
        
        // Onglets
        this.addHandler('.tab-button', 'click', this.handleTabSwitch.bind(this));
        
        // Modals
        this.addHandler('.modal-close', 'click', this.handleModalClose.bind(this));
        this.addHandler('.modal-backdrop', 'click', this.handleModalClose.bind(this));
        
        // Tooltips
        this.setupTooltipHandlers();
        
        // Chargement paresseux
        this.setupLazyLoading();
    }

    setupKeyboardHandlers() {
        // Raccourcis clavier globaux
        this.addHandler(document, 'keydown', this.handleKeyboardShortcuts.bind(this));
    }

    // Méthodes pour ajouter des handlers
    addHandler(selector, event, handler, options = {}) {
        const elements = typeof selector === 'string' 
            ? document.querySelectorAll(selector)
            : [selector];
        
        elements.forEach(element => {
            if (element) {
                const wrappedHandler = (e) => {
                    try {
                        handler.call(this, e, this.app);
                    } catch (error) {
                        console.error('Erreur dans le handler:', error);
                        this.handleError(error);
                    }
                };
                
                element.addEventListener(event, wrappedHandler, options);
                
                // Stocker la référence pour pouvoir retirer l'événement plus tard
                const handlerKey = `${selector}-${event}`;
                if (!this.handlers.has(handlerKey)) {
                    this.handlers.set(handlerKey, []);
                }
                this.handlers.get(handlerKey).push({
                    element,
                    event,
                    handler: wrappedHandler,
                    options
                });
            }
        });
    }

    removeHandlers(selector, event) {
        const handlerKey = `${selector}-${event}`;
        const handlers = this.handlers.get(handlerKey);
        
        if (handlers) {
            handlers.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.handlers.delete(handlerKey);
        }
    }

    // Handlers d'événements
    handleResize(event) {
        if (this.app && this.app.visualization) {
            setTimeout(() => {
                this.app.visualization.resize();
            }, 100);
        }
        
        // Mettre à jour les dispositions responsives
        this.updateResponsiveLayout();
    }

    handleVisibilityChange(event) {
        const isVisible = !document.hidden;
        
        if (isVisible) {
            // Reprendre les mises à jour en temps réel
            this.app?.stateManager?.startAutoUpdates?.();
        } else {
            // Mettre en pause les mises à jour intensives
            // (implémentation dépendante de l'application)
        }
    }

    handleGlobalError(event) {
        const error = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        };
        
        this.handleError(error);
    }

    handleUnhandledRejection(event) {
        const error = {
            message: 'Promise rejetée non gérée',
            reason: event.reason
        };
        
        this.handleError(error);
        event.preventDefault();
    }

    handleError(error) {
        console.error('Erreur interceptée:', error);
        
        // Ajouter à l'état de l'application
        if (this.app?.stateManager) {
            this.app.stateManager.addError(error);
        }
        
        // Afficher une notification à l'utilisateur
        this.showNotification('Erreur', error.message || 'Une erreur est survenue', 'error');
    }

    // Navigation
    switchView(viewName) {
        if (!this.app) return;
        
        // Mettre à jour l'état de l'interface
        this.app.stateManager.state.ui.currentView = viewName;
        
        // Cacher toutes les vues
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Afficher la vue active
        const activeView = document.getElementById(`${viewName}-view`);
        if (activeView) {
            activeView.classList.remove('hidden');
        }
        
        // Mettre à jour la navigation active
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Charger les données spécifiques à la vue
        this.loadViewData(viewName);
        
        console.log(`🔄 Navigation vers: ${viewName}`);
    }

    loadViewData(viewName) {
        if (!this.app) return;
        
        switch (viewName) {
            case 'simulations':
                this.app.loadSimulationsData();
                break;
            case 'research':
                this.app.loadResearchData();
                break;
            case 'collaboration':
                this.app.loadCollaborationData();
                break;
            case 'exports':
                this.app.loadExportsData();
                break;
        }
    }

    // Simulation
    handleLaunchSimulation(event) {
        if (!this.app) return;
        
        const button = event.target.closest('#launch-btn');
        const isRunning = this.app.simulationEngine?.isRunning;
        
        if (isRunning) {
            this.app.simulationEngine.stop();
            button.innerHTML = '<i class="fas fa-rocket"></i> Lancer Simulation';
        } else {
            this.app.simulationEngine.start();
            button.innerHTML = '<i class="fas fa-stop"></i> Arrêter Simulation';
        }
    }

    handleQuantumSimulation(event) {
        this.showModal('quantum-simulation-modal');
        this.app.addTerminalOutput('> Lancement de la simulation quantique...');
    }

    handleMissionConfig(event) {
        this.showModal('mission-config-modal');
    }

    handleSimulationControl(event) {
        const control = event.target.closest('.simulation-control');
        const action = control.dataset.action;
        const simulationId = control.dataset.simulationId;
        
        if (!action || !simulationId) return;
        
        switch (action) {
            case 'start':
                this.startSimulation(simulationId);
                break;
            case 'pause':
                this.pauseSimulation(simulationId);
                break;
            case 'stop':
                this.stopSimulation(simulationId);
                break;
            case 'clone':
                this.cloneSimulation(simulationId);
                break;
            case 'export':
                this.exportSimulation(simulationId);
                break;
        }
    }

    async startSimulation(simulationId) {
        try {
            this.showLoading(`Démarrage de la simulation ${simulationId}...`);
            
            const result = await this.app.apiClient.startSimulation(simulationId);
            
            if (result.success) {
                this.showNotification('Simulation démarrée', 'La simulation a été lancée avec succès', 'success');
                this.app.addTerminalOutput(`> Simulation ${simulationId} démarrée`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    // Collaboration
    handleStartCollaboration(event) {
        if (!this.app?.collaborationManager) return;
        
        const isActive = this.app.collaborationManager.isActive;
        
        if (isActive) {
            this.app.collaborationManager.stopSession();
            event.target.innerHTML = '<i class="fas fa-video"></i> Démarrer Session';
        } else {
            this.app.collaborationManager.startSession();
            event.target.innerHTML = '<i class="fas fa-stop"></i> Arrêter Session';
        }
    }

    handleSendMessage(event) {
        const input = document.getElementById('collaboration-input');
        const message = input.value.trim();
        
        if (message && this.app?.collaborationManager) {
            this.app.collaborationManager.sendMessage(message);
            input.value = '';
        }
    }

    handleCollaborationInput(event) {
        if (event.key === 'Enter') {
            this.handleSendMessage(event);
        }
    }

    // UI Handlers
    handleFullscreenToggle(event) {
        if (this.app) {
            this.app.toggleFullscreen();
        }
    }

    handlePanelToggle(event) {
        const panel = event.target.closest('.panel');
        panel?.classList.toggle('collapsed');
    }

    handleTabSwitch(event) {
        const tabButton = event.target.closest('.tab-button');
        const tabGroup = tabButton.closest('.tabs');
        const tabName = tabButton.dataset.tab;
        
        if (!tabGroup || !tabName) return;
        
        // Mettre à jour les boutons d'onglet
        tabGroup.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        tabButton.classList.add('active');
        
        // Mettre à jour le contenu des onglets
        const tabContent = tabGroup.nextElementSibling;
        if (tabContent && tabContent.classList.contains('tab-content')) {
            tabContent.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            const activePane = tabContent.querySelector(`[data-tab="${tabName}"]`);
            if (activePane) {
                activePane.classList.add('active');
            }
        }
    }

    handleModalClose(event) {
        const modal = event.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Raccourcis clavier
    handleKeyboardShortcuts(event) {
        // Ignorer si l'utilisateur est en train de taper dans un champ
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const ctrl = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;
        
        switch (event.key) {
            case 'F11':
                event.preventDefault();
                this.handleFullscreenToggle(event);
                break;
                
            case 'Escape':
                this.closeAllModals();
                break;
                
            case '1':
                if (ctrl) {
                    event.preventDefault();
                    this.switchView('dashboard');
                }
                break;
                
            case '2':
                if (ctrl) {
                    event.preventDefault();
                    this.switchView('simulations');
                }
                break;
                
            case '3':
                if (ctrl) {
                    event.preventDefault();
                    this.switchView('research');
                }
                break;
                
            case 's':
                if (ctrl && shift) {
                    event.preventDefault();
                    this.handleExportData(event);
                }
                break;
                
            case '?':
                if (ctrl) {
                    event.preventDefault();
                    this.showHelpModal();
                }
                break;
        }
    }

    // Utilitaires UI
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showLoading(message = 'Chargement...') {
        // Implémentation d'un indicateur de chargement
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            loadingEl.querySelector('.loading-message').textContent = message;
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    showNotification(title, message, type = 'info') {
        // Implémentation basique de notification
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        
        // Vous pouvez intégrer une librairie de notifications ici
        if (window.Toast) {
            window.Toast[type](message, title);
        }
    }

    setupTooltipHandlers() {
        // Tooltips simples
        this.addHandler('[data-tooltip]', 'mouseenter', this.showTooltip.bind(this));
        this.addHandler('[data-tooltip]', 'mouseleave', this.hideTooltip.bind(this));
    }

    showTooltip(event) {
        const element = event.target;
        const tooltipText = element.dataset.tooltip;
        
        if (!tooltipText) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
        
        element._currentTooltip = tooltip;
    }

    hideTooltip(event) {
        const element = event.target;
        if (element._currentTooltip) {
            element._currentTooltip.remove();
            element._currentTooltip = null;
        }
    }

    setupLazyLoading() {
        // Chargement paresseux des images
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    updateResponsiveLayout() {
        const width = window.innerWidth;
        const body = document.body;
        
        // Ajouter/supprimer des classes en fonction de la largeur
        body.classList.toggle('mobile-layout', width < 768);
        body.classList.toggle('tablet-layout', width >= 768 && width < 1024);
        body.classList.toggle('desktop-layout', width >= 1024);
        
        // Masquer/afficher les sidebars sur mobile
        if (width < 768) {
            document.querySelectorAll('.sidebar').forEach(sidebar => {
                sidebar.classList.add('mobile-hidden');
            });
        }
    }

    // Export de données
    async handleExportData(event) {
        if (!this.app) return;
        
        const format = event.target.dataset.format || 'json';
        
        try {
            this.showLoading(`Génération de l'export ${format.toUpperCase()}...`);
            
            const exportData = await this.app.apiClient.exportData({
                format,
                dataType: 'all',
                includeMetadata: true
            });
            
            if (exportData.success) {
                this.downloadFile(exportData.download_url, `spatial_export_${Date.now()}.${format}`);
                this.showNotification('Export réussi', 'Vos données ont été exportées', 'success');
            } else {
                throw new Error(exportData.error);
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Nettoyage
    destroy() {
        // Retirer tous les écouteurs d'événements
        this.handlers.forEach((handlers, key) => {
            handlers.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        
        this.handlers.clear();
        this.app = null;
        
        console.log('🧹 EventManager détruit');
    }
}

// Export singleton
let eventManagerInstance = null;

export function getEventManager() {
    if (!eventManagerInstance) {
        eventManagerInstance = new EventManager();
    }
    return eventManagerInstance;
}

export { EventManager };