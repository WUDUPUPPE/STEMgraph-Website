import * as THREE from 'three';
import { GraphResponse } from '../../../api/models';
import { GraphClusterConfig } from '../config/graph-3d.config';
import { GraphLayout } from './graph-layout';

/**
 * Kräftebasiertes Layout: Knoten stoßen sich ab, verbundene Knoten
 * ziehen sich an. Die Simulation läuft einmal vorab (iterations Schritte)
 */
export class ClusterLayout extends GraphLayout {
  constructor(private readonly config: GraphClusterConfig) {
    super();
  }

  computePositions(data: GraphResponse): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const velocities = new Map<string, THREE.Vector3>();

    this.placeNodesRandomly(data, positions, velocities);

    for (let step = 0; step < this.config.iterations; step++) {
      this.applyRepulsionAndCenterForce(data, positions, velocities);
      this.applyEdgeAttraction(data, positions, velocities);
      this.movePositions(data, positions, velocities);
    }

    return positions;
  }

  // Startposition: zufällig in einem kleinen Würfel um den Mittelpunkt
  private placeNodesRandomly(
    data: GraphResponse,
    positions: Map<string, THREE.Vector3>,
    velocities: Map<string, THREE.Vector3>
  ): void {
    const spread = this.config.nodeSpacing * 4;

    data.nodes.forEach(node => {
      positions.set(
        node.id,
        new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        )
      );

      velocities.set(node.id, new THREE.Vector3());
    });
  }

<<<<<<< HEAD
  // Alle Knoten stoßen sich ab, außerdem zieht eine schwache Kraft zur Mitte.
=======
  // Alle Knoten stoßen sich ab, außerdem zieht eine schwache Kraft zur Mitte
>>>>>>> 1fe3a0879dca740934d59bdd18f8fa5336623d63
  private applyRepulsionAndCenterForce(
    data: GraphResponse,
    positions: Map<string, THREE.Vector3>,
    velocities: Map<string, THREE.Vector3>
  ): void {
    const { repulsion, centerForce } = this.config;

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
            .multiplyScalar(repulsion / (distance * distance))
        );
      });

      velocityA.add(positionA.clone().multiplyScalar(-centerForce));
    });
  }

<<<<<<< HEAD
  // Verbundene Knoten werden Richtung "desiredDistance" gezogen.
=======
  // Verbundene Knoten werden Richtung "desiredDistance" gezogen
>>>>>>> 1fe3a0879dca740934d59bdd18f8fa5336623d63
  private applyEdgeAttraction(
    data: GraphResponse,
    positions: Map<string, THREE.Vector3>,
    velocities: Map<string, THREE.Vector3>
  ): void {
    const { attraction, desiredDistance } = this.config;

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

      const difference = targetPosition.clone().sub(sourcePosition);
      const distance = difference.length();

      if (distance === 0) {
        return;
      }

      const force = (distance - desiredDistance) * attraction;
      const direction = difference.normalize();

      sourceVelocity.add(direction.clone().multiplyScalar(force));
      targetVelocity.add(direction.clone().multiplyScalar(-force));
    });
  }

  // Geschwindigkeit dämpfen und Knoten verschieben
  private movePositions(
    data: GraphResponse,
    positions: Map<string, THREE.Vector3>,
    velocities: Map<string, THREE.Vector3>
  ): void {
    data.nodes.forEach(node => {
      const position = positions.get(node.id);
      const velocity = velocities.get(node.id);

      if (!position || !velocity) {
        return;
      }

      velocity.multiplyScalar(this.config.damping);
      position.add(velocity);
    });
  }
}
