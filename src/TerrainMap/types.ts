// Public domain types --------------------------------------------------------

export interface Waypoint {
  lat: number;
  lon: number;
  /**
   * Altitude in metres above sea level. When any waypoint in a route has
   * an altitude, the route is rendered as a 3-D polyline at the supplied
   * altitudes (waypoints without an altitude default to 0). When no
   * waypoint has an altitude, the route is rendered as a coastline-aware
   * sea route at `ROUTE.seaOffset`.
   */
  alt?: number;
  label?: string;
}

export interface Route {
  name: string;
  waypoints: Waypoint[];
}

export interface Location {
  id: string;
  name: string;
  subtitle: string;
  /** Center of the loaded tile grid. */
  lat?: number;
  lon?: number;
  /**
   * Optional point the camera should orbit around. If absent, the camera
   * orbits the highest sample in the loaded grid.
   */
  orbitPoint?: { lat: number; lon: number; label: string };
  /** Optional sea route drawn over the terrain. */
  route?: Route;
}

// Scene contract (used between scene.ts and TerrainMap.tsx) -----------------

export interface SceneOptions {
  onStatus?(message: string): void;
}

export interface TerrainSceneApi {
  switchTo(loc: Location): Promise<void>;
  applyVex(vex: number): void;
  dispose(): void;
}

// Component props -----------------------------------------------------------

/** Per-control visibility flags. Each defaults to `true` if omitted. */
export interface TerrainMapControls {
  /** Top-left location switcher buttons. */
  locations?: boolean;
  /** Top-right vertical exaggeration slider. */
  verticalExaggeration?: boolean;
  /** Bottom-left info panel (location name, hints, attribution). */
  info?: boolean;
}

export interface TerrainMapProps {
  /** Class applied to the root container — sets the size. */
  className?: string;
  /** Locations available in the switcher. */
  locations: Location[];
  /** Which location to load on mount. Defaults to the first location. */
  initialLocationId?: string;
  /**
   * Show or hide the floating controls. Pass `false` to hide everything,
   * `true` (default) to show all, or an object to toggle individual
   * controls — e.g. `{ locations: true, verticalExaggeration: false }`.
   */
  controls?: boolean | TerrainMapControls;
}
