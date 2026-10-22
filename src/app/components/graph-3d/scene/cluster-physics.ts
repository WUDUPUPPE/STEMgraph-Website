import * as THREE from 'three';
import { GraphClusterConfig, GraphLayoutMode } from '../config/graph-3d.config';
import { GraphView } from './graph-view';

/**
 * Live-Physik für den Cluster-Modus:
 * - beim Ziehen eines Knotens folgen seine Nachbarn (applyDragMovement)
 * - danach schwingt der Graph noch eine Weile aus (update)
 */
export class ClusterPhysics {
  /** Wird von außen gesetzt, die Physik läuft nur im Modus "cluster". */
  layoutMode: GraphLayoutMode = 'sphere';

  private readonly velocities = new Map<string, THREE.Vector3>();
  private readonly dragEdgeLengths = new Map<THREE.Line, number>();
  private framesRemaining = 0;

  constructor(
    private readonly view: GraphView,
    private readonly config: GraphClusterConfig
  ) { }

  // Legt für jeden Knoten eine neue Geschwindigkeit an (nach dem Graph-Aufbau)
  reset(): void {
    this.velocities.clear();

    this.view.nodes.forEach((_mesh, nodeId) => {
      this.velocities.set(nodeId, new THREE.Vector3());
    });
  }

  // Merkt sich die Kantenlängen beim Start des Ziehens.
  startDrag(): void {
    this.dragEdgeLengths.clear();

    this.view.edgeConnections.forEach((connection, line) => {
      const source = this.view.nodes.get(connection.sourceId);
      const target = this.view.nodes.get(connection.targetId);

      if (!source || !target) {
        return;
      }

      this.dragEdgeLengths.set(
        line,
        source.position.distanceTo(target.position)
      );
    });
  }

  // Nach dem Loslassen läuft die Physik noch ein paar Frames weiter
  endDrag(): void {
    this.framesRemaining = this.config.physicsFramesRemaining;
    this.dragEdgeLengths.clear();
  }

  // Nachbarn bewegen sich mit, je weiter entfernt, desto weniger.
  applyDragMovement(draggedNode: THREE.Mesh, movement: THREE.Vector3): void {
    if (
      this.layoutMode !== 'cluster' ||
      !this.config.livePhysicsEnabled ||
      movement.lengthSq() === 0
    ) {
      return;
    }

    const draggedNodeId = draggedNode.userData['nodeId'] as string;
    const distanceById = this.findGraphDistances(draggedNodeId);

    this.moveNeighbors(draggedNodeId, distanceById, movement);
    this.correctEdgeLengths(draggedNode, distanceById);
  }

