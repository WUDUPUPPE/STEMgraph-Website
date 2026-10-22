export type GraphLayoutMode = 'sphere' | 'cluster';

/**
 * Was die Knoten des Graphen bedeuten:
 * 'challenge' = Challenges (mit README-Vorschau und Detail-Karussell),
 * 'keyword'   = Keywords (nur Name, Klick wählt den Knoten aus).
 */
export type GraphNodeKind = 'challenge' | 'keyword';

// Darstellung und Verhalten des Graphen (Knoten, Kanten, Kamera)
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

//Einstellungen, die nur für den "cluster"-Modus gelten (Physik, Zoom, Kanten)
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

export const DEFAULT_GRAPH_CONFIG: Graph3dConfig = {
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
  edgeFlowOpacity: 0.5,

  autoRotateSpeed: 0.1,
  minZoom: 5,
  maxZoom: 19.8,
};

export const DEFAULT_CLUSTER_CONFIG: GraphClusterConfig = {
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
  edgeFlowOpacity: 0.7,
  edgeFlowSegmentsPerEdge: 5,
  edgeFlowSegmentLength: 0.06,

  minZoom: 12,
  maxZoom: 62,
};
