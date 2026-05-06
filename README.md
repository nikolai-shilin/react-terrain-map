# react-terrain-map

A React component that renders an interactive 3D terrain map from public
elevation tiles and satellite imagery. Built on Three.js, ships as ESM + CJS
with TypeScript declarations.

- Real elevation from AWS Open Data **Terrain Tiles** (terrarium-encoded PNG)
- Drape from **ESRI World Imagery** — both sources are public, no API key
- A 3D plane mesh with up to 2048 × 2048 segments, displaced with bilinear
  elevation sampling
- Two route modes:
  - **Sea routes** — coastline-aware A\* through a sea / land mask derived
    from the DEM, so the line is guaranteed to stay over water
  - **Altitude routes** — set `alt` on any waypoint and the route is drawn
    as a 3-D polyline at the supplied altitudes (metres above sea level),
    with port markers anchored from the ground up to the altitude
- Map-style controls — left-drag pans, right-drag rotates, scroll zooms,
  arrow keys yaw / tilt
- Optional summit marker (auto-detected) or named "orbit point" per location
- Multi-location switcher with in-memory tile caching
- Vertical exaggeration slider
- Per-control visibility flags so you can ship the map with no UI chrome

## Installation

```bash
npm install react-terrain-map react react-dom three
```

`react`, `react-dom` and `three` are peer dependencies — install whichever
versions your app already uses (React ≥ 18, three ≥ 0.170).

## Quick start

```tsx
import { TerrainMap, type Location } from 'react-terrain-map';
import 'react-terrain-map/styles.css';

const LOCATIONS: Location[] = [
  {
    id: 'babadag',
    name: 'Babadağ',
    subtitle: 'Fethiye, Türkiye',
    lat: 36.65,
    lon: 28.85,
  },
];

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TerrainMap locations={LOCATIONS} />
    </div>
  );
}
```

The component fills 100 % of its parent — wrap it in any sized container
(`div`, grid cell, flex item, etc.) and it'll size accordingly.

## Props

| Prop                | Type                                  | Default          | Description                                                              |
| ------------------- | ------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `locations`         | `Location[]`                          | required         | Locations available in the switcher.                                     |
| `initialLocationId` | `string`                              | first location   | Which location loads on mount.                                           |
| `controls`          | `boolean \| TerrainMapControls`       | `true`           | Floating-UI visibility. See below.                                       |
| `className`         | `string`                              | –                | Extra class on the root element.                                         |

### `controls`

Pass `false` to hide every overlay, `true` (default) to show them all, or an
object to toggle each piece independently. Omitted keys default to `true`.

```ts
interface TerrainMapControls {
  /** Top-left location switcher (only renders when ≥ 2 locations). */
  locations?: boolean;
  /** Top-right vertical exaggeration slider. */
  verticalExaggeration?: boolean;
  /** Bottom-left info panel — name, hints, attribution. */
  info?: boolean;
}
```

```tsx
// All chrome hidden — clean canvas
<TerrainMap locations={LOCATIONS} controls={false} />

// Show only the location switcher
<TerrainMap
  locations={LOCATIONS}
  controls={{ locations: true, verticalExaggeration: false, info: false }}
/>
```

## Domain types

```ts
interface Location {
  id: string;
  name: string;
  subtitle: string;

  /**
   * Geographic centre of the loaded tile grid. Ignored when `route` is set
   * — in that case the grid is centred on the route's bounding-box midpoint
   * and sized to fit it with a configurable padding (10 % per side by
   * default — see `TILES.routePaddingFactor` in `src/TerrainMap/config.ts`).
   */
  lat: number;
  lon: number;

  /**
   * Optional point of interest. Renders as an orange cone marker.
   * If absent, an auto-detected summit (the highest sample in the grid) is
   * marked with a red cone instead.
   */
  orbitPoint?: { lat: number; lon: number; label: string };

  /** Optional sea route drawn over the map as a coastline-respecting line. */
  route?: Route;
}

interface Route {
  name: string;
  waypoints: Array<Waypoint>;
}

interface Waypoint {
  lat: number;
  lon: number;
  /**
   * Altitude in metres above sea level. When any waypoint in a route has
   * an altitude, the route switches into altitude mode: a straight 3-D
   * polyline through the waypoints (waypoints without an `alt` default
   * to 0). Altitudes scale with the vertical-exaggeration slider so the
   * route stays anchored to the (also-exaggerated) terrain.
   */
  alt?: number;
  /** When set, a port pin is drawn at the waypoint. */
  label?: string;
}
```

## Interaction

| Input                            | Action                                     |
| -------------------------------- | ------------------------------------------ |
| Left-drag                        | Pan along the ground plane                 |
| Right-drag (or two-finger drag)  | Orbit camera around the current target     |
| Scroll wheel / pinch             | Zoom in / out                              |
| ←  /  →                          | Yaw the camera around the Y axis           |
| ↑  /  ↓                          | Tilt (change polar angle)                  |

Form controls (the slider) keep their default arrow-key behaviour when
focused — the map only intercepts arrows when nothing form-related is
focused.

## Styling

All component CSS is namespaced under `.terrain-map`. Override by scoping to
that root, or pass a `className` and target it from your own stylesheet:

```tsx
<TerrainMap className="my-map" locations={LOCATIONS} />
```

```css
.my-map {
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}
.my-map .terrain-map__hud {
  font-family: 'Inter', system-ui, sans-serif;
}
```

The published bundle contains a single stylesheet at
`react-terrain-map/styles.css`. Import it once at your app's entry
point.

## Data sources & attribution

- Elevation: [AWS Open Data — Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
  (terrarium PNG encoding, originally Mapzen).
- Imagery: [ESRI World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).

When you ship a product on top of this component, include attribution to
both sources somewhere visible. The bundled info panel renders this line
out of the box.

## Browser requirements

- WebGL 2 (covered by all modern evergreen browsers)
- ES 2022 — Chrome 94+, Edge 94+, Safari 16+, Firefox 93+

By default the component pulls 256 elevation + 256 imagery tiles per
location at zoom 12 (a 16 × 16 grid). When the location has a `route`,
the grid is sized to fit the route's bounding box plus padding, so tile
count scales with route extent. Tiles are cached in memory and reused
when the user switches back.

## Development

```bash
git clone https://github.com/your-org/react-terrain-map.git
cd react-terrain-map
npm install

npm run dev          # demo app at http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run build        # produces dist/ ready for npm publish
```

## License

MIT