  // Breitensuche: wie viele Kanten ist jeder Knoten vom gezogenen Knoten entfernt?
  private findGraphDistances(startId: string): Map<string, number> {
    const distanceById = new Map<string, number>();
    const queue: string[] = [startId];

    distanceById.set(startId, 0);

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      const graphDistance = distanceById.get(currentId) ?? 0;

      if (graphDistance >= this.config.livePhysicsMaxDistance) {
        continue;
      }

      this.view.edgeConnections.forEach(connection => {
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

    return distanceById;
  }

  private moveNeighbors(
    draggedNodeId: string,
    distanceById: Map<string, number>,
    movement: THREE.Vector3
  ): void {
    distanceById.forEach((graphDistance, nodeId) => {
      if (nodeId === draggedNodeId || graphDistance === 0) {
        return;
      }

      const node = this.view.nodes.get(nodeId);

      if (!node) {
        return;
      }

      const falloff = 1 / (graphDistance * graphDistance);

      node.position.add(
        movement.clone().multiplyScalar(this.config.livePhysicsStrength * falloff)
      );

      this.view.updateNodeShadow(nodeId);
    });
  }

  // Hält die Kanten ungefähr so lang wie beim Start des Ziehens
  private correctEdgeLengths(
    draggedNode: THREE.Mesh,
    distanceById: Map<string, number>
  ): void {
    this.view.edgeConnections.forEach((connection, line) => {
      const sourceDistance = distanceById.get(connection.sourceId);
      const targetDistance = distanceById.get(connection.targetId);

      if (sourceDistance === undefined || targetDistance === undefined) {
        return;
      }

      const source = this.view.nodes.get(connection.sourceId);
      const target = this.view.nodes.get(connection.targetId);
      const originalLength = this.dragEdgeLengths.get(line);

      if (!source || !target || originalLength === undefined) {
        return;
      }

      const difference = target.position.clone().sub(source.position);
      const currentLength = difference.length();

      if (currentLength === 0) {
        return;
      }

      const change = currentLength - originalLength;

      const correction = difference
        .normalize()
        .multiplyScalar(change * this.config.livePhysicsStrength);

      if (source !== draggedNode) {
        source.position.add(correction.clone().multiplyScalar(0.5));
        this.view.updateNodeShadow(connection.sourceId);
      }

      if (target !== draggedNode) {
        target.position.add(correction.clone().multiplyScalar(-0.5));
        this.view.updateNodeShadow(connection.targetId);
      }
    });
  }

  // Ein Simulationsschritt, wird in jedem Frame aufgerufen
  update(draggedNode: THREE.Mesh | null): void {
    const shouldSimulate =
      this.layoutMode === 'cluster' &&
      (draggedNode !== null || this.framesRemaining > 0);

    if (!shouldSimulate) {
      return;
    }

    const draggedNodeId = draggedNode?.userData['nodeId'] as string | undefined;

    this.applyNodeRepulsion(draggedNodeId);
    this.applyEdgeAttraction(draggedNodeId);
    this.moveNodes(draggedNodeId);

    this.view.updateConnectedEdges();

    if (!draggedNode && this.framesRemaining > 0) {
      this.framesRemaining--;
    }
  }

  // Jedes Knotenpaar stößt sich ab, außerdem zieht eine schwache Kraft zur Mitte.
  private applyNodeRepulsion(draggedNodeId: string | undefined): void {
    this.view.nodes.forEach((nodeA, nodeAId) => {
      this.view.nodes.forEach((nodeB, nodeBId) => {
        if (nodeAId >= nodeBId) {
          return;
        }

        const difference = nodeA.position.clone().sub(nodeB.position);
        const distance = Math.max(difference.length(), 0.01);

        const force = difference
          .normalize()
          .multiplyScalar(this.config.repulsion / (distance * distance));

        if (nodeAId !== draggedNodeId) {
          this.velocities.get(nodeAId)?.add(force);
        }

        if (nodeBId !== draggedNodeId) {
          this.velocities.get(nodeBId)?.sub(force);
        }
      });
    });
  }

  // Verbundene Knoten ziehen sich an
  private applyEdgeAttraction(draggedNodeId: string | undefined): void {
    this.view.edgeConnections.forEach(connection => {
      const source = this.view.nodes.get(connection.sourceId);
      const target = this.view.nodes.get(connection.targetId);

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
        (distance - this.config.desiredDistance) * this.config.attraction;

      const force = direction.multiplyScalar(strength);

      if (connection.sourceId !== draggedNodeId) {
        this.velocities.get(connection.sourceId)?.add(force);
      }

      if (connection.targetId !== draggedNodeId) {
        this.velocities.get(connection.targetId)?.sub(force);
      }
    });
  }

  // Zentrumskraft + Dämpfung anwenden und die Knoten verschieben
  private moveNodes(draggedNodeId: string | undefined): void {
    this.velocities.forEach((velocity, nodeId) => {
      const node = this.view.nodes.get(nodeId);

      if (!node || nodeId === draggedNodeId) {
        return;
      }

      velocity.add(
        node.position.clone().multiplyScalar(-this.config.centerForce)
      );

      velocity.multiplyScalar(this.config.damping);

      node.position.add(velocity);

      this.view.updateNodeShadow(nodeId);
    });
  }
}
