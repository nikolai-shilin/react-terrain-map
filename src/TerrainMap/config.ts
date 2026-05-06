// Terrain map configuration
//
// All tunable defaults for TerrainMap live here so behaviour can be adjusted
// in one place. Math constants (Web Mercator, Terrarium decode) and loop
// bounds are part of the algorithms — they stay inline in scene.ts.

// ---------- Tile pyramid ----------
export const TILES = {
  /** Web Mercator zoom level. ~9–10 km/tile at typical latitudes. */
  zoom: 12,
  /** Default grid size (grid × grid tiles) when the location has no route. */
  grid: 16,
  /**
   * When the location has a route, the grid is sized to fit the route's
   * bounding box plus this fraction of the span on each side. 0.1 = 10 %.
   */
  routePaddingFactor: 0.1,
  /** Pixel size of each square tile. */
  px: 256,
  /** Segments per side of the terrain plane geometry. */
  planeSegments: 2048,
  /** AWS Terrarium PNG-encoded elevation tiles. */
  terrainUrl: (z: number, x: number, y: number) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  /** ESRI World Imagery — y/x swap is intentional for the ArcGIS path style. */
  imageryUrl: (z: number, x: number, y: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
} as const;

// ---------- Renderer / scene ----------
export const RENDERER = {
  maxPixelRatio: 2,
  backgroundColor: 0x000000,
} as const;

// ---------- Camera ----------
export const CAMERA = {
  fov: 55,
  near: 10,
  far: 400_000,
  /** Initial radial distance = `initialDistFactor × worldW`. */
  initialDistFactor: 0.55,
  /** Initial polar angle from straight-up, in degrees. */
  initialPolarDeg: 5,
} as const;

// ---------- Map controls ----------
export const MAP_CONTROLS = {
  dampingFactor: 0.08,
  /** Just below π/2 so the camera never goes below the horizon. */
  maxPolarAngle: Math.PI * 0.498,
  minDistance: 800,
  /** Max distance = `maxDistFactor × worldW`. */
  maxDistFactor: 1.6,
} as const;

// ---------- Keyboard rotation / tilt ----------
export const KEY_NAV = {
  /** Horizontal rotation rate (rad/sec) for ← / →. */
  rotRate: 1.1,
  /** Vertical tilt rate (rad/sec) for ↑ / ↓. */
  tiltRate: 0.9,
  /** Minimum polar angle so the camera never tilts past straight-up. */
  minPhi: 0.05,
} as const;

// ---------- Lighting ----------
export const LIGHTS = {
  sun: {
    color: 0xfff4e6,
    intensity: 2.6,
    position: [40000, 14000, -25000] as const,
  },
  hemi: {
    sky: 0xb8d8ff,
    ground: 0x4b3a26,
    intensity: 0.55,
  },
  ambient: {
    color: 0xffffff,
    intensity: 0.15,
  },
} as const;

// ---------- Fog ----------
export const FOG = {
  color: 0x000000,
  /** Fog spans nearFactor × worldW to farFactor × worldW. */
  nearFactor: 0.7,
  farFactor: 2.4,
} as const;

// ---------- Terrain material ----------
export const TERRAIN_MATERIAL = {
  roughness: 0.95,
  metalness: 0.0,
} as const;

// ---------- Focus marker (orbit point or auto-summit) ----------
export const MARKER = {
  cone: { radius: 80, height: 320, segments: 16 },
  /** Marker hovers this many world-units above the focus elevation. */
  heightOffset: 200,
  roughness: 0.4,
  summit: { color: 0xff3344, emissive: 0x661111 },
  orbit: { color: 0xffb020, emissive: 0x553300 },
} as const;

// ---------- Route line + port markers ----------
export const ROUTE = {
  line: {
    color: 0x00e0ff,
    width: 3,
    opacity: 0.95,
  },
  port: {
    color: 0x00e0ff,
    emissive: 0x004060,
    emissiveIntensity: 1.2,
    roughness: 0.3,
    sphere: { radius: 180, widthSeg: 18, heightSeg: 14, y: 200 },
    pole: { radius: 20, height: 240, segments: 8, y: 120 },
  },
  /** Height of the route line above sea level. */
  seaOffset: 80,
} as const;

// ---------- Coastline-aware path-finding ----------
export const COASTLINE = {
  /** Downscale factor when building the sea-mask grid. */
  maskDownscale: 8,
  /** Max BFS radius (in mask cells) when snapping a waypoint onto sea. */
  snapMaxRadius: 80,
} as const;

// ---------- Vertical-exaggeration UI ----------
export const VEX = {
  default: 1,
  min: 1,
  max: 4,
  step: 0.1,
} as const;

// ---------- HUD copy ----------
export const HUD = {
  mouseHint: 'drag to pan · right-drag to rotate · scroll to zoom',
  keyHint: '← → rotate · ↑ ↓ tilt',
  attribution: 'elevation: AWS Terrain Tiles · imagery: ESRI World Imagery',
} as const;
