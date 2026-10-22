import * as THREE from 'three';
import { Graph3dConfig } from '../config/graph-3d.config';

// Pulsierender Ring um den aktuell ausgewählten Knoten
export class SelectionRing {
  private ring: THREE.Mesh | null = null;

  constructor(
    private readonly graphGroup: THREE.Group,
    private readonly nodes: Map<string, THREE.Mesh>,
    private readonly config: Graph3dConfig
  ) { }

  /**
   * Muss in jedem Frame aufgerufen werden, um den Ring zu aktualisieren
   * Ohne ausgewählten Knoten wird der Ring entfernt
   */
  update(
    selectedNodeId: string | null,
    elapsed: number,
    cameraPosition: THREE.Vector3
  ): void {
    if (!this.config.selectedRingEnabled || !selectedNodeId) {
      this.ring?.removeFromParent();
      this.ring = null;
      return;
    }

    const mesh = this.nodes.get(selectedNodeId);

    if (!mesh) {
      return;
    }

    if (!this.ring) {
      this.ring = this.createRing();
      this.graphGroup.add(this.ring);
    }

    const pulse =
      1 +
      Math.sin(elapsed * this.config.selectedRingPulseSpeed) *
      this.config.selectedRingPulseStrength;

    const radius = mesh.geometry.boundingSphere?.radius ?? 0.1;

    this.ring.position.copy(mesh.position);
    this.ring.scale.setScalar(radius * this.config.selectedRingScale * pulse);
    this.ring.lookAt(cameraPosition);
  }

  private createRing(): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(1, 0.06, 10, 32);

    const material = new THREE.MeshBasicMaterial({
      color: this.config.selectedRingColor,
      transparent: true,
      opacity: this.config.selectedRingOpacity,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }
}
