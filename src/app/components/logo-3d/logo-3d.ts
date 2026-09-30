import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isPlatformBrowser } from '@angular/common';

export type Vec3 = [number, number, number];

export interface Logo3dLight {
  color: number;
  intensity: number;
  ground?: number;
  position?: Vec3;
}

export interface Logo3dLightConfig {
  ambient: Logo3dLight;
  key: Logo3dLight;
  rimLeft: Logo3dLight;
  rimRight: Logo3dLight;
  rimTop: Logo3dLight;
  exposure: number;
}

@Component({
  selector: 'app-logo-3d',
  standalone: true,
  templateUrl: './logo-3d.html',
  styleUrl: './logo-3d.css',
})

export class Logo3d implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() mouseParallax = true;
  @Input() scrollAnimation = true;
  @Input() glbUrl?: string;

  readonly lightConfig: Logo3dLightConfig = {
    ambient:   { color: 0x1a918c, ground: 0x1a918c, intensity: 5 },
    key:       { color: 0xffffff, intensity: 2.5, position: [0.6, -0.2, 0.7] },
    rimLeft:   { color: 0x2ac2bb, intensity: 30, position: [-4, -2, -4] },
    rimRight:  { color: 0x772093, intensity: 40, position: [4, 2, -4] },
    rimTop:    { color: 0xffffff, intensity: 7, position: [0, 4, -3] },
    exposure: 1.2,
  };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private logo = new THREE.Group();

  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private pointerX = 0;
  private pointerY = 0;
  private targetX = 0;
  private targetY = 0;
  private visible = true;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.initScene();
      this.bindInteraction();
      this.animate();
    });
  };

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 2.5);
    this.camera.lookAt(0.091, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.setupLights();

    this.scene.add(this.logo);

    if (this.glbUrl) {
      this.loadGlb(this.glbUrl);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    this.intersectionObserver.observe(canvas);
  };

  private setupLights(): void {
    const { ambient, key, rimLeft, rimRight, rimTop, exposure } = this.lightConfig;

    this.renderer.toneMappingExposure = exposure;

    this.scene.add(
      new THREE.HemisphereLight(ambient.color, ambient.ground, ambient.intensity)
    );

    [key, rimLeft, rimRight, rimTop].forEach(config => {
      const light = new THREE.DirectionalLight(config.color, config.intensity);
      light.position.set(...config.position!);
      this.scene.add(light);
    });
  };

  private loadGlb(url: string): void {
    const loader = new GLTFLoader();

    loader.load(
      url,
      gltf => {
        const model = gltf.scene;

        this.logo.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.set(-center.x, -center.y, -center.z);

        const maxAxis = Math.max(size.x, size.y, size.z);

        if (maxAxis > 0) {
          const scale = 4.7 / maxAxis;
          model.scale.setScalar(scale);
        }

        this.logo.position.set(0, 0, 0);
        this.logo.rotation.set(0, 0, 0);
      },
      undefined,
      error => {
        console.error('STEMgraph GLB could not be loaded:', error);
      }
    );
  };

  private bindInteraction(): void {
    if (this.mouseParallax) {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
    }

    window.addEventListener('blur', this.onBlur);
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.targetX = (event.clientX / window.innerWidth - 0.4) * 2;
    this.targetY = (event.clientY / window.innerHeight - 0.4) * 2;
  };

  private onBlur = (): void => {
    this.targetX = 0;
    this.targetY = 0;
  };

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (!this.visible) return;

    this.pointerX = THREE.MathUtils.lerp(this.pointerX, this.targetX, 0.055);
    this.pointerY = THREE.MathUtils.lerp(this.pointerY, this.targetY, 0.055);

    if (this.mouseParallax) {
      this.logo.rotation.x = THREE.MathUtils.lerp(
        this.logo.rotation.x,
        this.pointerY * 0.04,
        0.06
      );

      this.logo.rotation.y = THREE.MathUtils.lerp(
        this.logo.rotation.y,
        this.pointerX * 0.04,
        0.06
      );
    }

    if (this.scrollAnimation) {
      this.logo.position.y = THREE.MathUtils.lerp(
        this.logo.position.y,
        0,
        0.04
      );

      const breite = window.innerWidth;

      const logoScale = THREE.MathUtils.clamp(
        breite / 350,
        0.50,
        1.10
      );

      this.logo.scale.setScalar(
        THREE.MathUtils.lerp(
          this.logo.scale.x,
          logoScale,
          0.1
        )
      );
    }

    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('blur', this.onBlur);
    }

    this.logo.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;

      object.geometry.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    });

    this.renderer?.dispose();
  };
}
