import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { isPlatformBrowser } from '@angular/common';

export interface StemgraphLogoConfig {
  textStem: string;
  textGraph: string;
  size: number;
  depth: number;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  stemColor: number;
  graphColor: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
  rotationSpeed: number;
  signatureLine: boolean;
}

@Component({
  selector: 'app-stemgraph-3d',
  standalone: true,
  templateUrl: './stemgraph-3d.component.html',
  styleUrl: './stemgraph-3d.component.css',
})
export class Stemgraph3dComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() autoRotate = true;
  @Input() mouseParallax = true;
  @Input() scrollAnimation = true;
  @Input() interactive = false;
  @Input() glbUrl?: string;

  readonly config: StemgraphLogoConfig = {
    textStem: 'STEM',
    textGraph: 'graph',
    size: 1.28,
    depth: 0.30,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 5,
    stemColor: 0xf7faff,
    graphColor: 0x78a8ff,
    metalness: 0.72,
    roughness: 0.20,
    clearcoat: 1,
    rotationSpeed: 0.0025,
    signatureLine: true,
  };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private logo = new THREE.Group();
  private controls?: OrbitControls;

  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private pointerX = 0;
  private pointerY = 0;
  private targetX = 0;
  private targetY = 0;
  private scrollProgress = 0;
  private visible = true;
  private destroyed = false;

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
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0.1, 10.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x050912, 2.2));

    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(4, 5, 8);
    this.scene.add(key);

    const blue = new THREE.PointLight(0x4f8cff, 14, 18);
    blue.position.set(-4, 1, -2);
    this.scene.add(blue);

    const violet = new THREE.PointLight(0xa855f7, 7, 16);
    violet.position.set(5, -1, -2);
    this.scene.add(violet);

    this.scene.add(this.logo);

    if (this.glbUrl) {
      this.loadGlb(this.glbUrl);
    } else {
      this.buildProceduralLogo();
    }

    if (this.interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.065;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 15;
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
  }

  private buildProceduralLogo(): void {
    const loader = new FontLoader();

    loader.load(
      '/assets/stemgraph/helvetiker_bold.typeface.json',
      font => {
        if (this.destroyed) return;

        const stem = this.createText(font, this.config.textStem, this.config.stemColor);
        const graph = this.createText(font, this.config.textGraph, this.config.graphColor);

        const gap = 0.08;
        const total = stem.width + gap + graph.width;

        stem.mesh.position.x = -total / 2 + stem.width / 2;
        graph.mesh.position.x =
          -total / 2 + stem.width + gap + graph.width / 2;
        graph.mesh.position.z = 0.035;

        this.logo.add(stem.mesh, graph.mesh);

        if (this.config.signatureLine) {
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(total * 0.72, 0.018, 0.018),
            new THREE.MeshBasicMaterial({
              color: this.config.graphColor,
              transparent: true,
              opacity: 0.85,
            })
          );
          line.position.set(total * 0.13, -0.72, 0.15);
          this.logo.add(line);
        }
      }
    );
  }

  private createText(font: any, text: string, color: number) {
    const geometry = new TextGeometry(text, {
      font,
      size: this.config.size,
      depth: this.config.depth,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: this.config.bevelThickness,
      bevelSize: this.config.bevelSize,
      bevelSegments: this.config.bevelSegments,
    });

    geometry.computeBoundingBox();

    const width =
      geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;

    geometry.translate(-width / 2, -0.55, 0);

    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: this.config.metalness,
      roughness: this.config.roughness,
      clearcoat: this.config.clearcoat,
      clearcoatRoughness: 0.08,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    return { mesh, width };
  }

  private loadGlb(url: string): void {
    const loader = new GLTFLoader();

    loader.load(
      url,
      gltf => {
        if (this.destroyed) return;

        this.logo.add(gltf.scene);

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);
        if (maxAxis > 0) {
          const scale = 5 / maxAxis;
          gltf.scene.scale.setScalar(scale);
        }
      },
      undefined,
      error => {
        console.error('STEMgraph GLB could not be loaded:', error);
      }
    );
  }

  private bindInteraction(): void {
    if (this.mouseParallax) {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
    }

    if (this.scrollAnimation) {
      window.addEventListener('scroll', this.onScroll, {
        passive: true,
      });
    }

    window.addEventListener('blur', this.onBlur);
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    this.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  private onScroll = (): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const viewport = window.innerHeight;

    this.scrollProgress = THREE.MathUtils.clamp(
      (viewport - rect.top) / (viewport + rect.height),
      0,
      1
    );
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
  }

  private animate = (): void => {
    if (this.destroyed) return;

    this.animationId = requestAnimationFrame(this.animate);

    if (!this.visible) return;

    this.pointerX = THREE.MathUtils.lerp(this.pointerX, this.targetX, 0.055);
    this.pointerY = THREE.MathUtils.lerp(this.pointerY, this.targetY, 0.055);

    if (this.mouseParallax) {
      this.logo.rotation.x = THREE.MathUtils.lerp(
        this.logo.rotation.x,
        -this.pointerY * 0.08,
        0.06
      );
      this.logo.rotation.y = THREE.MathUtils.lerp(
        this.logo.rotation.y,
        this.pointerX * 0.14 +
          (this.autoRotate ? this.logo.rotation.y + this.config.rotationSpeed : 0),
        0.06
      );
    } else if (this.autoRotate) {
      this.logo.rotation.y += this.config.rotationSpeed;
    }

    if (this.scrollAnimation) {
      this.logo.position.y = THREE.MathUtils.lerp(
        this.logo.position.y,
        (0.5 - this.scrollProgress) * 0.55,
        0.04
      );
      this.logo.scale.setScalar(
        THREE.MathUtils.lerp(
          this.logo.scale.x,
          0.92 + this.scrollProgress * 0.08,
          0.04
        )
      );
    }

    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    this.destroyed = true;

    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.controls?.dispose();

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('scroll', this.onScroll);
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
  }
}
