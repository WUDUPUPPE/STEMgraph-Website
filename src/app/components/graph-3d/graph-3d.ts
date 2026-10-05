import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isPlatformBrowser } from '@angular/common';
import { GraphResponse, Node, Edge } from '../../api/models';
import { Timer } from 'three';
import { NodeDetailCarousel } from '../node-detail-carousel/node-detail-carousel';


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

  nodeHoverScale: number;
  nodeHoverTransitionSpeed: number;

  nodeShadowEnabled: boolean;
  nodeShadowScale: number;
  nodeShadowColor: number;
  nodeShadowOpacity: number;

  selectedRingEnabled: boolean;
  selectedRingColor: number;
  selectedRingOpacity: number;
  selectedRingScale: number;
  selectedRingPulseSpeed: number;
  selectedRingPulseStrength: number;

  edgeColor: number;
  edgeOpacity: number;
  edgeHoverOpacity: number;

  layoutRadius: number;

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

  livePhysicsEnabled: boolean;
  livePhysicsStrength: number;
  livePhysicsDamping: number;
  livePhysicsMaxDistance: number;

  physicsFramesRemaining: number;

  liveSpringStrength: number;
  liveSpringDistance: number;
  liveNeighborPull: number;

  edgeOpacity: number;
  edgeFlowSpeed: number;
  edgeFlowOpacity: number;
  edgeFlowSegmentsPerEdge: number;
  edgeFlowSegmentLength: number;

  minZoom: number;
  maxZoom: number;
}

export type GraphLayoutMode = 'sphere' | 'cluster';

@Component({
  selector: 'app-graph-3d',
  standalone: true,
  imports: [NodeDetailCarousel],
  templateUrl: './graph-3d.html',
  styleUrl: './graph-3d.css',
})

