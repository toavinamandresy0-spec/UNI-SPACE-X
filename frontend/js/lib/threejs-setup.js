// Configuration Three.js pour Spatial Research Lab
let THREE;

export async function initThreeJS() {
    if (typeof THREE === 'undefined') {
        await loadThreeJS();
    }
    
    // Configuration globale de Three.js
    THREE.Cache.enabled = true;
    
    console.log('✅ Three.js configuré');
    return THREE;
}

async function loadThreeJS() {
    return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') {
            resolve(THREE);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
            THREE = window.THREE;
            resolve(THREE);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Chargeurs supplémentaires
export async function loadGLTFLoader() {
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.min.js');
    return THREE.GLTFLoader;
}

export async function loadOrbitControls() {
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js');
    return THREE.OrbitControls;
}

async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Utilitaires Three.js
export function createScene(background = 0x0d1b2a) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    scene.fog = new THREE.Fog(background, 50, 300);
    return scene;
}

export function createCamera(width, height, fov = 60) {
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    return camera;
}

export function createRenderer(canvas, options = {}) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        ...options
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    return renderer;
}

export function createLights() {
    const lights = [];
    
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    lights.push(ambientLight);
    
    // Lumière directionnelle
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    lights.push(directionalLight);
    
    return lights;
}

// Export global
window.initThreeJS = initThreeJS;