import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type {
  Location,
  SceneOptions,
  TerrainSceneApi,
  Waypoint,
} from './types';

// ---------- Scene constants ----------

// Tile pyramid setup. Zoom 12 ≈ 9–10 km/tile at these latitudes.
const ZOOM = 12;
const GRID = 16;
const TILE_PX = 256;
const PLANE_SEGMENTS = 1024;

const terrainUrl = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const imageryUrl = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

// ---------- Web Mercator helpers ----------

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * 2 ** z;
}
function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z;
}
function metersPerPixel(lat: number, z: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

// ---------- Tile loading ----------

interface TileGrid {
  x0: number;
  y0: number;
  width: number;
  height: number;
}

async function stitchTiles(
  cx: number,
  cy: number,
  z: number,
  grid: number,
  url: (z: number, x: number, y: number) => string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ canvas: HTMLCanvasElement; meta: TileGrid }> {
  const x0 = Math.floor(cx - grid / 2);
  const y0 = Math.floor(cy - grid / 2);
  const W = TILE_PX * grid;
  const H = TILE_PX * grid;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const total = grid * grid;
  let loaded = 0;
  const tasks: Promise<void>[] = [];
  for (let dy = 0; dy < grid; dy++) {
    for (let dx = 0; dx < grid; dx++) {
      const u = url(z, x0 + dx, y0 + dy);
      tasks.push(
        loadImage(u).then((img) => {
          ctx.drawImage(img, dx * TILE_PX, dy * TILE_PX);
          loaded++;
          onProgress?.(loaded, total);
        }),
      );
    }
  }
  await Promise.all(tasks);
  return { canvas, meta: { x0, y0, width: W, height: H } };
}

// elevation = (R * 256 + G + B / 256) - 32768
function decodeTerrarium(canvas: HTMLCanvasElement): Float32Array {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = data[p] * 256 + data[p + 1] + data[p + 2] / 256 - 32768;
  }
  return out;
}

interface LoadedData {
  elevation: Float32Array;
  satTexture: THREE.CanvasTexture;
  meta: TileGrid;
  worldW: number;
  worldH: number;
}

// ---------- Terrain mesh + focus ----------

interface FocusPoint {
  x: number;
  z: number;
  elev: number;
  kind: 'summit' | 'orbit';
}

interface TerrainNodes {
  mesh: THREE.Mesh;
  marker: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.MeshStandardMaterial;
  positions: THREE.BufferAttribute;
  baseElev: Float32Array;
  focus: FocusPoint;
}

function sampleElevation(data: LoadedData, u: number, v: number): number {
  const W = data.meta.width;
  const H = data.meta.height;
  const fx = Math.max(0, Math.min(W - 1.0001, u * (W - 1)));
  const fy = Math.max(0, Math.min(H - 1.0001, v * (H - 1)));
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const i00 = iy * W + ix;
  const e00 = data.elevation[i00];
  const e10 = data.elevation[i00 + 1];
  const e01 = data.elevation[i00 + W];
  const e11 = data.elevation[i00 + W + 1];
  return (
    e00 * (1 - tx) * (1 - ty) +
    e10 * tx * (1 - ty) +
    e01 * (1 - tx) * ty +
    e11 * tx * ty
  );
}

function autoSummitFocus(data: LoadedData): FocusPoint {
  const { elevation, meta, worldW, worldH } = data;
  const W = meta.width;
  let maxE = -Infinity;
  let maxIdx = 0;
  for (let i = 0; i < elevation.length; i++) {
    if (elevation[i] > maxE) {
      maxE = elevation[i];
      maxIdx = i;
    }
  }
  const sx = maxIdx % W;
  const sy = Math.floor(maxIdx / W);
  return {
    x: (sx / W - 0.5) * worldW,
    z: (sy / meta.height - 0.5) * worldH,
    elev: maxE,
    kind: 'summit',
  };
}

function orbitFocus(loc: Location, data: LoadedData): FocusPoint | null {
  if (!loc.orbitPoint) return null;
  const tx = lonToTileX(loc.orbitPoint.lon, ZOOM);
  const ty = latToTileY(loc.orbitPoint.lat, ZOOM);
  const u = (tx - data.meta.x0) / GRID;
  const v = (ty - data.meta.y0) / GRID;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return {
    x: (u - 0.5) * data.worldW,
    z: (v - 0.5) * data.worldH,
    elev: sampleElevation(data, u, v),
    kind: 'orbit',
  };
}

