import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isPlatformBrowser } from '@angular/common';
import { Timer } from 'three';

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

export interface Graph3dConfig {

  nodeBaseRadius: number;
  nodeDegreeScale: number;
  nodeMaxRadius: number;

  nodeColor: number;
  nodeHoverColor: number;
  nodeHoverEmissive: number;
  nodeMetalness: number;
  nodeRoughness: number;
  nodeClearcoat: number;
  nodeClearcoatRoughness: number;
  nodeSegments: number;

  edgeColor: number;
  edgeOpacity: number;
  edgeHoverColor: number;
  edgeHoverOpacity: number;

  layoutRadius: number;

  nodePulseEnabled: boolean;
  nodePulseSpeed: number;
  nodePulseStrength: number;
  nodeHoverScale: number;
  nodeHoverTransitionSpeed: number;

   edgeFlowEnabled: boolean;
  edgeFlowSpeed: number;
  edgeFlowSize: number;
  edgeFlowColor: number;
  edgeFlowOpacity: number;

  autoRotateSpeed: number;
  minZoom: number;
  maxZoom: number;
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

  /**
   * Alle visuellen Werte an einer Stelle.
   */
  readonly config: Graph3dConfig = {
    nodeBaseRadius: 0.14,
    nodeDegreeScale: 0.03,
    nodeMaxRadius: 0.2,

    nodeColor: 0xc104ff,
    nodeHoverColor: 0x1a918c,
    nodeHoverEmissive: 0x2a1b3d,
    nodeMetalness: 0.8,
    nodeRoughness: 0.25,
    nodeClearcoat: 0.5,
    nodeClearcoatRoughness: 0.1,
    nodeSegments: 32,

    edgeColor: 0x1a918c,
    edgeOpacity: 0.35,
    edgeHoverColor: 0xa855f7,
    edgeHoverOpacity: 0.85,

    layoutRadius: 3.5,

    nodePulseEnabled: false,
    nodePulseSpeed: 0.5,
    nodePulseStrength: 0.06,
    nodeHoverScale: 1.15,
    nodeHoverTransitionSpeed: 0.15,

    edgeFlowEnabled: true,
    edgeFlowSpeed: 0.22,
    edgeFlowSize: 0.035,
    edgeFlowColor: 0x9ffcff,
    edgeFlowOpacity: 0.95,

    autoRotateSpeed: 0.1,
    minZoom: 6,
    maxZoom: 22.8,
  };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private graph = new THREE.Group();
  private controls?: OrbitControls;

  private nodes = new Map<string, THREE.Mesh>();
  private nodeBaseScale = new Map<string, number>();
  private edges: THREE.Line[] = [];
  private edgeMaterials: THREE.LineBasicMaterial[] = [];
  private edgeFlows: THREE.Mesh[] = [];
  private edgeFlowPaths = new Map<THREE.Mesh, {
    source: THREE.Vector3;
    target: THREE.Vector3;
    offset: number;
  }>();

  private edgeFlowGeometry?: THREE.SphereGeometry;
  private edgeFlowMaterial?: THREE.MeshBasicMaterial;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredNode: THREE.Mesh | null = null;
  private selectedNode: GraphNode | null = null;

  private timer = new Timer();
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
      this.controls.minDistance = this.config.minZoom;
      this.controls.maxDistance = this.config.maxZoom;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = this.config.autoRotateSpeed;
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private buildGraph(data: GraphData): void {
    while (this.graph.children.length > 0) {
      const child = this.graph.children[0];
      this.graph.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.nodes.clear();
    this.nodeBaseScale.clear();
    this.edges.forEach(edge => edge.geometry.dispose());
    this.edgeMaterials.forEach(material => material.dispose());
    this.edges = [];
    this.edgeMaterials = [];
    this.edgeFlows.forEach(flow => {
    this.graph.remove(flow);
    });

    this.edgeFlows = [];
    this.edgeFlowPaths.clear();

    this.edgeFlowGeometry?.dispose();
    this.edgeFlowMaterial?.dispose();
    this.edgeFlowGeometry = undefined;
    this.edgeFlowMaterial = undefined;

    const degreeById = new Map<string, number>();
    data.nodes.forEach(node => degreeById.set(node.id, 0));
    if (this.config.edgeFlowEnabled) {
      this.edgeFlowGeometry = new THREE.SphereGeometry(
        this.config.edgeFlowSize,
        12,
        12
      );

      this.edgeFlowMaterial = new THREE.MeshBasicMaterial({
        color: this.config.edgeFlowColor,
        transparent: true,
        opacity: this.config.edgeFlowOpacity,
      });
    }
    data.edges.forEach(edge => {
      degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1);
      degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1);
    });

    const nodePositions = new Map<string, THREE.Vector3>();
    const { layoutRadius } = this.config;

