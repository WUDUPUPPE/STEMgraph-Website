import * as THREE from 'three';
import { Node } from '../../../api/models';
import { GraphLayoutMode } from '../config/graph-3d.config';
import { ClusterPhysics } from './cluster-physics';
import { GraphView } from './graph-view';
import { SceneManager } from './scene-manager';

/** Die Komponente gibt diese Funktionen mit, um auf Mausereignisse zu reagieren. */
export interface GraphInteractionHandlers {
  /** Maus über einem Knoten (node + event) oder nicht mehr (null). */
  onHover: (node: Node | null, event?: PointerEvent) => void;
  /** Klick auf einen Knoten. */
  onNodeClick: (node: Node) => void;
}

/**
 * Verarbeitet die Maus auf dem Canvas: Hover, Klick und
 * das Ziehen von Knoten (nur im Cluster-Modus).
 */
export class GraphInteraction {
  /** Werden von außen gesetzt (Inputs der Komponente). */
  interactive = true;
  layoutMode: GraphLayoutMode = 'sphere';

  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();

  private hoveredNode: THREE.Mesh | null = null;
  /** Der Knoten, der gerade gezogen wird (oder null). */
  draggedNode: THREE.Mesh | null = null;

  private readonly dragPlane = new THREE.Plane();
  private readonly dragIntersection = new THREE.Vector3();
  private readonly dragOffset = new THREE.Vector3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sceneManager: SceneManager,
    private readonly view: GraphView,
    private readonly physics: ClusterPhysics,
    private readonly handlers: GraphInteractionHandlers
  ) { }

  bind(): void {
    this.canvas.addEventListener('click', this.onClick, { passive: true });
    this.canvas.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.canvas.addEventListener('pointerleave', this.onPointerLeave, { passive: true });

    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
  }

  unbind(): void {
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);

    window.removeEventListener('pointerup', this.onPointerUp);

    document.body.style.cursor = 'default';
  }

  /** Rechnet die Mausposition in Werte von -1 bis 1 um und richtet den Strahl aus. */
  private updateRaycaster(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.interactive) {
      return;
    }

    this.updateRaycaster(event);

    if (this.draggedNode) {
      this.handlers.onHover(null);
      this.dragNode(this.draggedNode);
      return;
    }

    const intersects = this.raycaster.intersectObjects(
      Array.from(this.view.nodes.values())
    );

    if (intersects.length > 0) {
      const hovered = intersects[0].object as THREE.Mesh;

      if (this.hoveredNode !== hovered) {
        this.view.setHoverState(this.hoveredNode, false);
        this.hoveredNode = hovered;
        this.view.setHoverState(hovered, true);
        document.body.style.cursor = 'pointer';
      }

      this.handlers.onHover(hovered.userData['nodeData'] as Node, event);
    } else {
      if (this.hoveredNode) {
        this.view.setHoverState(this.hoveredNode, false);
        this.hoveredNode = null;
      }

      this.handlers.onHover(null);
      document.body.style.cursor = 'default';
    }
  };

  /** Setzt den gezogenen Knoten unter die Maus und lässt die Nachbarn folgen. */
  private dragNode(draggedNode: THREE.Mesh): void {
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
      return;
    }

    const previousPosition = draggedNode.position.clone();

    draggedNode.position.copy(
      this.dragIntersection.clone().add(this.dragOffset)
    );

    const draggedNodeId = draggedNode.userData['nodeId'] as string;
    const movement = draggedNode.position.clone().sub(previousPosition);

    this.view.updateNodeShadow(draggedNodeId);
    this.physics.applyDragMovement(draggedNode, movement);
    this.view.updateConnectedEdges();
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (
      !this.interactive ||
      this.layoutMode !== 'cluster' ||
      !this.hoveredNode
    ) {
      return;
    }

    this.updateRaycaster(event);

    this.draggedNode = this.hoveredNode;
    this.physics.startDrag();

    // Die Ebene, in der der Knoten gezogen wird, steht senkrecht zur Kamera.
    const cameraDirection = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(cameraDirection);

    this.dragPlane.setFromNormalAndCoplanarPoint(
      cameraDirection,
      this.draggedNode.position
    );

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
      this.dragOffset.copy(this.draggedNode.position).sub(this.dragIntersection);
    }

    this.sceneManager.setControlsEnabled(false);
    this.canvas.setPointerCapture(event.pointerId);

    document.body.style.cursor = 'grabbing';
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.draggedNode) {
      return;
    }

    this.canvas.releasePointerCapture(event.pointerId);

    this.draggedNode = null;
    this.physics.endDrag();
    this.sceneManager.setControlsEnabled(true);

    document.body.style.cursor = 'default';
  };

  private onPointerLeave = (): void => {
    if (this.draggedNode) {
      return;
    }

    this.view.setHoverState(this.hoveredNode, false);
    this.hoveredNode = null;
    this.handlers.onHover(null);

    document.body.style.cursor = 'default';
  };

  private onClick = (): void => {
    if (!this.interactive || !this.hoveredNode) {
      return;
    }

    this.handlers.onNodeClick(this.hoveredNode.userData['nodeData'] as Node);
  };
}
