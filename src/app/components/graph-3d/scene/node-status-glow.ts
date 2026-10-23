import * as THREE from 'three';
import { Graph3dConfig } from '../config/graph-3d.config';

/**
 * Leuchtender Schatten hinter einem Knoten, je nach Status der Challenge
 * (fertig = grün, todo = gelb, schwer = rot).
 *
 * Der Knoten selbst behält seine normale Farbe. Hinter ihm liegt ein
 * Sprite mit einem weichen, runden Farbverlauf, der immer zur Kamera zeigt.
 */
export class NodeStatusGlow {
  /** Ein Sprite pro Knoten, der einen Status hat (Key = Knoten-ID). */
  private readonly glows = new Map<string, THREE.Sprite>();

  /** Pro Farbe wird die Textur nur einmal erzeugt. */
  private readonly textures = new Map<number, THREE.CanvasTexture>();

  constructor(
    private readonly graphGroup: THREE.Group,
    private readonly nodes: Map<string, THREE.Mesh>,
    private readonly config: Graph3dConfig
  ) { }

  /**
   * Setzt die Glow-Farben für alle Knoten (auch nach jedem Neuaufbau des Graphen).
   * Knoten, die nicht in der Map sind, bekommen keinen Glow.
   */
  setColors(colorById: Map<string, number>): void {
    this.removeAllGlows();

    if (!this.config.statusGlowEnabled) {
      return;
    }

    colorById.forEach((color, nodeId) => {
      if (this.nodes.has(nodeId)) {
        this.addGlow(nodeId, color);
      }
    });
  }

  /** Muss in jedem Frame aufgerufen werden (Position, Größe, leichtes Pulsieren). */
  update(elapsed: number): void {
    const pulse =
      1 +
      Math.sin(elapsed * this.config.statusGlowPulseSpeed) *
      this.config.statusGlowPulseStrength;

    this.glows.forEach((sprite, nodeId) => {
      const mesh = this.nodes.get(nodeId);

      if (!mesh) {
        return;
      }

      const radius = (mesh.geometry as THREE.SphereGeometry).parameters.radius;
      const size = radius * 2 * this.config.statusGlowScale * mesh.scale.x;

      sprite.position.copy(mesh.position);
      sprite.scale.set(size, size, 1);
      sprite.material.opacity = this.config.statusGlowOpacity * pulse;
    });
  }

  dispose(): void {
    this.removeAllGlows();
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear();
  }

  private addGlow(nodeId: string, color: number): void {
    const material = new THREE.SpriteMaterial({
      map: this.getTexture(color),
      transparent: true,
      opacity: this.config.statusGlowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);

    // Der Glow soll nicht anklickbar sein, sonst stört er beim Hover/Klick
    sprite.raycast = () => { };

    this.graphGroup.add(sprite);
    this.glows.set(nodeId, sprite);
  }

  private removeAllGlows(): void {
    this.glows.forEach(sprite => {
      sprite.removeFromParent();
      sprite.material.dispose();
    });

    this.glows.clear();
  }

  /** Erzeugt einen runden Farbverlauf: innen farbig, außen durchsichtig. */
  private getTexture(color: number): THREE.CanvasTexture {
    const cached = this.textures.get(color);

    if (cached) {
      return cached;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d')!;
    const center = size / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    const cssColor = '#' + new THREE.Color(color).getHexString();

    gradient.addColorStop(0, cssColor);
    gradient.addColorStop(0.35, cssColor + 'aa');
    gradient.addColorStop(0.65, cssColor + '33');
    gradient.addColorStop(1, cssColor + '00');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    this.textures.set(color, texture);
    return texture;
  }
}