    data.nodes.forEach((node, index) => {
      const phi = Math.acos(-1 + (2 * index) / data.nodes.length);
      const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;

      const x = layoutRadius * Math.sin(phi) * Math.cos(theta);
      const y = layoutRadius * Math.sin(phi) * Math.sin(theta);
      const z = layoutRadius * Math.cos(phi);

      const degree = degreeById.get(node.id) ?? 0;
      const radius = Math.min(this.config.nodeBaseRadius + degree * this.config.nodeDegreeScale, this.config.nodeMaxRadius);

      const geometry = new THREE.SphereGeometry(
        radius, this.config.nodeSegments, this.config.nodeSegments);

      const material = new THREE.MeshPhysicalMaterial({
        color: this.config.nodeColor,
        metalness: this.config.nodeMetalness,
        roughness: this.config.nodeRoughness,
        clearcoat: this.config.nodeClearcoat,
        clearcoatRoughness: this.config.nodeClearcoatRoughness,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData['nodeId'] = node.id;
      mesh.userData['nodeData'] = node;
      mesh.scale.setScalar(1);

      this.graph.add(mesh);
      this.nodes.set(node.id, mesh);
      this.nodeBaseScale.set(node.id, 1);
      nodePositions.set(node.id, mesh.position.clone());
    });

    data.edges.forEach(edge => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (sourcePos && targetPos) {
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: this.config.edgeColor,
          transparent: true,
          opacity: this.config.edgeOpacity,
        });

        const points = [sourcePos, targetPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, edgeMaterial);

        this.graph.add(line);
        this.edges.push(line);
        this.edgeMaterials.push(edgeMaterial);

        if (this.config.edgeFlowEnabled && this.edgeFlowGeometry && this.edgeFlowMaterial) {
          const flow = new THREE.Mesh(
            this.edgeFlowGeometry,
            this.edgeFlowMaterial
          );

          flow.position.copy(sourcePos);

          this.graph.add(flow);
          this.edgeFlows.push(flow);

          this.edgeFlowPaths.set(flow, {
            source: sourcePos.clone(),
            target: targetPos.clone(),
            offset: Math.random(),
          });
        }
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
        this.setHoverState(this.hoveredNode, false);
        this.hoveredNode = hovered;
        this.setHoverState(hovered, true);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredNode) {
        this.setHoverState(this.hoveredNode, false);
        this.hoveredNode = null;
      }
      document.body.style.cursor = 'default';
    }
  };

  private setHoverState(mesh: THREE.Mesh | null, isHovered: boolean): void {
    if (!mesh) return;

    const material = mesh.material as THREE.MeshPhysicalMaterial;
    material.color.setHex(isHovered ? this.config.nodeHoverColor : this.config.nodeColor);
    material.emissive.setHex(isHovered ? this.config.nodeHoverEmissive : 0x000000);

    const nodeId = mesh.userData['nodeId'] as string;
    this.nodeBaseScale.set(nodeId, isHovered ? this.config.nodeHoverScale : 1);
  }

  private onClick = (): void => {
    if (this.hoveredNode) {
      const nodeData = this.hoveredNode.userData['nodeData'] as GraphNode;
      this.selectedNode = nodeData;
      console.log('Selected node:', nodeData);
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
  this.timer.update();

  if (!this.destroyed) {
    this.updateNodeAnimation();
    this.updateEdgeFlows();
  }

  this.controls?.update();
  this.renderer.render(this.scene, this.camera);
};

  private updateNodeAnimation(): void {
    const elapsed = this.timer.getElapsed();

    this.nodes.forEach((mesh, nodeId) => {
      const baseScale = this.nodeBaseScale.get(nodeId) ?? 1;
      const isHovered = mesh === this.hoveredNode;

      let targetScale = baseScale;

      if (this.config.nodePulseEnabled && !isHovered) {
        const pulse =
          1 +
          Math.sin(elapsed * this.config.nodePulseSpeed + mesh.position.x) *
            this.config.nodePulseStrength;
        targetScale = baseScale * pulse;
      }

      mesh.scale.setScalar(
        THREE.MathUtils.lerp(
          mesh.scale.x,
          targetScale,
          this.config.nodeHoverTransitionSpeed
        )
      );
    });
  }

  private updateEdgeFlows(): void {
    if (!this.config.edgeFlowEnabled) {
      return;
    }

    const elapsed = this.timer.getElapsed();

    this.edgeFlows.forEach(flow => {
      const path = this.edgeFlowPaths.get(flow);

      if (!path) {
        return;
      }

      const progress =
        (elapsed * this.config.edgeFlowSpeed + path.offset) % 1;

      flow.position.lerpVectors(
        path.source,
        path.target,
        progress
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.resizeObserver?.disconnect();
    this.controls?.dispose();

    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('click', this.onClick);
      document.body.style.cursor = 'default';
    }

    this.nodes.forEach(mesh => {
      mesh.geometry.dispose();

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    this.edges.forEach(edge => edge.geometry.dispose());
    this.edgeMaterials.forEach(material => material.dispose());
    this.edgeFlowGeometry?.dispose();
    this.edgeFlowMaterial?.dispose();

    this.renderer?.dispose();
  }
}