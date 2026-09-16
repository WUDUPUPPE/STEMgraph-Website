import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isPlatformBrowser } from '@angular/common';

export interface GraphNode {
  id: string;
  teaches?: string;
  author?: string;
  firstused?: string;
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Component({
  selector: 'app-graph-3d',
  imports: [],
  templateUrl: './graph-3d.html',
  styleUrl: './graph-3d.css',
})

export class Graph3d implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() graphData?: GraphData;
  @Input() autoRotate = true;
  @Input() interactive = true;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private graph = new THREE.Group();
  private controls?: OrbitControls;
  private nodes = new Map<string, THREE.Mesh>();
  private edges: THREE.Line[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredNode: THREE.Mesh | null = null;
  private selectedNode: GraphNode | null = null;

  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.initScene();
      this.bindInteraction();
      if (this.graphData) {
        this.buildGraph(this.graphData);
      }
      this.animate();
    });
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 8, 10);
    this.scene.add(key);

    const blue = new THREE.PointLight(0x4f8cff, 0.8, 15);
    blue.position.set(-6, 2, -4);
    this.scene.add(blue);

    this.scene.add(this.graph);

    if (this.interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 4;
      this.controls.maxDistance = 20;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 0.6;
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private buildGraph(data: GraphData): void {
    // Clear existing
    while (this.graph.children.length > 0) {
      const child = this.graph.children[0];
      this.graph.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.nodes.clear();
    this.edges.forEach(edge => edge.geometry.dispose());
    this.edges = [];

    // Create nodes as spheres
    const nodePositions = new Map<string, THREE.Vector3>();
    const radius = 0.18;

    data.nodes.forEach((node, index) => {
      const phi = Math.acos(-1 + (2 * index) / data.nodes.length);
      const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;

      const x = 3.5 * Math.sin(phi) * Math.cos(theta);
      const y = 3.5 * Math.sin(phi) * Math.sin(theta);
      const z = 3.5 * Math.cos(phi);

      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x78a8ff,
        metalness: 0.6,
        roughness: 0.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData.nodeId = node.id;
      mesh.userData.nodeData = node;

      this.graph.add(mesh);
      this.nodes.set(node.id, mesh);
      nodePositions.set(node.id, mesh.position.clone());
    });

    // Create edges as lines
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x4f8cff,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });

    data.edges.forEach(edge => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (sourcePos && targetPos) {
        const points = [sourcePos, targetPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, edgeMaterial);
        this.graph.add(line);
        this.edges.push(line);
      }
    });
  }

  private bindInteraction(): void {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('click', this.onClick, { passive: true });
  }

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.nodes.values())
    );

    if (intersects.length > 0) {
      const hovered = intersects[0].object as THREE.Mesh;
      if (this.hoveredNode !== hovered) {
        if (this.hoveredNode) {
          (this.hoveredNode.material as THREE.MeshPhysicalMaterial).color.setHex(0x78a8ff);
          (this.hoveredNode.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000);
        }
        this.hoveredNode = hovered;
        (hovered.material as THREE.MeshPhysicalMaterial).color.setHex(0xa855f7);
        (hovered.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x2a1b3d);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredNode) {
        (this.hoveredNode.material as THREE.MeshPhysicalMaterial).color.setHex(0x78a8ff);
        (this.hoveredNode.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000);
        this.hoveredNode = null;
      }
      document.body.style.cursor = 'default';
    }
  };

  private onClick = (): void => {
    if (this.hoveredNode) {
      const nodeData = this.hoveredNode.userData.nodeData as GraphNode;
      this.selectedNode = nodeData;
      // Hier könntest du ein Event emitieren oder eine Service-Methode aufrufen
      console.log('Selected node:', nodeData);
      // Beispiel: this.challengeSelected.emit(nodeData);
    }
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
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('click', this.onClick);

    this.nodes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.edges.forEach(edge => edge.geometry.dispose());
    this.renderer?.dispose();
  }
}