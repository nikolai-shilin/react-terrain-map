import { TerrainMapProps } from './types';
/**
 * 3D terrain viewer. Loads elevation + satellite imagery for each location
 * on demand and renders an interactive map with optional floating controls.
 *
 * The component takes its size from the `className` (or any inline styles
 * on the rendered root element); the canvas inside fills 100 % of that box.
 * The root has `position: relative` so HUD overlays anchor to the map.
 */
export declare function TerrainMap({ className, locations, initialLocationId, controls, }: TerrainMapProps): import("react/jsx-runtime").JSX.Element;