export class Graph3d implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() graphData?: GraphResponse | null = null;
  @Input() autoRotate = true;
  @Input() interactive = true;
  @Input() layoutMode: GraphLayoutMode = 'sphere';

  @Input() isAdmin = false;

  readonly config: Graph3dConfig = {
    nodeBaseRadius: 0.08,
    nodeDegreeScale: 0.01,
    nodeMaxRadius: 0.12,

    nodeColor: 0xc104ff,
    nodeHoverColor: 0x1a918c,
    nodeHoverEmissive: 0x2a1b3d,
    nodeMetalness: 0.8,
    nodeRoughness: 0.25,
    nodeClearcoat: 0.5,
    nodeClearcoatRoughness: 0.1,
    nodeSegments: 20,

    nodeHoverScale: 1.12,
    nodeHoverTransitionSpeed: 0.15,

    nodeShadowEnabled: true,
    nodeShadowScale: 1.03,
    nodeShadowColor: 0x572368,
    nodeShadowOpacity: 0.77,

    selectedRingEnabled: true,
    selectedRingColor: 0x1a918c,
    selectedRingOpacity: 0.45,
    selectedRingScale: 1.1,
    selectedRingPulseSpeed: 2,
    selectedRingPulseStrength: 0.15,

    edgeColor: 0xffffff,
    edgeOpacity: 0.15,
    edgeHoverOpacity: 0.85,

    layoutRadius: 3,

    edgeFlowEnabled: true,
    edgeFlowSpeed: 0.05,
    edgeFlowSegmentLength: 0.04,
    edgeFlowSegmentsPerEdge: 8,
    edgeFlowColor: 0x1a918c,
    edgeFlowOpacity: 0.50,

    autoRotateSpeed: 0.1,
    minZoom: 5,
    maxZoom: 19.8,
  };

  readonly clusterConfig: GraphClusterConfig = {
    nodeSpacing: 0.35,
    desiredDistance: 0.8,
    repulsion: 0.015,
    attraction: 0.1,
    centerForce: 0.003,
    damping: 0.92,
    iterations: 220,

    livePhysicsEnabled: true,
    livePhysicsStrength: 0.18,
    livePhysicsDamping: 0.28,
    livePhysicsMaxDistance: 600,

    physicsFramesRemaining: 240,

    liveSpringStrength: 0.05,
    liveSpringDistance: 0.4,
    liveNeighborPull: 0.08,

    edgeOpacity: 0.15,
    edgeFlowSpeed: 0.14,
    edgeFlowOpacity: 0.70,
    edgeFlowSegmentsPerEdge: 5,
    edgeFlowSegmentLength: 0.06,

    minZoom: 12,
    maxZoom: 62,
  };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private graph = new THREE.Group();
  private controls?: OrbitControls;

  private nodes = new Map<string, THREE.Mesh>();
  private nodeShadows = new Map<string, THREE.Mesh>();
  private nodeBaseScale = new Map<string, number>();
  private nodeById = new Map<string, Node>();

  readonly hoverTooltip = {
    visible: false,
    x: 0,
    y: 0,
    node: null as Node | null,
  };

  private edges: THREE.Line[] = [];
  private edgeMaterials: THREE.LineBasicMaterial[] = [];
  private edgeFlows: THREE.Line[] = [];

  private edgeConnections = new Map<
    THREE.Line,
    {
      sourceId: string;
      targetId: string;
    }
  >();

  private edgeFlowPaths = new Map<
    THREE.Line,
    {
      sourceId: string;
      targetId: string;
      offset: number;
    }
  >();

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private hoveredNode: THREE.Mesh | null = null;

  private selectedNode: Node | null = null;
  carouselOpen = false;
  carouselCurrent: Node | null = null;
  carouselPredecessors: Node[] = [];
  carouselSuccessors: Node[] = [];
  private selectedRing: THREE.Mesh | null = null;

  private draggedNode: THREE.Mesh | null = null;
  private dragPlane = new THREE.Plane();
  private dragIntersection = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private dragStartPosition = new THREE.Vector3();
  private dragEdgeLengths = new Map<THREE.Line, number>();

  private physicsFramesRemaining = 0;

  private liveVelocities = new Map<string, THREE.Vector3>();

  private timer = new Timer();
  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

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
  };

  openChallenge(node: Node): void {
    console.log('Open challenge:', node.id);
  };

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
  };

  private buildGraph(data: GraphResponse): void {
    while (this.graph.children.length > 0) {
      const child = this.graph.children[0];
      this.graph.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    this.nodes.clear();
    this.nodeShadows.clear();
    this.nodeBaseScale.clear();
    this.liveVelocities.clear();
    this.nodeById.clear();

    for (const node of data.nodes) {
      this.nodeById.set(node.id, node);
    }

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
    this.edgeConnections.clear();

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

      if (this.config.nodeShadowEnabled) {
        const shadowGeometry = new THREE.SphereGeometry(
          radius * this.config.nodeShadowScale,
          this.config.nodeSegments,
          this.config.nodeSegments
        );

        const shadowMaterial = new THREE.MeshBasicMaterial({
          color: this.config.nodeShadowColor,
          transparent: true,
          opacity: this.config.nodeShadowOpacity,
          side: THREE.BackSide,
          depthWrite: false,
        });

        const shadowMesh = new THREE.Mesh(
          shadowGeometry, shadowMaterial
        );

        shadowMesh.position.copy(position);

        this.graph.add(shadowMesh);
        this.nodeShadows.set(node.id, shadowMesh);
      }
      mesh.userData['nodeId'] = node.id;
      mesh.userData['nodeData'] = node;
      mesh.scale.setScalar(1);

      this.graph.add(mesh);
      this.nodes.set(node.id, mesh);
      this.liveVelocities.set(
        node.id,
        new THREE.Vector3()
      );
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
      this.edgeConnections.set(line, {
        sourceId: edge.source,
        targetId: edge.target,
      });

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
            sourceId: edge.source,
            targetId: edge.target,
            offset: edgeOffset + index / flowCount,
          });
        }
      }
    });
    if (this.controls) {
      this.controls.minDistance =
        this.layoutMode === 'cluster'
          ? this.clusterConfig.minZoom
          : this.config.minZoom;

      this.controls.maxDistance =
        this.layoutMode === 'cluster'
          ? this.clusterConfig.maxZoom
          : this.config.maxZoom;

      this.controls.update();
    }
  };

  private computeSpherePositions(
    data: GraphResponse
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
  };

  private computeClusterPositions(
    data: GraphResponse
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
  };

  private bindInteraction(): void {
    window.addEventListener('click', this.onClick, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
  };

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.draggedNode) {
      this.updateHoverTooltip(null);
      if (
        this.raycaster.ray.intersectPlane(
          this.dragPlane,
          this.dragIntersection
        )
      ) {
        const previousPosition = this.draggedNode.position.clone();

          this.draggedNode.position.copy(
            this.dragIntersection.clone().add(this.dragOffset)
          );

          const draggedNodeId =
            this.draggedNode.userData['nodeId'] as string;

          const movement = this.draggedNode.position
            .clone()
            .sub(previousPosition);

          this.updateNodeShadow(draggedNodeId);

          this.applyLiveClusterPhysics(
            draggedNodeId,
            movement
          );

          this.updateConnectedEdges();
      }

      return;
    }

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

      this.updateHoverTooltip(
        hovered.userData['nodeData'] as Node,
        event
      );
    } else {
      if (this.hoveredNode) {
        this.setHoverState(this.hoveredNode, false);
        this.hoveredNode = null;
      }

      this.updateHoverTooltip(null);
      document.body.style.cursor = 'default';
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (
      this.layoutMode !== 'cluster' ||
      !this.hoveredNode
    ) {
      return;
    }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.mouse.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    this.mouse.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.draggedNode = this.hoveredNode;
    this.dragStartPosition.copy(this.draggedNode.position);
    this.dragEdgeLengths.clear();

    this.edgeConnections.forEach((connection, line) => {
      const source = this.nodes.get(connection.sourceId);
      const target = this.nodes.get(connection.targetId);

      if (!source || !target) {
        return;
      }

      this.dragEdgeLengths.set(
        line,
        source.position.distanceTo(target.position)
      );
    });

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    this.dragPlane.setFromNormalAndCoplanarPoint(
      cameraDirection,
      this.draggedNode.position
    );

    if (
      this.raycaster.ray.intersectPlane(
        this.dragPlane,
        this.dragIntersection
      )
    ) {
      this.dragOffset.copy(this.draggedNode.position)
        .sub(this.dragIntersection);
    }

    this.controls!.enabled = false;

    this.canvasRef.nativeElement.setPointerCapture(
      event.pointerId
    );

    document.body.style.cursor = 'grabbing';
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.draggedNode) {

      return;
    }

    this.canvasRef.nativeElement.releasePointerCapture(
      event.pointerId
    );

    this.draggedNode = null;
    this.physicsFramesRemaining = this.clusterConfig.physicsFramesRemaining;
    this.dragEdgeLengths.clear();

    if (this.controls) {
      this.controls.enabled = true;
    }

    document.body.style.cursor = 'default';
  };

  private setHoverState(mesh: THREE.Mesh | null, isHovered: boolean): void {
    if (!mesh) return;

    const material = mesh.material as THREE.MeshPhysicalMaterial;
    material.color.setHex(isHovered ? this.config.nodeHoverColor : this.config.nodeColor);
    material.emissive.setHex(isHovered ? this.config.nodeHoverEmissive : 0x000000);

    const nodeId = mesh.userData['nodeId'] as string;
    this.nodeBaseScale.set(nodeId, isHovered ? this.config.nodeHoverScale : 1);
  };

  private onClick = (): void => {
    if (!this.hoveredNode) {
      return;
    }

    const nodeData = this.hoveredNode.userData['nodeData'] as Node;
    const connections = this.getCarouselConnections(nodeData.id);

    this.zone.run(() => {
      this.selectedNode = nodeData;
      this.carouselCurrent = nodeData;
      this.carouselPredecessors = connections.predecessors;
      this.carouselSuccessors = connections.successors;
      this.carouselOpen = true;
      this.cdr.detectChanges();
    });
  };

  private updateSelectedRing(): void {
    if (!this.config.selectedRingEnabled || !this.selectedNode) {
      this.selectedRing?.removeFromParent();
      this.selectedRing = null;
      return;
    }

    const mesh = this.nodes.get(this.selectedNode.id);

    if (!mesh) {
      return;
    }

    if (!this.selectedRing) {
      const ringGeometry = new THREE.TorusGeometry(
        1,
        0.06,
        10,
        32
      );

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: this.config.selectedRingColor,
        transparent: true,
        opacity: this.config.selectedRingOpacity,
        depthWrite: false,
      });

      this.selectedRing = new THREE.Mesh(
        ringGeometry,
        ringMaterial
      );

      this.graph.add(this.selectedRing);
    }

    const elapsed = this.timer.getElapsed();

    const pulse =
      1 +
      Math.sin(elapsed * this.config.selectedRingPulseSpeed) *
        this.config.selectedRingPulseStrength;

    const radius = mesh.geometry.boundingSphere?.radius ?? 0.1;

    this.selectedRing.position.copy(mesh.position);

    this.selectedRing.scale.setScalar(
      radius * this.config.selectedRingScale * pulse
    );

    this.selectedRing.lookAt(this.camera.position);
  };

  private updateHoverTooltip(
    node: Node | null,
    event?: PointerEvent
  ): void {
    if (!node || !event) {
      this.hoverTooltip.visible = false;
      this.hoverTooltip.node = null;
      this.cdr.detectChanges();
      return;
    }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.hoverTooltip.visible = true;
    this.hoverTooltip.node = node;
    this.hoverTooltip.x = event.clientX - rect.left + 16;
    this.hoverTooltip.y = event.clientY - rect.top + 16;

    this.cdr.detectChanges();
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
  if (this.destroyed) return;

  this.animationId = requestAnimationFrame(this.animate);
  this.timer.update();

  if (!this.destroyed) {
    this.updateNodeAnimation();
    this.updateEdgeFlows();
    this.updateSelectedRing();
    this.updateClusterPhysics();
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

      mesh.scale.setScalar(
        THREE.MathUtils.lerp(
          mesh.scale.x,
          targetScale,
          this.config.nodeHoverTransitionSpeed
        )
      );
    });
  };

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

      const source = this.nodes.get(path.sourceId);
      const target = this.nodes.get(path.targetId);

      if (!source || !target) {
        return;
      }

      const sourcePosition = source.position;
      const targetPosition = target.position;

      const flowSpeed =
        this.layoutMode === 'cluster'
          ? this.clusterConfig.edgeFlowSpeed
          : this.config.edgeFlowSpeed;

      const progress =
        (elapsed * flowSpeed + path.offset) % 1;

      const direction = new THREE.Vector3()
      .subVectors(targetPosition, sourcePosition);

      const edgeLength = direction.length();

      if (edgeLength === 0) {
        return;
      }

      direction.normalize();

      const start = new THREE.Vector3()
        .lerpVectors(sourcePosition, targetPosition, progress);

      const segmentLength =
        this.layoutMode === 'cluster'
          ? this.clusterConfig.edgeFlowSegmentLength
          : this.config.edgeFlowSegmentLength;

      const end = start
        .clone()
        .addScaledVector(direction, segmentLength);

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
  };

  private updateConnectedEdges(): void {
    this.edgeConnections.forEach((connection, line) => {
      const source = this.nodes.get(connection.sourceId);
      const target = this.nodes.get(connection.targetId);

      if (!source || !target) {
        return;
      }

      const positions = line.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;

      positions.setXYZ(
        0,
        source.position.x,
        source.position.y,
        source.position.z
      );

      positions.setXYZ(
        1,
        target.position.x,
        target.position.y,
        target.position.z
      );

      positions.needsUpdate = true;
    });
  };

  private updateNodeShadow(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    const shadow = this.nodeShadows.get(nodeId);

    if (!node || !shadow) {
      return;
    }

    shadow.position.copy(node.position);
  };

  private applyLiveClusterPhysics(
    draggedNodeId: string,
    movement: THREE.Vector3
  ): void {
    if (
      this.layoutMode !== 'cluster' ||
      !this.clusterConfig.livePhysicsEnabled ||
      movement.lengthSq() === 0 ||
      !this.draggedNode
    ) {
      return;
    }

    const distanceById = new Map<string, number>();
    const queue: string[] = [draggedNodeId];

    distanceById.set(draggedNodeId, 0);

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      const graphDistance = distanceById.get(currentId) ?? 0;

      if (
        graphDistance >=
        this.clusterConfig.livePhysicsMaxDistance
      ) {
        continue;
      }

      this.edgeConnections.forEach(connection => {
        let neighborId: string | null = null;

        if (connection.sourceId === currentId) {
          neighborId = connection.targetId;
        } else if (connection.targetId === currentId) {
          neighborId = connection.sourceId;
        }

        if (!neighborId || distanceById.has(neighborId)) {
          return;
        }

        distanceById.set(neighborId, graphDistance + 1);
        queue.push(neighborId);
      });
    }

    distanceById.forEach((graphDistance, nodeId) => {
      if (nodeId === draggedNodeId || graphDistance === 0) {
        return;
      }

      const node = this.nodes.get(nodeId);

      if (!node) {
        return;
      }

      const falloff = 1 / (graphDistance * graphDistance);

      node.position.add(
        movement.clone().multiplyScalar(
          this.clusterConfig.livePhysicsStrength * falloff
        )
      );

      this.updateNodeShadow(nodeId);
    });

    this.edgeConnections.forEach((connection, line) => {
      const sourceDistance = distanceById.get(connection.sourceId);
      const targetDistance = distanceById.get(connection.targetId);

      if (
        sourceDistance === undefined ||
        targetDistance === undefined
      ) {
        return;
      }

      const source = this.nodes.get(connection.sourceId);
      const target = this.nodes.get(connection.targetId);
      const originalLength = this.dragEdgeLengths.get(line);

      if (!source || !target || originalLength === undefined) {
        return;
      }

      const difference = target.position
        .clone()
        .sub(source.position);

      const currentLength = difference.length();

      if (currentLength === 0) {
        return;
      }

      const change = currentLength - originalLength;

      const correction = difference
        .normalize()
        .multiplyScalar(
          change * this.clusterConfig.livePhysicsStrength
        );

      if (source !== this.draggedNode) {
        source.position.add(correction.clone().multiplyScalar(0.5));
        this.updateNodeShadow(connection.sourceId);
      }

      if (target !== this.draggedNode) {
        target.position.add(correction.clone().multiplyScalar(-0.5));
        this.updateNodeShadow(connection.targetId);
      }
    });
  };

  private updateClusterPhysics(): void {
    const shouldSimulate =
      this.layoutMode === 'cluster' &&
      (
        this.draggedNode !== null ||
        this.physicsFramesRemaining > 0
      );

    if (!shouldSimulate) {
      return;
    }

    const draggedNodeId = this.draggedNode?.userData['nodeId'] as
      | string
      | undefined;

    this.nodes.forEach((nodeA, nodeAId) => {
      this.nodes.forEach((nodeB, nodeBId) => {
        if (nodeAId >= nodeBId) {
          return;
        }

        const difference = nodeA.position.clone().sub(nodeB.position);
        const distance = Math.max(difference.length(), 0.01);

        const force = difference
          .normalize()
          .multiplyScalar(
            this.clusterConfig.repulsion / (distance * distance)
          );

        if (nodeAId !== draggedNodeId) {
          this.liveVelocities.get(nodeAId)?.add(force);
        }

        if (nodeBId !== draggedNodeId) {
          this.liveVelocities.get(nodeBId)?.sub(force);
        }
      });
    });

    this.edgeConnections.forEach(connection => {
      const source = this.nodes.get(connection.sourceId);
      const target = this.nodes.get(connection.targetId);

      if (!source || !target) {
        return;
      }

      const difference = target.position.clone().sub(source.position);
      const distance = difference.length();

      if (distance === 0) {
        return;
      }

      const direction = difference.normalize();

      const strength =
        (distance - this.clusterConfig.desiredDistance) *
        this.clusterConfig.attraction;

      const force = direction.multiplyScalar(strength);

      if (connection.sourceId !== draggedNodeId) {
        this.liveVelocities.get(connection.sourceId)?.add(force);
      }

      if (connection.targetId !== draggedNodeId) {
        this.liveVelocities.get(connection.targetId)?.sub(force);
      }
    });

    this.liveVelocities.forEach((velocity, nodeId) => {
      const node = this.nodes.get(nodeId);

      if (!node || nodeId === draggedNodeId) {
        return;
      }

      velocity.add(
        node.position
          .clone()
          .multiplyScalar(-this.clusterConfig.centerForce)
      );

      velocity.multiplyScalar(this.clusterConfig.damping);

      node.position.add(velocity);

      this.updateNodeShadow(nodeId);
    });

    this.updateConnectedEdges();

    if (!this.draggedNode && this.physicsFramesRemaining > 0) {
      this.physicsFramesRemaining--;
    }
  };

  private getCarouselConnections(nodeId: string): {
    predecessors: Node[];
    successors: Node[];
  } {
    const predecessors: Node[] = [];
    const successors: Node[] = [];

    if (!this.graphData) {
      return { predecessors, successors };
    }

    for (const edge of this.graphData.edges) {
      if (edge.target === nodeId) {
        const predecessor = this.nodeById.get(edge.source);

        if (predecessor) {
          predecessors.push(predecessor);
        }
      }

      if (edge.source === nodeId) {
        const successor = this.nodeById.get(edge.target);

        if (successor) {
          successors.push(successor);
        }
      }
    }

    return {
      predecessors,
      successors,
    };
  };

  closeCarousel(): void {
    this.carouselOpen = false;
    this.carouselCurrent = null;
    this.carouselPredecessors = [];
    this.carouselSuccessors = [];
  };

  selectCarouselNode(node: Node): void {
    const connections = this.getCarouselConnections(node.id);

    this.carouselCurrent = node;
    this.carouselPredecessors = connections.predecessors;
    this.carouselSuccessors = connections.successors;
  };

  ngOnDestroy(): void {
    this.destroyed = true;

    if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.resizeObserver?.disconnect();
    this.controls?.dispose();

    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointerup', this.onPointerUp);
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
  };
}