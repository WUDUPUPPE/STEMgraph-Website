import * as THREE from 'three';
import { GraphResponse } from '../../../api/models';

/**
 * Basisklasse für alle Layouts.
 * Ein Layout berechnet für jeden Knoten eine Position im 3D-Raum.
 */
export abstract class GraphLayout {
  abstract computePositions(data: GraphResponse): Map<string, THREE.Vector3>;
}
