import * as THREE from 'three';
import { GraphResponse, Node } from '../../../api/models';
import { Graph3dConfig, GraphClusterConfig, GraphLayoutMode } from '../config/graph-3d.config';
import { GraphLayout } from '../layout/graph-layout';
import { Keyword_Lightness, Keyword_Saturation, KeywordHue } from '../../core/utils/keyword-color';

export interface EdgeConnection {
  sourceId: string;
  targetId: string;
}

interface EdgeFlowPath extends EdgeConnection {
  offset: number;
}

export interface NodeConnections {
  predecessors: Node[];
  successors: Node[];
}

/**
 * Hält alle 3D-Objekte des Graphen (Knoten, Schatten, Kanten, Flow-Linien)
 * und kann sie aufbauen, animieren und wieder aufräumen.
 */
export class GraphView {
  /** Wird von außen gesetzt, weil Kanten je nach Modus anders aussehen. */
  layoutMode: GraphLayoutMode = 'sphere';

  /** Bei Keywords bekommt jeder Knoten seine eigene Farbe (wird von außen gesetzt). */
  colorByKeyword = false;

  readonly nodes = new Map<string, THREE.Mesh>();
  readonly edgeConnections = new Map<THREE.Line, EdgeConnection>();

  private readonly nodeShadows = new Map<string, THREE.Mesh>();
  private readonly nodeBaseScale = new Map<string, number>();
  private readonly nodeById = new Map<string, Node>();
  private readonly edgeFlowPaths = new Map<THREE.Line, EdgeFlowPath>();

  private edges: THREE.Line[] = [];
  private edgeMaterials: THREE.LineBasicMaterial[] = [];
  private edgeFlows: THREE.Line[] = [];

  constructor(
    private readonly graphGroup: THREE.Group,
    private readonly config: Graph3dConfig,
    private readonly clusterConfig: GraphClusterConfig
  ) { }

  // ---------------------------------------------------------------------------
  // Aufbau
  // ---------------------------------------------------------------------------

