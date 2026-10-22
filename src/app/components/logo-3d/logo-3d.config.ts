export type Vec3 = [number, number, number];

export interface Logo3dLight {
  color: number;
  intensity: number;
  ground?: number;
  position?: Vec3;
}

export interface Logo3dLightConfig {
  ambient: Logo3dLight;
  key: Logo3dLight;
  rimLeft: Logo3dLight;
  rimRight: Logo3dLight;
  rimTop: Logo3dLight;
  exposure: number;
}

export const DEFAULT_LOGO_LIGHT_CONFIG: Logo3dLightConfig = {
  ambient: { color: 0x1a918c, ground: 0x1a918c, intensity: 5 },
  key: { color: 0xffffff, intensity: 2.5, position: [0.6, -0.2, 0.7] },
  rimLeft: { color: 0x2ac2bb, intensity: 30, position: [-4, -2, -4] },
  rimRight: { color: 0x772093, intensity: 40, position: [4, 2, -4] },
  rimTop: { color: 0xffffff, intensity: 7, position: [0, 4, -3] },
  exposure: 1.2,
};

// Größte Kante des geladenen Modells wird auf diese Länge skaliert
export const LOGO_MODEL_SIZE = 4.7;

// Wie stark sich das Logo mit der Maus dreht
export const PARALLAX_STRENGTH = 0.04;

// Verhältnis Fensterbreite zu Logo-Größe, begrenzt auf min/max
export const LOGO_SCALE_WIDTH_DIVISOR = 350;
export const LOGO_SCALE_MIN = 0.5;
export const LOGO_SCALE_MAX = 1.1;