function buildMarker(focus: FocusPoint): THREE.Mesh {
  const color = focus.kind === 'orbit' ? 0xffb020 : 0xff3344;
  const emissive = focus.kind === 'orbit' ? 0x553300 : 0x661111;
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(80, 320, 16),
    new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.4 }),
  );
  marker.position.set(focus.x, focus.elev + 200, focus.z);
  return marker;
}

function buildTerrainNodes(data: LoadedData, focus: FocusPoint): TerrainNodes {
  const { satTexture, worldW, worldH } = data;
  const geometry = new THREE.PlaneGeometry(worldW, worldH, PLANE_SEGMENTS, PLANE_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const baseElev = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const e = sampleElevation(data, x / worldW + 0.5, z / worldH + 0.5);
    baseElev[i] = e;
    positions.setY(i, e);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    map: satTexture,
    roughness: 0.95,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const marker = buildMarker(focus);

  return { mesh, marker, geometry, material, positions, baseElev, focus };
}

function disposeTerrainNodes(scene: THREE.Scene, nodes: TerrainNodes) {
  scene.remove(nodes.mesh);
  scene.remove(nodes.marker);
  nodes.geometry.dispose();
  nodes.material.dispose();
  (nodes.marker.geometry as THREE.BufferGeometry).dispose();
  (nodes.marker.material as THREE.Material).dispose();
}

// ---------- Coastline-aware path finding ----------

class MinHeap<T> {
  private items: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  get size(): number {
    return this.items.length;
  }
  push(item: T) {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.items[i], this.items[p]) >= 0) break;
      [this.items[i], this.items[p]] = [this.items[p], this.items[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let s = i;
        if (l < n && this.cmp(this.items[l], this.items[s]) < 0) s = l;
        if (r < n && this.cmp(this.items[r], this.items[s]) < 0) s = r;
        if (s === i) break;
        [this.items[i], this.items[s]] = [this.items[s], this.items[i]];
        i = s;
      }
    }
    return top;
  }
}

interface SeaMask {
  mask: Uint8Array;
  gw: number;
  gh: number;
  downscale: number;
}

function buildSeaMask(data: LoadedData, downscale: number): SeaMask {
  const W = data.meta.width;
  const H = data.meta.height;
  const gw = Math.floor(W / downscale);
  const gh = Math.floor(H / downscale);
  const mask = new Uint8Array(gw * gh);
  const cellSize = downscale * downscale;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let landPixels = 0;
      for (let dy = 0; dy < downscale; dy++) {
        for (let dx = 0; dx < downscale; dx++) {
          const px = x * downscale + dx;
          const py = y * downscale + dy;
          if (data.elevation[py * W + px] > 0) landPixels++;
        }
      }
      mask[y * gw + x] = landPixels * 2 < cellSize ? 1 : 0;
    }
  }

  // Keep only the largest connected sea component.
  const labels = new Int32Array(gw * gh);
  let bestLabel = 0;
  let bestSize = 0;
  let nextLabel = 0;
  const queue: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== 0) continue;
    nextLabel++;
    queue.length = 0;
    queue.push(start);
    labels[start] = nextLabel;
    let size = 0;
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      size++;
      const x = idx % gw;
      const y = (idx / gw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
        const ni = ny * gw + nx;
        if (!mask[ni] || labels[ni] !== 0) continue;
        labels[ni] = nextLabel;
        queue.push(ni);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = nextLabel;
    }
  }
  for (let i = 0; i < mask.length; i++) {
    mask[i] = labels[i] === bestLabel ? 1 : 0;
  }

  return { mask, gw, gh, downscale };
}

function snapToSea(
  sx: number,
  sy: number,
  m: SeaMask,
  maxRadius = 60,
): { x: number; y: number } | null {
  if (m.mask[sy * m.gw + sx]) return { x: sx, y: sy };
  const visited = new Uint8Array(m.gw * m.gh);
  const queue: number[] = [sy * m.gw + sx];
  visited[sy * m.gw + sx] = 1;
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % m.gw;
    const y = (idx / m.gw) | 0;
    if (Math.abs(x - sx) + Math.abs(y - sy) > maxRadius) continue;
    if (m.mask[idx]) return { x, y };
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= m.gw || ny < 0 || ny >= m.gh) continue;
      const ni = ny * m.gw + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      queue.push(ni);
    }
  }
  return null;
}

const ASTAR_DIRS: Array<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