  build(data: GraphResponse, layout: GraphLayout): void {
    this.clear();

    for (const node of data.nodes) {
      this.nodeById.set(node.id, node);
    }

    const degreeById = this.countDegrees(data);
    const nodePositions = layout.computePositions(data);

    data.nodes.forEach(node => {
      const position = nodePositions.get(node.id);

      if (!position) {
        return;
      }

      this.addNode(node, position, degreeById.get(node.id) ?? 0);
    });

    data.edges.forEach((edge, edgeIndex) => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (!sourcePos || !targetPos) {
        return;
      }

      this.addEdge(edge.source, edge.target, sourcePos, targetPos);

      if (this.config.edgeFlowEnabled) {
        this.addEdgeFlows(edge.source, edge.target, edgeIndex, data.edges.length);
      }
    });
  }

  /** Entfernt alle alten Objekte, damit der Graph neu aufgebaut werden kann. */
  private clear(): void {
    while (this.graphGroup.children.length > 0) {
      const child = this.graphGroup.children[0];
      this.graphGroup.remove(child);

      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    this.nodes.clear();
    this.nodeShadows.clear();
    this.nodeBaseScale.clear();
    this.nodeById.clear();

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
  }

  /** Zählt pro Knoten, wie viele Kanten er hat (bestimmt die Knotengröße). */
  private countDegrees(data: GraphResponse): Map<string, number> {
    const degreeById = new Map<string, number>();

    data.nodes.forEach(node => degreeById.set(node.id, 0));
    data.edges.forEach(edge => {
      degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1);
      degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1);
    });

    return degreeById;
  }

  private addNode(node: Node, position: THREE.Vector3, degree: number): void {
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
      color: this.getNodeColor(node),
      metalness: this.config.nodeMetalness,
      roughness: this.config.nodeRoughness,
      clearcoat: this.config.nodeClearcoat,
      clearcoatRoughness: this.config.nodeClearcoatRoughness,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    if (this.config.nodeShadowEnabled) {
      this.addNodeShadow(node.id, radius, position);
    }

    mesh.userData['nodeId'] = node.id;
    mesh.userData['nodeData'] = node;
    mesh.scale.setScalar(1);

    this.graphGroup.add(mesh);
    this.nodes.set(node.id, mesh);
    this.nodeBaseScale.set(node.id, 1);
  }

  /** Normale Farbe eines Knotens: bei Keywords eine eigene Farbe, sonst die Standardfarbe. */
  private getNodeColor(node: Node): THREE.Color {
    if (!this.colorByKeyword) {
      return new THREE.Color(this.config.nodeColor);
    }

    // im Keyword-Graph ist die id des Knotens das Keyword selbst
    return new THREE.Color().setHSL(
      KeywordHue(node.id) / 360,
      Keyword_Saturation,
      Keyword_Lightness
    );
  }

  /** Der "Schatten" ist eine etwas größere Kugel, die von innen sichtbar ist. */
  private addNodeShadow(nodeId: string, nodeRadius: number, position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(
      nodeRadius * this.config.nodeShadowScale,
      this.config.nodeSegments,
      this.config.nodeSegments
    );

    const material = new THREE.MeshBasicMaterial({
      color: this.config.nodeShadowColor,
      transparent: true,
      opacity: this.config.nodeShadowOpacity,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const shadowMesh = new THREE.Mesh(geometry, material);
    shadowMesh.position.copy(position);

    this.graphGroup.add(shadowMesh);
    this.nodeShadows.set(nodeId, shadowMesh);
  }

  private addEdge(
    sourceId: string,
    targetId: string,
    sourcePos: THREE.Vector3,
    targetPos: THREE.Vector3
  ): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      sourcePos,
      targetPos,
    ]) as THREE.BufferGeometry;

    const material = new THREE.LineBasicMaterial({
      color: this.config.edgeColor,
      transparent: true,
      opacity: this.isCluster()
        ? this.clusterConfig.edgeOpacity
        : this.config.edgeOpacity,
    });

    const line = new THREE.Line(geometry, material);

    this.graphGroup.add(line);
    this.edges.push(line);
    this.edgeMaterials.push(material);
    this.edgeConnections.set(line, { sourceId, targetId });
  }

  /** Kleine leuchtende Striche, die an der Kante entlang wandern. */
  private addEdgeFlows(
    sourceId: string,
    targetId: string,
    edgeIndex: number,
    edgeCount: number
  ): void {
    const flowCount = this.isCluster()
      ? this.clusterConfig.edgeFlowSegmentsPerEdge
      : this.config.edgeFlowSegmentsPerEdge;

    const edgeOffset = edgeIndex / Math.max(1, edgeCount);

    for (let index = 0; index < flowCount; index++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: this.config.edgeFlowColor,
        transparent: true,
        opacity: this.isCluster()
          ? this.clusterConfig.edgeFlowOpacity
          : this.config.edgeFlowOpacity,
      });

      const flowLine = new THREE.Line(geometry, material);

      this.graphGroup.add(flowLine);
      this.edgeFlows.push(flowLine);

      this.edgeFlowPaths.set(flowLine, {
        sourceId,
        targetId,
        offset: edgeOffset + index / flowCount,
      });
    }
  }

  private isCluster(): boolean {
    return this.layoutMode === 'cluster';
  }

  // ---------------------------------------------------------------------------
  // Abfragen
  // ---------------------------------------------------------------------------

  hasNode(nodeId: string): boolean {
    return this.nodeById.has(nodeId);
  }

  getNode(nodeId: string): Node | undefined {
    return this.nodeById.get(nodeId);
  }

  /** Vorgänger (Kanten, die auf den Knoten zeigen) und Nachfolger eines Knotens. */
  getConnections(nodeId: string, graphData: GraphResponse | null | undefined): NodeConnections {
    const predecessors: Node[] = [];
    const successors: Node[] = [];

    if (!graphData) {
      return { predecessors, successors };
    }

    for (const edge of graphData.edges) {
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

    return { predecessors, successors };
  }

  // ---------------------------------------------------------------------------
  // Aktualisieren
  // ---------------------------------------------------------------------------

  /** Färbt einen Knoten ein bzw. zurück und setzt seine Zielgröße. */
  setHoverState(mesh: THREE.Mesh | null, isHovered: boolean): void {
    if (!mesh) {
      return;
    }

    const material = mesh.material as THREE.MeshPhysicalMaterial;
    const node = mesh.userData['nodeData'] as Node;

    if (isHovered) {
      material.color.setHex(this.config.nodeHoverColor);
    } else {
      material.color.copy(this.getNodeColor(node));
    }

    material.emissive.setHex(isHovered ? this.config.nodeHoverEmissive : 0x000000);

    const nodeId = mesh.userData['nodeId'] as string;
    this.nodeBaseScale.set(nodeId, isHovered ? this.config.nodeHoverScale : 1);
  }

  /** Lässt jeden Knoten sanft auf seine Zielgröße wachsen/schrumpfen. */
  updateNodeAnimation(): void {
    this.nodes.forEach((mesh, nodeId) => {
      const targetScale = this.nodeBaseScale.get(nodeId) ?? 1;

      mesh.scale.setScalar(
        THREE.MathUtils.lerp(
          mesh.scale.x,
          targetScale,
          this.config.nodeHoverTransitionSpeed
        )
      );
    });
  }

  /** Bewegt die Flow-Striche entlang ihrer Kante. */
  updateEdgeFlows(elapsed: number): void {
    if (!this.config.edgeFlowEnabled) {
      return;
    }

    const flowSpeed = this.isCluster()
      ? this.clusterConfig.edgeFlowSpeed
      : this.config.edgeFlowSpeed;

    const segmentLength = this.isCluster()
      ? this.clusterConfig.edgeFlowSegmentLength
      : this.config.edgeFlowSegmentLength;

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

      const progress = (elapsed * flowSpeed + path.offset) % 1;

      const direction = new THREE.Vector3().subVectors(
        target.position,
        source.position
      );

      if (direction.length() === 0) {
        return;
      }

      direction.normalize();

      const start = new THREE.Vector3().lerpVectors(
        source.position,
        target.position,
        progress
      );

      const end = start.clone().addScaledVector(direction, segmentLength);

      const positionAttribute = flow.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;

      positionAttribute.setXYZ(0, start.x, start.y, start.z);
      positionAttribute.setXYZ(1, end.x, end.y, end.z);
      positionAttribute.needsUpdate = true;
    });
  }

  /** Zieht die Kanten den (bewegten) Knoten hinterher. */
  updateConnectedEdges(): void {
    this.edgeConnections.forEach((connection, line) => {
      const source = this.nodes.get(connection.sourceId);
      const target = this.nodes.get(connection.targetId);

      if (!source || !target) {
        return;
      }

      const positions = line.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;

      positions.setXYZ(0, source.position.x, source.position.y, source.position.z);
      positions.setXYZ(1, target.position.x, target.position.y, target.position.z);
      positions.needsUpdate = true;
    });
  }

  /** Setzt den Schatten wieder auf die Position seines Knotens. */
  updateNodeShadow(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    const shadow = this.nodeShadows.get(nodeId);

    if (!node || !shadow) {
      return;
    }

    shadow.position.copy(node.position);
  }

  // ---------------------------------------------------------------------------
  // Aufräumen
  // ---------------------------------------------------------------------------

  dispose(): void {
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
  }
}
