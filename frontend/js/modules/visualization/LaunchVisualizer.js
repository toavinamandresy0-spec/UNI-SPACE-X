import { initThreeJS, createScene, createCamera, createRenderer, createLights, loadGLTFLoader } from '../../lib/threejs-setup.js';

export default class LaunchVisualizer {
  constructor({ canvas = null, background = 0x0d1b2a, fov = 60 } = {}) {
    this.canvas = canvas;
    this.background = background;
    this.fov = fov;

    this.THREE = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.loader = null;
    this.rocket = null;
    this._animId = null;
    this._startTime = null;
    this._launchConfig = null;
  }

  async init(canvas) {
    if (canvas) this.canvas = canvas;
    if (!this.canvas) throw new Error('Canvas element required');

    this.THREE = await initThreeJS();

    const width = this.canvas.clientWidth || this.canvas.width || 800;
    const height = this.canvas.clientHeight || this.canvas.height || 600;

    this.scene = createScene(this.background);
    this.camera = createCamera(width, height, this.fov);
    this.camera.position.set(0, 5, 20);

    this.renderer = createRenderer(this.canvas);
    this.renderer.setSize(width, height, false);

    const lights = createLights();
    lights.forEach((l) => this.scene.add(l));

    // simple ground helper
    const grid = new this.THREE.GridHelper(200, 40, 0x222222, 0x111111);
    this.scene.add(grid);

    // GLTF loader prepared but not instantiated
    this.GLTFLib = await loadGLTFLoader();
  }

  async loadModel(url, { scale = 1, onProgress = null } = {}) {
    if (!this.GLTFLib) this.GLTFLib = await loadGLTFLoader();
    const GLTFLoader = this.GLTFLib;
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const group = gltf.scene || gltf.scenes?.[0];
          if (!group) return reject(new Error('GLTF contains no scene'));
          group.scale.set(scale, scale, scale);
          group.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
          // center and set rocket reference
          group.position.set(0, 0, 0);
          this.rocket = group;
          this.scene.add(group);
          resolve(group);
        },
        (xhr) => {
          if (onProgress) onProgress(xhr.loaded / xhr.total);
        },
        (err) => reject(err)
      );
    });
  }

  startRenderLoop() {
    const render = (t) => {
      // basic resize handling
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (this.renderer && (this.canvas.width !== w || this.canvas.height !== h)) {
        this.renderer.setSize(w, h, false);
        if (this.camera) this.camera.aspect = w / h, this.camera.updateProjectionMatrix();
      }

      if (this._launchConfig && this.rocket) {
        this._updateLaunch(t);
      }

      this.renderer.render(this.scene, this.camera);
      this._animId = requestAnimationFrame(render);
    };

    if (!this._animId) this._animId = requestAnimationFrame(render);
  }

  stopRenderLoop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  async launch({ duration = 8000, altitude = 200, pitch = 0, onComplete = null } = {}) {
    if (!this.rocket) throw new Error('No rocket model loaded');

    this._launchConfig = { duration, altitude, pitch, onComplete };
    this._startTime = null;

    // Prepare rocket initial state
    this.rocket.position.set(0, 0, 0);
    this.rocket.rotation.set(0, 0, 0);

    // optionally adjust camera to follow
    this.camera.position.set(0, 20, 60);
    this.camera.lookAt(this.rocket.position);

    // start render loop if not running
    this.startRenderLoop();
  }

  _updateLaunch(timeMs) {
    if (!this._startTime) this._startTime = timeMs;
    const cfg = this._launchConfig;
    const elapsed = timeMs - this._startTime;
    const t = Math.min(1, elapsed / cfg.duration);

    // simple ease-out trajectory
    const ease = 1 - Math.pow(1 - t, 3);
    const y = ease * cfg.altitude;
    const z = -ease * (cfg.altitude * 0.2);

    this.rocket.position.set(0, y, z);
    this.rocket.rotation.x = cfg.pitch * Math.PI / 180 * ease;

    // camera follows behind and above
    const camTarget = new this.THREE.Vector3(0, y + 5, z + 20);
    this.camera.position.lerp(new this.THREE.Vector3(0, y + 20, z + 60), 0.05);
    this.camera.lookAt(camTarget);

    if (t >= 1) {
      // finished
      if (typeof cfg.onComplete === 'function') cfg.onComplete();
      this._launchConfig = null;
    }
  }

  dispose() {
    this.stopRenderLoop();
    if (this.rocket) {
      this.scene.remove(this.rocket);
      this.rocket.traverse((c) => { if (c.geometry) c.geometry.dispose && c.geometry.dispose(); if (c.material) { if (Array.isArray(c.material)) c.material.forEach(m => m.dispose && m.dispose()); else c.material.dispose && c.material.dispose(); } });
      this.rocket = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss && this.renderer.forceContextLoss();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