function aStarSea(
  m: SeaMask,
  sx: number, sy: number,
  ex: number, ey: number,
): Array<[number, number]> | null {
  const { mask, gw, gh } = m;
  const startIdx = sy * gw + sx;
  const endIdx = ey * gw + ex;
  if (!mask[startIdx] || !mask[endIdx]) return null;

  const cameFrom = new Int32Array(gw * gh).fill(-1);
  const gScore = new Float32Array(gw * gh);
  gScore.fill(Infinity);
  gScore[startIdx] = 0;

  const open = new MinHeap<{ x: number; y: number; f: number }>((a, b) => a.f - b.f);
  open.push({ x: sx, y: sy, f: Math.hypot(ex - sx, ey - sy) });

  while (open.size > 0) {
    const cur = open.pop()!;
    const ci = cur.y * gw + cur.x;
    if (cur.x === ex && cur.y === ey) {
      const path: Array<[number, number]> = [];
      let i = ci;
      while (i >= 0) {
        path.push([i % gw, (i / gw) | 0]);
        i = cameFrom[i];
      }
      return path.reverse();
    }
    const cg = gScore[ci];
    if (cur.f > cg + Math.hypot(ex - cur.x, ey - cur.y) + 1e-6) continue;
    for (const [dx, dy, step] of ASTAR_DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
      const ni = ny * gw + nx;
      if (!mask[ni]) continue;
      if (dx !== 0 && dy !== 0) {
        if (!mask[cur.y * gw + nx]) continue;
        if (!mask[ny * gw + cur.x]) continue;
      }
      const tg = cg + step;
      if (tg < gScore[ni]) {
        gScore[ni] = tg;
        cameFrom[ni] = ci;
        open.push({ x: nx, y: ny, f: tg + Math.hypot(ex - nx, ey - ny) });
      }
    }
  }
  return null;
}

