// Moteur de visualisation 3D pour Spatial Research Lab
class Visualization3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.objects = new Map();
        this.animations = new Map();
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            antialias: true,
            alpha: true,
            shadows: true,
            fog: true,
            stats: false
        };
    }

    async init(containerId, options = {}) {
        try {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                throw new Error(`Container ${containerId} non trouvé`);
            }

            // Fusionner la configuration
            this.config = { ...this.config, ...options };

            // Initialiser Three.js
            await this.setupThreeJS();
            
            // Créer la scène
            this.setupScene();
            
            // Configurer la caméra
            this.setupCamera();
            
            // Configurer le rendu
            this.setupRenderer();
            
            // Configurer les contrôles
            this.setupControls();
            
            // Ajouter l'éclairage
            this.setupLighting();
            
            // Créer l'environnement
            await this.setupEnvironment();
            
            // Démarrer la boucle de rendu
            this.startRenderLoop();
            
            // Gérer le redimensionnement
            this.setupResizeHandler();
            
            this.isInitialized = true;
            console.log('✅ Visualisation 3D initialisée');

        } catch (error) {
            console.error('❌ Erreur initialisation visualisation 3D:', error);
            throw error;
        }
    }

    async setupThreeJS() {
        // Charger Three.js dynamiquement
        if (typeof THREE === 'undefined') {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
        }
        
        // Charger les contrôles Orbit
        await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js');
        
        // Charger les chargeurs supplémentaires si nécessaires
        await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.min.js');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1b2a);
        this.scene.fog = new THREE.Fog(0x0d1b2a, 50, 300);
    }

    setupCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.antialias,
            alpha: this.config.alpha
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = this.config.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        this.container.appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI;
    }

    setupLighting() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        this.objects.set('ambientLight', ambientLight);

        // Lumière directionnelle principale
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        this.objects.set('directionalLight', directionalLight);

        // Lumières d'accentuation
        const pointLight1 = new THREE.PointLight(0x00bcd4, 0.5, 100);
        pointLight1.position.set(0, 5, 10);
        this.scene.add(pointLight1);
        this.objects.set('pointLight1', pointLight1);

        const pointLight2 = new THREE.PointLight(0x7b1fa2, 0.3, 100);
        pointLight2.position.set(10, 5, 0);
        this.scene.add(pointLight2);
        this.objects.set('pointLight2', pointLight2);
    }

    async setupEnvironment() {
        // Créer le système solaire
        await this.createSolarSystem();
        
        // Ajouter des étoiles en arrière-plan
        this.createStarfield();
        
        // Ajouter des grilles de référence
        this.createGrids();
    }

    async createSolarSystem() {
        // Soleil
        const sun = this.createCelestialBody('sun', {
            radius: 2,
            color: 0xffd700,
            emissive: 0xff9500,
            position: [0, 0, 0]
        });

        // Terre
        const earth = this.createCelestialBody('earth', {
            radius: 0.5,
            color: 0x2233ff,
            emissive: 0x112266,
            position: [10, 0, 0]
        });

        // Lune
        const moon = this.createCelestialBody('moon', {
            radius: 0.1,
            color: 0x888888,
            emissive: 0x444444,
            position: [11, 0, 0]
        });

        // Orbites
        this.createOrbit('earth_orbit', 10, 0x00bcd4);
        this.createOrbit('moon_orbit', 1, 0x7b1fa2, earth);

        // Animation des orbites
        this.animateOrbit(earth, 10, 0.001);
        this.animateOrbit(moon, 1, 0.01, earth);
    }

    createCelestialBody(name, options) {
        const {
            radius = 1,
            color = 0xffffff,
            emissive = 0x000000,
            position = [0, 0, 0]
        } = options;

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color,
            emissive,
            shininess: 100
        });

        const body = new THREE.Mesh(geometry, material);
        body.position.set(...position);
        body.castShadow = true;
        body.receiveShadow = true;

        this.scene.add(body);
        this.objects.set(name, body);

        return body;
    }

    createOrbit(name, radius, color, parent = null) {
        const geometry = new THREE.RingGeometry(radius - 0.01, radius + 0.01, 64);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const orbit = new THREE.Mesh(geometry, material);
        orbit.rotation.x = Math.PI / 2;

        if (parent) {
            parent.add(orbit);
        } else {
            this.scene.add(orbit);
        }

        this.objects.set(name, orbit);
        return orbit;
    }

    animateOrbit(body, radius, speed, parent = null) {
        const animation = {
            radius,
            speed,
            angle: 0,
            parent
        };

        this.animations.set(body.uuid, animation);
    }

    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true
        });

        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
        this.objects.set('stars', stars);
    }

    createGrids() {
        // Grille principale
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        this.objects.set('grid', gridHelper);

        // Axes de référence
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        this.objects.set('axes', axesHelper);
    }

    // Méthodes publiques pour ajouter des objets
    addSpacecraft(name, options = {}) {
        const spacecraft = this.createSpacecraftModel(options);
        this.objects.set(name, spacecraft);
        return spacecraft;
    }

    createSpacecraftModel(options) {
        const group = new THREE.Group();

        // Corps principal
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            emissive: 0x222222
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Moteurs
        const engineGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
        const engineMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4500,
            emissive: 0xff0000
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.x = -0.6;
        group.add(engine);

        // Panneaux solaires
        const solarPanelGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.4);
        const solarPanelMaterial = new THREE.MeshPhongMaterial({
            color: 0x00bcd4,
            emissive: 0x0066aa
        });

        const leftPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
        leftPanel.position.y = 0.5;
        leftPanel.position.z = 0.2;
        group.add(leftPanel);

        const rightPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
        rightPanel.position.y = -0.5;
        rightPanel.position.z = 0.2;
        group.add(rightPanel);

        group.castShadow = true;
        group.receiveShadow = true;

        this.scene.add(group);
        return group;
    }

    addTrajectory(name, points, color = 0x00ff00) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color });
        const trajectory = new THREE.Line(geometry, material);
        
        this.scene.add(trajectory);
        this.objects.set(name, trajectory);
        return trajectory;
    }

    updateTrajectory(name, points) {
        const trajectory = this.objects.get(name);
        if (trajectory && trajectory.geometry) {
            trajectory.geometry.setFromPoints(points);
            trajectory.geometry.attributes.position.needsUpdate = true;
        }
    }

    // Animation et mises à jour
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
            this.render();
        };
        animate();
    }

    update() {
        // Mettre à jour les contrôles
        if (this.controls) {
            this.controls.update();
        }

        // Mettre à jour les animations
        this.updateAnimations();

        // Mettre à jour les effets spéciaux
        this.updateEffects();
    }

    updateAnimations() {
        const now = Date.now();
        
        this.animations.forEach((animation, uuid) => {
            const body = this.scene.getObjectByProperty('uuid', uuid);
            if (!body) return;

            animation.angle += animation.speed;
            
            const x = Math.cos(animation.angle) * animation.radius;
            const z = Math.sin(animation.angle) * animation.radius;
            
            if (animation.parent) {
                body.position.set(x, 0, z);
            } else {
                body.position.set(x, body.position.y, z);
            }
        });
    }

    updateEffects() {
        // Effets de scintillement des étoiles
        const stars = this.objects.get('stars');
        if (stars) {
            stars.rotation.y += 0.0001;
        }

        // Effets de lumière dynamique
        const pointLight1 = this.objects.get('pointLight1');
        if (pointLight1) {
            pointLight1.intensity = 0.5 + Math.sin(Date.now() * 0.001) * 0.2;
        }
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Gestion des résolutions
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    resize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // Utilitaires de chargement
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Méthodes de contrôle de la caméra
    focusOn(object, duration = 1000) {
        if (!object) return;

        const targetPosition = new THREE.Vector3();
        object.getWorldPosition(targetPosition);

        this.animateCameraTo(targetPosition, duration);
    }

    animateCameraTo(targetPosition, duration) {
        const startPosition = this.camera.position.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Animation easing
            const easeProgress = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            this.controls.target.lerp(targetPosition, easeProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Gestion des matériaux et textures
    async loadTexture(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(url, resolve, undefined, reject);
        });
    }

    // Export et capture
    captureScreenshot() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    // Nettoyage
    destroy() {
        // Arrêter la boucle de rendu
        this.isInitialized = false;

        // Supprimer tous les objets
        this.objects.forEach((object, name) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.scene.remove(object);
        });

        this.objects.clear();
        this.animations.clear();

        // Nettoyer le renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }

        // Supprimer les écouteurs d'événements
        window.removeEventListener('resize', this.resize);

        console.log('🧹 Visualisation 3D nettoyée');
    }
}

export { Visualization3D };