import * as THREE from 'three';
import { GraphResponse } from '../../../api/models';
import { Graph3dConfig } from '../config/graph-3d.config';
import { GraphLayout } from './graph-layout';

/** Verteilt alle Knoten gleichmäßig auf einer Kugeloberfläche. */
export class SphereLayout extends GraphLayout {
  constructor(private readonly config: Graph3dConfig) {
    super();
  }

  computePositions(data: GraphResponse): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    const { layoutRadius } = this.config;

    data.nodes.forEach((node, index) => {
      const phi = Math.acos(-1 + (2 * index) / data.nodes.length);
      const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;

      const x = layoutRadius * Math.sin(phi) * Math.cos(theta);
      const y = layoutRadius * Math.sin(phi) * Math.sin(theta);
      const z = layoutRadius * Math.cos(phi);

      positions.set(node.id, new THREE.Vector3(x, y, z));
    });

    return positions;
  }
}
