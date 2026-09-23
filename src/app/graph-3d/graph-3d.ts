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
  edgeFlowSegmentLength: number;
  edgeFlowSegmentsPerEdge: number;
  edgeFlowColor: number;
  edgeFlowOpacity: number;

  autoRotateSpeed: number;
  minZoom: number;
  maxZoom: number;
}

export interface GraphClusterConfig {
  nodeSpacing: number;
  desiredDistance: number;
  repulsion: number;
  attraction: number;
  centerForce: number;
  damping: number;
  iterations: number;
  edgeOpacity: number;
  edgeFlowOpacity: number;
  edgeFlowSegmentsPerEdge: number;
}

export type GraphLayoutMode = 'sphere' | 'cluster';

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
  @Input() layoutMode: GraphLayoutMode = 'sphere';

  /**
   * Alle visuellen Werte an einer Stelle.
   */
  readonly config: Graph3dConfig = {
    nodeBaseRadius: 0.10,
    nodeDegreeScale: 0.03,
    nodeMaxRadius: 0.15,

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

    layoutRadius: 3,

    nodePulseEnabled: false,
    nodePulseSpeed: 0.5,
    nodePulseStrength: 0.06,
    nodeHoverScale: 1.15,
    nodeHoverTransitionSpeed: 0.15,

    edgeFlowEnabled: true,
    edgeFlowSpeed: 0.06,
    edgeFlowSegmentLength: 0.02,
    edgeFlowSegmentsPerEdge: 15,
    edgeFlowColor: 0xffffff,
    edgeFlowOpacity: 0.3,

    autoRotateSpeed: 0.1,
    minZoom: 5,
    maxZoom: 19.8,
  };

  readonly clusterConfig: GraphClusterConfig = {
    nodeSpacing: 1.35,
    desiredDistance: 1.35,
    repulsion: 0.025,
    attraction: 0.012,
    centerForce: 0.004,
    damping: 0.82,
    iterations: 180,
    edgeOpacity: 0.55,
    edgeFlowOpacity: 0.45,
    edgeFlowSegmentsPerEdge: 10,
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
  private edgeFlows: THREE.Line[] = [];

  private edgeFlowPaths = new Map<
    THREE.Line,
    {
      source: THREE.Vector3;
      target: THREE.Vector3;
      offset: number;
    }
  >();

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

    this.edgeFlows.forEach(flow => {
      flow.geometry.dispose();
      (flow.material as THREE.Material).dispose();
    });

    this.edges = [];
    this.edgeMaterials = [];
    this.edgeFlows = [];
    this.edgeFlowPaths.clear();

    const degreeById = new Map<string, number>();
    data.nodes.forEach(node => degreeById.set(node.id, 0));
    data.edges.forEach(edge => {
      degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1);
      degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1);
    });

    const nodePositions =
      this.layoutMode === 'sphere'
        ? this.computeSpherePositions(data)
      : this.computeClusterPositions(data);

    data.nodes.forEach(node => {
      const position = nodePositions.get(node.id);

      if (!position) {
        return;
      }

      const degree = degreeById.get(node.id) ?? 0;

      const radius = Math.min(
        this.config.nodeBaseRadius + degree * this.config.nodeDegreeScale,
        this.config.nodeMaxRadius
      );

      const geometry = new THREE.SphereGeometry(
        radius,
        this.config.nodeSegments,
        this.config.nodeSegments
      );

      const material = new THREE.MeshPhysicalMaterial({
        color: this.config.nodeColor,
        metalness: this.config.nodeMetalness,
        roughness: this.config.nodeRoughness,
        clearcoat: this.config.nodeClearcoat,
        clearcoatRoughness: this.config.nodeClearcoatRoughness,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData['nodeId'] = node.id;
      mesh.userData['nodeData'] = node;
      mesh.scale.setScalar(1);

      this.graph.add(mesh);
      this.nodes.set(node.id, mesh);
      this.nodeBaseScale.set(node.id, 1);
    });

    data.edges.forEach((edge, edgeIndex) => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (!sourcePos || !targetPos) {
        return;
      }

      const edgePoints = [sourcePos, targetPos];

      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(
        edgePoints
      ) as THREE.BufferGeometry;

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: this.config.edgeColor,
        transparent: true,
        opacity:
          this.layoutMode === 'cluster'
            ? this.clusterConfig.edgeOpacity
            : this.config.edgeOpacity,
      });

      const line = new THREE.Line(edgeGeometry, edgeMaterial);

      this.graph.add(line);
      this.edges.push(line);
      this.edgeMaterials.push(edgeMaterial);

      if (this.config.edgeFlowEnabled) {
      const flowCount =
        this.layoutMode === 'cluster'
          ? this.clusterConfig.edgeFlowSegmentsPerEdge
          : this.config.edgeFlowSegmentsPerEdge;        const edgeOffset = edgeIndex / Math.max(1, data.edges.length);

        for (let index = 0; index < flowCount; index++) {
          const flowGeometry = new THREE.BufferGeometry();
          const positions = new Float32Array(6);

          flowGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
          );

          const flowMaterial = new THREE.LineBasicMaterial({
            color: this.config.edgeFlowColor,
            transparent: true,
            opacity:
              this.layoutMode === 'cluster'
                ? this.clusterConfig.edgeFlowOpacity
                : this.config.edgeFlowOpacity,
          });

          const flowLine = new THREE.Line(flowGeometry, flowMaterial);

          this.graph.add(flowLine);
          this.edgeFlows.push(flowLine);

          this.edgeFlowPaths.set(flowLine, {
            source: sourcePos.clone(),
            target: targetPos.clone(),
            offset: edgeOffset + index / flowCount,
          });
        }
      }
    });
  }

  private computeSpherePositions(
    data: GraphData
  ): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const { layoutRadius } = this.config;

    data.nodes.forEach((node, index) => {
      const phi = Math.acos(
        -1 + (2 * index) / data.nodes.length
      );

      const theta =
        Math.sqrt(data.nodes.length * Math.PI) * phi;

      const x =
        layoutRadius * Math.sin(phi) * Math.cos(theta);

      const y =
        layoutRadius * Math.sin(phi) * Math.sin(theta);

      const z = layoutRadius * Math.cos(phi);

      positions.set(
        node.id,
        new THREE.Vector3(x, y, z)
      );
    });

    return positions;
  }

  private computeClusterPositions(
    data: GraphData
  ): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const velocities = new Map<string, THREE.Vector3>();

    data.nodes.forEach(node => {
      positions.set(
        node.id,
        new THREE.Vector3(
          (Math.random() - 0.5) * this.clusterConfig.nodeSpacing * 4,
          (Math.random() - 0.5) * this.clusterConfig.nodeSpacing * 4,
          (Math.random() - 0.5) * this.clusterConfig.nodeSpacing * 4
        )
      );

      velocities.set(node.id, new THREE.Vector3());
    });

    const {iterations, repulsion, attraction, centerForce, damping, desiredDistance} = this.clusterConfig;

    for (let step = 0; step < iterations; step++) {
      data.nodes.forEach(nodeA => {
        const positionA = positions.get(nodeA.id);
        const velocityA = velocities.get(nodeA.id);

        if (!positionA || !velocityA) {
          return;
        }

        data.nodes.forEach(nodeB => {
          if (nodeA.id === nodeB.id) {
            return;
          }

          const positionB = positions.get(nodeB.id);

          if (!positionB) {
            return;
          }

          const difference = positionA.clone().sub(positionB);
          const distance = Math.max(difference.length(), 0.1);

          velocityA.add(
            difference
              .normalize()
              .multiplyScalar(
                repulsion / (distance * distance)
              )
          );
        });

        velocityA.add(
          positionA.clone().multiplyScalar(-centerForce)
        );
      });

      data.edges.forEach(edge => {
        const sourcePosition = positions.get(edge.source);
        const targetPosition = positions.get(edge.target);
        const sourceVelocity = velocities.get(edge.source);
        const targetVelocity = velocities.get(edge.target);

        if (
          !sourcePosition ||
          !targetPosition ||
          !sourceVelocity ||
          !targetVelocity
        ) {
          return;
        }

        const difference = targetPosition
          .clone()
          .sub(sourcePosition);

        const distance = difference.length();

        if (distance === 0) {
          return;
        }

        const force =
          (distance - desiredDistance) * attraction;

        const direction = difference.normalize();

        sourceVelocity.add(
          direction.clone().multiplyScalar(force)
        );

        targetVelocity.add(
          direction.clone().multiplyScalar(-force)
        );
      });

      data.nodes.forEach(node => {
        const position = positions.get(node.id);
        const velocity = velocities.get(node.id);

        if (!position || !velocity) {
          return;
        }

        velocity.multiplyScalar(damping);
        position.add(velocity);
      });
    }

    return positions;
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

      const direction = new THREE.Vector3()
        .subVectors(path.target, path.source);

      const edgeLength = direction.length();

      if (edgeLength === 0) {
        return;
      }

      direction.normalize();

      const start = new THREE.Vector3()
        .lerpVectors(path.source, path.target, progress);

      const end = start
        .clone()
        .addScaledVector(
          direction,
          this.config.edgeFlowSegmentLength
        );

      const positionAttribute = flow.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;

      positionAttribute.setXYZ(
        0,
        start.x,
        start.y,
        start.z
      );

      positionAttribute.setXYZ(
        1,
        end.x,
        end.y,
        end.z
      );

      positionAttribute.needsUpdate = true;
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
    this.edgeFlows.forEach(flow => {
      flow.geometry.dispose();
      (flow.material as THREE.Material).dispose();
    });

    this.renderer?.dispose();
  }
}