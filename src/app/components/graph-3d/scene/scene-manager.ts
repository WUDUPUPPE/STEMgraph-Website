import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Graph3dConfig } from '../config/graph-3d.config';

export interface SceneManagerOptions {
  interactive: boolean;
  autoRotate: boolean;
}

/**
 * Kümmert sich um alles, was zur "Bühne" gehört:
 * Szene, Kamera, Renderer, Licht, Maussteuerung und Größenanpassung
 */
export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  readonly renderer: THREE.WebGLRenderer;

  // In dieser Gruppe liegen alle Objekte des Graphen (Knoten, Kanten, ...)
  readonly graphGroup = new THREE.Group();

  private controls?: OrbitControls;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: Graph3dConfig,
    options: SceneManagerOptions
  ) {
    this.camera.position.set(0, 0, 8);

    this.renderer = this.createRenderer();
    this.addLights();
    this.scene.add(this.graphGroup);

    if (options.interactive) {
      this.controls = this.createControls(options.autoRotate);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    return renderer;
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 8, 10);
    this.scene.add(key);

    const blue = new THREE.PointLight(0x4f8cff, 0.8, 15);
    blue.position.set(-6, 2, -4);
    this.scene.add(blue);
  }

  private createControls(autoRotate: boolean): OrbitControls {
    const controls = new OrbitControls(this.camera, this.canvas);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = this.config.minZoom;
    controls.maxDistance = this.config.maxZoom;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = this.config.autoRotateSpeed;

    return controls;
  }

  // Stellt ein, wie weit rein- und rausgezoomt werden darf
  setZoomLimits(minDistance: number, maxDistance: number): void {
    if (!this.controls) {
      return;
    }

    this.controls.minDistance = minDistance;
    this.controls.maxDistance = maxDistance;
    this.controls.update();
  }

  // Schaltet die Kamerasteuerung an/aus (z. B. während ein Knoten gezogen wird)
  setControlsEnabled(enabled: boolean): void {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();

    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer.dispose();
  }
}