function lineOfSight(
  m: SeaMask,
  ax: number, ay: number,
  bx: number, by: number,
): boolean {
  let x = ax;
  let y = ay;
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (!m.mask[y * m.gw + x]) return false;
    if (x === bx && y === by) return true;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function stringPull(
  m: SeaMask,
  path: Array<[number, number]>,
): Array<[number, number]> {
  if (path.length < 3) return path;
  const out: Array<[number, number]> = [path[0]];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    const [ax, ay] = path[anchor];
    const [bx, by] = path[i];
    if (!lineOfSight(m, ax, ay, bx, by)) {
      out.push(path[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

function waypointToGrid(wp: Waypoint, data: LoadedData, m: SeaMask): { x: number; y: number } {
  const tx = lonToTileX(wp.lon, ZOOM);
  const ty = latToTileY(wp.lat, ZOOM);
  const u = (tx - data.meta.x0) / GRID;
  const v = (ty - data.meta.y0) / GRID;
  const gx = Math.max(0, Math.min(m.gw - 1, Math.round(u * (m.gw - 1))));
  const gy = Math.max(0, Math.min(m.gh - 1, Math.round(v * (m.gh - 1))));
  return { x: gx, y: gy };
}

function coastAwarePath(loc: Location, data: LoadedData): THREE.Vector3[] {
  if (!loc.route || loc.route.waypoints.length < 2) return [];
  const SEA_OFFSET = 80;
  const m = buildSeaMask(data, 8);

  const snapped: Array<{ x: number; y: number }> = [];
  for (const wp of loc.route.waypoints) {
    const g = waypointToGrid(wp, data, m);
    snapped.push(snapToSea(g.x, g.y, m, 80) ?? g);
  }

  const grid: Array<[number, number]> = [];
  for (let i = 0; i < snapped.length - 1; i++) {
    const a = snapped[i];
    const b = snapped[i + 1];
    const seg = aStarSea(m, a.x, a.y, b.x, b.y);
    if (!seg) {
      console.warn(`[route] no sea path between hint ${i} and ${i + 1}`);
      if (i === 0) grid.push([a.x, a.y]);
      grid.push([b.x, b.y]);
      continue;
    }
    if (i === 0) grid.push(...seg);
    else grid.push(...seg.slice(1));
  }

  const pulled = stringPull(m, grid);
  return pulled.map(([gx, gy]) => {
    const u = gx / (m.gw - 1);
    const v = gy / (m.gh - 1);
    return new THREE.Vector3(
      (u - 0.5) * data.worldW,
      SEA_OFFSET,
      (v - 0.5) * data.worldH,
    );
  });
}

// ---------- Route nodes ----------

interface RouteNodes {
  group: THREE.Group;
  dispose: () => void;
}

function buildRouteNodes(
  loc: Location,
  data: LoadedData,
  resolution: THREE.Vector2,
): RouteNodes | null {
  if (!loc.route || loc.route.waypoints.length < 2) return null;

  const path = coastAwarePath(loc, data);
  if (path.length < 2) return null;

  const positions: number[] = [];
  for (const p of path) positions.push(p.x, p.y, p.z);

  const lineGeom = new LineGeometry();
  lineGeom.setPositions(positions);

  const lineMat = new LineMaterial({
    color: 0x00e0ff,
    linewidth: 3,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
  });
  lineMat.resolution.copy(resolution);

  const line = new Line2(lineGeom, lineMat);
  line.computeLineDistances();

  const group = new THREE.Group();
  group.add(line);

  const portMat = new THREE.MeshStandardMaterial({
    color: 0x00e0ff,
    emissive: 0x004060,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const portGeoms: THREE.BufferGeometry[] = [];
  for (const wp of loc.route.waypoints) {
    if (!wp.label) continue;
    const tx = lonToTileX(wp.lon, ZOOM);
    const ty = latToTileY(wp.lat, ZOOM);
    const u = (tx - data.meta.x0) / GRID;
    const v = (ty - data.meta.y0) / GRID;
    const px = (u - 0.5) * data.worldW;
    const pz = (v - 0.5) * data.worldH;

    const sphereGeom = new THREE.SphereGeometry(180, 18, 14);
    const sphere = new THREE.Mesh(sphereGeom, portMat);
    sphere.position.set(px, 200, pz);
    group.add(sphere);
    portGeoms.push(sphereGeom);

    const poleGeom = new THREE.CylinderGeometry(20, 20, 240, 8);
    const pole = new THREE.Mesh(poleGeom, portMat);
    pole.position.set(px, 120, pz);
    group.add(pole);
    portGeoms.push(poleGeom);
  }

  return {
    group,
    dispose: () => {
      lineGeom.dispose();
      lineMat.dispose();
      portMat.dispose();
      for (const g of portGeoms) g.dispose();
    },
  };
}

// ---------- Public factory ----------

/**
 * Create a terrain scene attached to the given container element. The scene
 * appends its own canvas, listens for container resizes, and exposes async
 * methods for loading locations and updating vertical exaggeration.
 */
export function createTerrainScene(
  container: HTMLElement,
  options: SceneOptions = {},
): TerrainSceneApi {
  const { onStatus } = options;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const initialW = Math.max(1, container.clientWidth);
  const initialH = Math.max(1, container.clientHeight);
  renderer.setSize(initialW, initialH, false);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(55, initialW / initialH, 10, 400_000);

  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.498;
  controls.screenSpacePanning = false;

  const sun = new THREE.DirectionalLight(0xfff4e6, 2.6);
  sun.position.set(40000, 14000, -25000);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xb8d8ff, 0x4b3a26, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  const lineResolution = new THREE.Vector2(initialW, initialH);
  const dataCache = new Map<string, LoadedData>();

  let currentNodes: TerrainNodes | null = null;
  let currentRoute: RouteNodes | null = null;
  let currentVex = 1;
  let switchInFlight = false;
  let disposed = false;

  // ---- Resize handling ----
  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    lineResolution.set(w, h);
    if (currentRoute) {
      const line = currentRoute.group.children[0] as Line2;
      (line.material as LineMaterial).resolution.copy(lineResolution);
    }
  });
  resizeObserver.observe(container);

  // ---- Keyboard arrow-key control ----
  const keys = { left: false, right: false, up: false, down: false };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && t.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') keys.left = down;
    else if (e.key === 'ArrowRight') keys.right = down;
    else if (e.key === 'ArrowUp') keys.up = down;
    else if (e.key === 'ArrowDown') keys.down = down;
    else return;
    e.preventDefault();
  };
  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---- Animation loop ----
  const clock = new THREE.Clock();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const tmpOffset = new THREE.Vector3();
  const tmpSpherical = new THREE.Spherical();
  const ROT_RATE = 1.1;
  const TILT_RATE = 0.9;
  const MIN_PHI = 0.05;
  let rafId = 0;

  const tick = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    const dt = clock.getDelta();

    const turn = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const tilt = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (turn !== 0 || tilt !== 0) {
      tmpOffset.subVectors(camera.position, controls.target);
      if (turn !== 0) {
        tmpOffset.applyAxisAngle(yAxis, turn * ROT_RATE * dt);
      }
      if (tilt !== 0) {
        tmpSpherical.setFromVector3(tmpOffset);
        tmpSpherical.phi = Math.max(
          MIN_PHI,
          Math.min(controls.maxPolarAngle, tmpSpherical.phi + tilt * TILT_RATE * dt),
        );
        tmpOffset.setFromSpherical(tmpSpherical);
      }
      camera.position.copy(controls.target).add(tmpOffset);
    }

    controls.update();
    renderer.render(scene, camera);
  };
  rafId = requestAnimationFrame(tick);

  // ---- Data loading ----
  async function fetchLocationData(loc: Location): Promise<LoadedData> {
    const cached = dataCache.get(loc.id);
    if (cached) return cached;

    const cx = lonToTileX(loc.lon, ZOOM);
    const cy = latToTileY(loc.lat, ZOOM);

    onStatus?.(`Loading elevation tiles for ${loc.name}…`);
    const dem = await stitchTiles(cx, cy, ZOOM, GRID, terrainUrl, (l, t) =>
      onStatus?.(`Loading elevation tiles for ${loc.name}… ${l}/${t}`),
    );
    const elevation = decodeTerrarium(dem.canvas);

    onStatus?.(`Loading satellite imagery for ${loc.name}…`);
    const sat = await stitchTiles(cx, cy, ZOOM, GRID, imageryUrl, (l, t) =>
      onStatus?.(`Loading satellite imagery for ${loc.name}… ${l}/${t}`),
    );

    const satTexture = new THREE.CanvasTexture(sat.canvas);
    satTexture.colorSpace = THREE.SRGBColorSpace;
    satTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    satTexture.minFilter = THREE.LinearMipmapLinearFilter;
    satTexture.magFilter = THREE.LinearFilter;
    satTexture.generateMipmaps = true;

    const mpp = metersPerPixel(loc.lat, ZOOM);
    const data: LoadedData = {
      elevation,
      satTexture,
      meta: dem.meta,
      worldW: mpp * dem.meta.width,
      worldH: mpp * dem.meta.height,
    };
    dataCache.set(loc.id, data);
    return data;
  }

  // ---- Public methods ----
  async function switchTo(loc: Location): Promise<void> {
    if (switchInFlight) return;
    if (disposed) return;
    switchInFlight = true;
    try {
      const data = await fetchLocationData(loc);
      if (disposed) return;

      if (currentNodes) {
        disposeTerrainNodes(scene, currentNodes);
        currentNodes = null;
      }
      if (currentRoute) {
        scene.remove(currentRoute.group);
        currentRoute.dispose();
        currentRoute = null;
      }

      const focus = orbitFocus(loc, data) ?? autoSummitFocus(data);
      const nodes = buildTerrainNodes(data, focus);
      scene.add(nodes.mesh);
      scene.add(nodes.marker);
      currentNodes = nodes;

      currentRoute = buildRouteNodes(loc, data, lineResolution);
      if (currentRoute) scene.add(currentRoute.group);

      if (currentVex !== 1) applyVex(currentVex);

      const { worldW } = data;
      camera.position.setFromSphericalCoords(
        worldW * 0.55,
        THREE.MathUtils.degToRad(5),
        0,
      );
      controls.target.set(0, 0, 0);
      controls.minDistance = 800;
      controls.maxDistance = worldW * 1.6;
      controls.update();

      scene.fog = new THREE.Fog(0x000000, worldW * 0.7, worldW * 2.4);
      onStatus?.('');
    } catch (err) {
      console.error(err);
      onStatus?.(`Error loading ${loc.name}: ${(err as Error).message}`);
      throw err;
    } finally {
      switchInFlight = false;
    }
  }

  function applyVex(vex: number): void {
    currentVex = vex;
    if (!currentNodes) return;
    const { positions, baseElev, geometry, marker, focus } = currentNodes;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, baseElev[i] * vex);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    marker.position.y = focus.elev * vex + 200;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    if (currentNodes) disposeTerrainNodes(scene, currentNodes);
    if (currentRoute) {
      scene.remove(currentRoute.group);
      currentRoute.dispose();
    }
    for (const data of dataCache.values()) {
      data.satTexture.dispose();
    }
    dataCache.clear();
    controls.dispose();
    renderer.dispose();
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return { switchTo, applyVex, dispose };
}
