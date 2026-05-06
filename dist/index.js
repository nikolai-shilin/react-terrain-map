var wt = Object.defineProperty;
var xt = (n, t, e) => t in n ? wt(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var st = (n, t, e) => xt(n, typeof t != "symbol" ? t + "" : t, e);
import { jsxs as W, jsx as L, Fragment as vt } from "react/jsx-runtime";
import { useRef as rt, useState as q, useEffect as at, useCallback as Mt } from "react";
import * as w from "three";
import { MapControls as bt } from "three/addons/controls/MapControls.js";
import { Line2 as St } from "three/addons/lines/Line2.js";
import { LineGeometry as kt } from "three/addons/lines/LineGeometry.js";
import { LineMaterial as At } from "three/addons/lines/LineMaterial.js";
const S = {
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
  terrainUrl: (n, t, e) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${n}/${t}/${e}.png`,
  /** ESRI World Imagery — y/x swap is intentional for the ArcGIS path style. */
  imageryUrl: (n, t, e) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${n}/${e}/${t}`
}, ct = {
  maxPixelRatio: 2,
  backgroundColor: 0
}, Y = {
  fov: 55,
  near: 10,
  far: 4e5,
  /** Initial radial distance = `initialDistFactor × worldW`. */
  initialDistFactor: 0.55,
  /** Initial polar angle from straight-up, in degrees. */
  initialPolarDeg: 5
}, K = {
  dampingFactor: 0.08,
  /** Just below π/2 so the camera never goes below the horizon. */
  maxPolarAngle: Math.PI * 0.498,
  minDistance: 800,
  /** Max distance = `maxDistFactor × worldW`. */
  maxDistFactor: 1.6
}, Z = {
  /** Horizontal rotation rate (rad/sec) for ← / →. */
  rotRate: 1.1,
  /** Vertical tilt rate (rad/sec) for ↑ / ↓. */
  tiltRate: 0.9,
  /** Minimum polar angle so the camera never tilts past straight-up. */
  minPhi: 0.05
}, N = {
  sun: {
    color: 16774374,
    intensity: 2.6,
    position: [4e4, 14e3, -25e3]
  },
  hemi: {
    sky: 12114175,
    ground: 4930086,
    intensity: 0.55
  },
  ambient: {
    color: 16777215,
    intensity: 0.15
  }
}, J = {
  color: 0,
  /** Fog spans nearFactor × worldW to farFactor × worldW. */
  nearFactor: 0.7,
  farFactor: 2.4
}, lt = {
  roughness: 0.95,
  metalness: 0
}, H = {
  cone: { radius: 80, height: 320, segments: 16 },
  /** Marker hovers this many world-units above the focus elevation. */
  heightOffset: 200,
  roughness: 0.4,
  summit: { color: 16724804, emissive: 6689041 },
  orbit: { color: 16756768, emissive: 5583616 }
}, k = {
  line: {
    color: 57599,
    width: 3,
    opacity: 0.95
  },
  port: {
    color: 57599,
    emissive: 16480,
    emissiveIntensity: 1.2,
    roughness: 0.3,
    sphere: { radius: 180, widthSeg: 18, heightSeg: 14, y: 200 },
    pole: { radius: 20, height: 240, segments: 8, y: 120 }
  },
  /** Height of the route line above sea level. */
  seaOffset: 80
}, ut = {
  /** Downscale factor when building the sea-mask grid. */
  maskDownscale: 8,
  /** Max BFS radius (in mask cells) when snapping a waypoint onto sea. */
  snapMaxRadius: 80
}, j = {
  default: 1,
  min: 1,
  max: 4,
  step: 0.1
}, tt = {
  mouseHint: "drag to pan · right-drag to rotate · scroll to zoom",
  keyHint: "← → rotate · ↑ ↓ tilt",
  attribution: "elevation: AWS Terrain Tiles · imagery: ESRI World Imagery"
};
function _(n, t) {
  return (n + 180) / 360 * 2 ** t;
}
function V(n, t) {
  const e = n * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(e)) / Math.PI) / 2 * 2 ** t;
}
function Rt(n, t) {
  return 156543.03392 * Math.cos(n * Math.PI / 180) / 2 ** t;
}
function Tt(n) {
  return new Promise((t, e) => {
    const i = new Image();
    i.crossOrigin = "anonymous", i.onload = () => t(i), i.onerror = () => e(new Error(`Failed to load ${n}`)), i.src = n;
  });
}
function Ft(n, t, e) {
  let i = 1 / 0, r = -1 / 0, a = 1 / 0, o = -1 / 0, s = 0;
  for (const l of n) {
    s += l.lat;
    const c = _(l.lon, t), v = V(l.lat, t);
    c < i && (i = c), c > r && (r = c), v < a && (a = v), v > o && (o = v);
  }
  const h = (i + r) / 2, u = (a + o) / 2, m = Math.max(r - i, o - a) * (1 + 2 * e), g = Math.max(1, Math.ceil(m));
  return { cx: h, cy: u, grid: g, centerLat: s / n.length };
}
async function ht(n, t, e, i, r, a) {
  const o = Math.floor(n - i / 2), s = Math.floor(t - i / 2), h = S.px * i, u = S.px * i, d = document.createElement("canvas");
  d.width = h, d.height = u;
  const m = d.getContext("2d", { willReadFrequently: !0 }), g = i * i;
  let l = 0;
  const c = [];
  for (let v = 0; v < i; v++)
    for (let x = 0; x < i; x++) {
      const p = r(e, o + x, s + v);
      c.push(
        Tt(p).then((y) => {
          m.drawImage(y, x * S.px, v * S.px), l++, a == null || a(l, g);
        })
      );
    }
  return await Promise.all(c), { canvas: d, meta: { x0: o, y0: s, width: h, height: u, grid: i } };
}
function It(n) {
  const t = n.getContext("2d"), { width: e, height: i } = n, r = t.getImageData(0, 0, e, i).data, a = new Float32Array(e * i);
  for (let o = 0, s = 0; o < a.length; o++, s += 4)
    a[o] = r[s] * 256 + r[s + 1] + r[s + 2] / 256 - 32768;
  return a;
}
function pt(n, t, e) {
  const i = n.meta.width, r = n.meta.height, a = Math.max(0, Math.min(i - 1.0001, t * (i - 1))), o = Math.max(0, Math.min(r - 1.0001, e * (r - 1))), s = Math.floor(a), h = Math.floor(o), u = a - s, d = o - h, m = h * i + s, g = n.elevation[m], l = n.elevation[m + 1], c = n.elevation[m + i], v = n.elevation[m + i + 1];
  return g * (1 - u) * (1 - d) + l * u * (1 - d) + c * (1 - u) * d + v * u * d;
}
function Lt(n) {
  const { elevation: t, meta: e, worldW: i, worldH: r } = n, a = e.width;
  let o = -1 / 0, s = 0;
  for (let d = 0; d < t.length; d++)
    t[d] > o && (o = t[d], s = d);
  const h = s % a, u = Math.floor(s / a);
  return {
    x: (h / a - 0.5) * i,
    z: (u / e.height - 0.5) * r,
    elev: o,
    kind: "summit"
  };
}
function Et(n, t) {
  if (!n.orbitPoint) return null;
  const e = _(n.orbitPoint.lon, S.zoom), i = V(n.orbitPoint.lat, S.zoom), r = (e - t.meta.x0) / t.meta.grid, a = (i - t.meta.y0) / t.meta.grid;
  return r < 0 || r > 1 || a < 0 || a > 1 ? null : {
    x: (r - 0.5) * t.worldW,
    z: (a - 0.5) * t.worldH,
    elev: pt(t, r, a),
    kind: "orbit"
  };
}
function Pt(n) {
  const t = n.kind === "orbit" ? H.orbit : H.summit, e = new w.Mesh(
    new w.ConeGeometry(H.cone.radius, H.cone.height, H.cone.segments),
    new w.MeshStandardMaterial({
      color: t.color,
      emissive: t.emissive,
      roughness: H.roughness
    })
  );
  return e.position.set(n.x, n.elev + H.heightOffset, n.z), e;
}
function zt(n, t) {
  const { satTexture: e, worldW: i, worldH: r } = n, a = new w.PlaneGeometry(i, r, S.planeSegments, S.planeSegments);
  a.rotateX(-Math.PI / 2);
  const o = a.attributes.position, s = new Float32Array(o.count);
  for (let m = 0; m < o.count; m++) {
    const g = o.getX(m), l = o.getZ(m), c = pt(n, g / i + 0.5, l / r + 0.5);
    s[m] = c, o.setY(m, c);
  }
  o.needsUpdate = !0, a.computeVertexNormals();
  const h = new w.MeshStandardMaterial({
    map: e,
    roughness: lt.roughness,
    metalness: lt.metalness
  }), u = new w.Mesh(a, h), d = Pt(t);
  return { mesh: u, marker: d, geometry: a, material: h, positions: o, baseElev: s, focus: t };
}
function mt(n, t) {
  n.remove(t.mesh), n.remove(t.marker), t.geometry.dispose(), t.material.dispose(), t.marker.geometry.dispose(), t.marker.material.dispose();
}
class Ct {
  constructor(t) {
    st(this, "items", []);
    this.cmp = t;
  }
  get size() {
    return this.items.length;
  }
  push(t) {
    this.items.push(t);
    let e = this.items.length - 1;
    for (; e > 0; ) {
      const i = e - 1 >> 1;
      if (this.cmp(this.items[e], this.items[i]) >= 0) break;
      [this.items[e], this.items[i]] = [this.items[i], this.items[e]], e = i;
    }
  }
  pop() {
    if (this.items.length === 0) return;
    const t = this.items[0], e = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = e;
      let i = 0;
      const r = this.items.length;
      for (; ; ) {
        const a = 2 * i + 1, o = 2 * i + 2;
        let s = i;
        if (a < r && this.cmp(this.items[a], this.items[s]) < 0 && (s = a), o < r && this.cmp(this.items[o], this.items[s]) < 0 && (s = o), s === i) break;
        [this.items[i], this.items[s]] = [this.items[s], this.items[i]], i = s;
      }
    }
    return t;
  }
}
function Dt(n, t) {
  const e = n.meta.width, i = n.meta.height, r = Math.floor(e / t), a = Math.floor(i / t), o = new Uint8Array(r * a), s = t * t;
  for (let l = 0; l < a; l++)
    for (let c = 0; c < r; c++) {
      let v = 0;
      for (let x = 0; x < t; x++)
        for (let p = 0; p < t; p++) {
          const y = c * t + p, b = l * t + x;
          n.elevation[b * e + y] > 0 && v++;
        }
      o[l * r + c] = v * 2 < s ? 1 : 0;
    }
  const h = new Int32Array(r * a);
  let u = 0, d = 0, m = 0;
  const g = [];
  for (let l = 0; l < o.length; l++) {
    if (!o[l] || h[l] !== 0) continue;
    m++, g.length = 0, g.push(l), h[l] = m;
    let c = 0, v = 0;
    for (; v < g.length; ) {
      const x = g[v++];
      c++;
      const p = x % r, y = x / r | 0;
      for (const [b, A] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const T = p + b, F = y + A;
        if (T < 0 || T >= r || F < 0 || F >= a) continue;
        const I = F * r + T;
        !o[I] || h[I] !== 0 || (h[I] = m, g.push(I));
      }
    }
    c > d && (d = c, u = m);
  }
  for (let l = 0; l < o.length; l++)
    o[l] = h[l] === u ? 1 : 0;
  return { mask: o, gw: r, gh: a, downscale: t };
}
function Nt(n, t, e, i = 60) {
  if (e.mask[t * e.gw + n]) return { x: n, y: t };
  const r = new Uint8Array(e.gw * e.gh), a = [t * e.gw + n];
  r[t * e.gw + n] = 1;
  let o = 0;
  for (; o < a.length; ) {
    const s = a[o++], h = s % e.gw, u = s / e.gw | 0;
    if (!(Math.abs(h - n) + Math.abs(u - t) > i)) {
      if (e.mask[s]) return { x: h, y: u };
      for (const [d, m] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const g = h + d, l = u + m;
        if (g < 0 || g >= e.gw || l < 0 || l >= e.gh) continue;
        const c = l * e.gw + g;
        r[c] || (r[c] = 1, a.push(c));
      }
    }
  }
  return null;
}
const Ht = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];
function Gt(n, t, e, i, r) {
  const { mask: a, gw: o, gh: s } = n, h = e * o + t, u = r * o + i;
  if (!a[h] || !a[u]) return null;
  const d = new Int32Array(o * s).fill(-1), m = new Float32Array(o * s);
  m.fill(1 / 0), m[h] = 0;
  const g = new Ct((l, c) => l.f - c.f);
  for (g.push({ x: t, y: e, f: Math.hypot(i - t, r - e) }); g.size > 0; ) {
    const l = g.pop(), c = l.y * o + l.x;
    if (l.x === i && l.y === r) {
      const x = [];
      let p = c;
      for (; p >= 0; )
        x.push([p % o, p / o | 0]), p = d[p];
      return x.reverse();
    }
    const v = m[c];
    if (!(l.f > v + Math.hypot(i - l.x, r - l.y) + 1e-6))
      for (const [x, p, y] of Ht) {
        const b = l.x + x, A = l.y + p;
        if (b < 0 || b >= o || A < 0 || A >= s) continue;
        const T = A * o + b;
        if (!a[T] || x !== 0 && p !== 0 && (!a[l.y * o + b] || !a[A * o + l.x]))
          continue;
        const F = v + y;
        F < m[T] && (m[T] = F, d[T] = c, g.push({ x: b, y: A, f: F + Math.hypot(i - b, r - A) }));
      }
  }
  return null;
}
function Ot(n, t, e, i, r) {
  let a = t, o = e;
  const s = Math.abs(i - t), h = Math.abs(r - e), u = t < i ? 1 : -1, d = e < r ? 1 : -1;
  let m = s - h;
  for (; ; ) {
    if (!n.mask[o * n.gw + a]) return !1;
    if (a === i && o === r) return !0;
    const g = m * 2;
    g > -h && (m -= h, a += u), g < s && (m += s, o += d);
  }
}
function $t(n, t) {
  if (t.length < 3) return t;
  const e = [t[0]];
  let i = 0;
  for (let r = 2; r < t.length; r++) {
    const [a, o] = t[i], [s, h] = t[r];
    Ot(n, a, o, s, h) || (e.push(t[r - 1]), i = r - 1);
  }
  return e.push(t[t.length - 1]), e;
}
function Wt(n, t, e) {
  const i = _(n.lon, S.zoom), r = V(n.lat, S.zoom), a = (i - t.meta.x0) / t.meta.grid, o = (r - t.meta.y0) / t.meta.grid, s = Math.max(0, Math.min(e.gw - 1, Math.round(a * (e.gw - 1)))), h = Math.max(0, Math.min(e.gh - 1, Math.round(o * (e.gh - 1))));
  return { x: s, y: h };
}
function _t(n, t) {
  if (!n.route || n.route.waypoints.length < 2) return [];
  const e = Dt(t, ut.maskDownscale), i = [];
  for (const o of n.route.waypoints) {
    const s = Wt(o, t, e);
    i.push(Nt(s.x, s.y, e, ut.snapMaxRadius) ?? s);
  }
  const r = [];
  for (let o = 0; o < i.length - 1; o++) {
    const s = i[o], h = i[o + 1], u = Gt(e, s.x, s.y, h.x, h.y);
    if (!u) {
      console.warn(`[route] no sea path between hint ${o} and ${o + 1}`), o === 0 && r.push([s.x, s.y]), r.push([h.x, h.y]);
      continue;
    }
    o === 0 ? r.push(...u) : r.push(...u.slice(1));
  }
  return $t(e, r).map(([o, s]) => {
    const h = o / (e.gw - 1), u = s / (e.gh - 1);
    return new w.Vector3(
      (h - 0.5) * t.worldW,
      k.seaOffset,
      (u - 0.5) * t.worldH
    );
  });
}
function Vt(n) {
  return n.waypoints.some((t) => typeof t.alt == "number");
}
function Ut(n, t) {
  const e = [];
  for (const i of n) {
    const r = _(i.lon, S.zoom), a = V(i.lat, S.zoom), o = (r - t.meta.x0) / t.meta.grid, s = (a - t.meta.y0) / t.meta.grid;
    e.push(
      new w.Vector3(
        (o - 0.5) * t.worldW,
        i.alt ?? 0,
        (s - 0.5) * t.worldH
      )
    );
  }
  return e;
}
function Yt(n, t, e) {
  if (!n.route || n.route.waypoints.length < 2) return null;
  const i = Vt(n.route), r = i ? Ut(n.route.waypoints, t) : _t(n, t);
  if (r.length < 2) return null;
  const a = [];
  for (const c of r) a.push(c.x, c.y, c.z);
  const o = new kt();
  o.setPositions(a);
  const s = new At({
    color: k.line.color,
    linewidth: k.line.width,
    transparent: !0,
    opacity: k.line.opacity,
    depthTest: !0
  });
  s.resolution.copy(e);
  const h = new St(o, s);
  h.computeLineDistances();
  const u = new w.Group();
  u.add(h);
  const d = new w.MeshStandardMaterial({
    color: k.port.color,
    emissive: k.port.emissive,
    emissiveIntensity: k.port.emissiveIntensity,
    roughness: k.port.roughness
  }), m = [], g = [];
  for (const c of n.route.waypoints) {
    if (!c.label) continue;
    const v = _(c.lon, S.zoom), x = V(c.lat, S.zoom), p = (v - t.meta.x0) / t.meta.grid, y = (x - t.meta.y0) / t.meta.grid, b = (p - 0.5) * t.worldW, A = (y - 0.5) * t.worldH, T = new w.SphereGeometry(
      k.port.sphere.radius,
      k.port.sphere.widthSeg,
      k.port.sphere.heightSeg
    ), F = new w.Mesh(T, d);
    if (m.push(T), i) {
      const I = new w.CylinderGeometry(
        k.port.pole.radius,
        k.port.pole.radius,
        1,
        k.port.pole.segments
      ), C = new w.Mesh(I, d);
      m.push(I);
      const P = c.alt ?? 0;
      F.position.set(b, P, A), C.scale.y = Math.max(1, P), C.position.set(b, P / 2, A), u.add(F), u.add(C), g.push({ sphere: F, pole: C, baseAlt: P });
    } else {
      const I = new w.CylinderGeometry(
        k.port.pole.radius,
        k.port.pole.radius,
        k.port.pole.height,
        k.port.pole.segments
      ), C = new w.Mesh(I, d);
      m.push(I), F.position.set(b, k.port.sphere.y, A), C.position.set(b, k.port.pole.y, A), u.add(F), u.add(C);
    }
  }
  let l;
  if (i) {
    const c = r.map((v) => v.y);
    l = (v) => {
      const x = new Float32Array(r.length * 3);
      for (let p = 0; p < r.length; p++)
        x[p * 3] = r[p].x, x[p * 3 + 1] = c[p] * v, x[p * 3 + 2] = r[p].z;
      o.setPositions(x);
      for (const p of g) {
        const y = p.baseAlt * v;
        p.sphere.position.y = y, p.pole.scale.y = Math.max(1, y), p.pole.position.y = y / 2;
      }
    };
  }
  return {
    group: u,
    applyVex: l,
    dispose: () => {
      o.dispose(), s.dispose(), d.dispose();
      for (const c of m) c.dispose();
    }
  };
}
function Xt(n, t = {}) {
  const { onStatus: e } = t, i = new w.WebGLRenderer({ antialias: !0 });
  i.setPixelRatio(Math.min(window.devicePixelRatio, ct.maxPixelRatio)), i.outputColorSpace = w.SRGBColorSpace;
  const r = Math.max(1, n.clientWidth), a = Math.max(1, n.clientHeight);
  i.setSize(r, a, !1);
  const o = i.domElement;
  o.style.display = "block", o.style.width = "100%", o.style.height = "100%", n.appendChild(o);
  const s = new w.Scene();
  s.background = new w.Color(ct.backgroundColor);
  const h = new w.PerspectiveCamera(
    Y.fov,
    r / a,
    Y.near,
    Y.far
  ), u = new bt(h, o);
  u.enableDamping = !0, u.dampingFactor = K.dampingFactor, u.maxPolarAngle = K.maxPolarAngle, u.screenSpacePanning = !1;
  const d = new w.DirectionalLight(N.sun.color, N.sun.intensity);
  d.position.set(...N.sun.position), s.add(d), s.add(new w.HemisphereLight(N.hemi.sky, N.hemi.ground, N.hemi.intensity)), s.add(new w.AmbientLight(N.ambient.color, N.ambient.intensity));
  const m = new w.Vector2(r, a), g = /* @__PURE__ */ new Map();
  let l = null, c = null, v = 1, x = !1, p = !1;
  const y = new ResizeObserver(() => {
    if (p) return;
    const f = Math.max(1, n.clientWidth), M = Math.max(1, n.clientHeight);
    h.aspect = f / M, h.updateProjectionMatrix(), i.setSize(f, M, !1), m.set(f, M), c && c.group.children[0].material.resolution.copy(m);
  });
  y.observe(n);
  const b = { left: !1, right: !1, up: !1, down: !1 }, A = (f) => (M) => {
    const R = M.target;
    if (!(R && R.matches("input, textarea, select"))) {
      if (M.key === "ArrowLeft") b.left = f;
      else if (M.key === "ArrowRight") b.right = f;
      else if (M.key === "ArrowUp") b.up = f;
      else if (M.key === "ArrowDown") b.down = f;
      else return;
      M.preventDefault();
    }
  }, T = A(!0), F = A(!1);
  window.addEventListener("keydown", T), window.addEventListener("keyup", F);
  const I = new w.Clock(), C = new w.Vector3(0, 1, 0), P = new w.Vector3(), X = new w.Spherical();
  let B = 0;
  const et = () => {
    if (p) return;
    B = requestAnimationFrame(et);
    const f = I.getDelta(), M = (b.left ? 1 : 0) - (b.right ? 1 : 0), R = (b.down ? 1 : 0) - (b.up ? 1 : 0);
    (M !== 0 || R !== 0) && (P.subVectors(h.position, u.target), M !== 0 && P.applyAxisAngle(C, M * Z.rotRate * f), R !== 0 && (X.setFromVector3(P), X.phi = Math.max(
      Z.minPhi,
      Math.min(u.maxPolarAngle, X.phi + R * Z.tiltRate * f)
    ), P.setFromSpherical(X)), h.position.copy(u.target).add(P)), u.update(), i.render(s, h);
  };
  B = requestAnimationFrame(et);
  async function ft(f) {
    const M = g.get(f.id);
    if (M) return M;
    let R, z, E, U;
    if (f.route && f.route.waypoints.length >= 2) {
      const D = Ft(
        f.route.waypoints,
        S.zoom,
        S.routePaddingFactor
      );
      R = D.cx, z = D.cy, E = D.grid, U = D.centerLat;
    } else {
      if (typeof f.lat != "number" || typeof f.lon != "number")
        throw new Error(
          `Location "${f.id}" needs either a route (≥ 2 waypoints) or both lat/lon`
        );
      R = _(f.lon, S.zoom), z = V(f.lat, S.zoom), E = S.grid, U = f.lat;
    }
    e == null || e(`Loading elevation tiles for ${f.name}…`);
    const G = await ht(
      R,
      z,
      S.zoom,
      E,
      S.terrainUrl,
      (D, Q) => e == null ? void 0 : e(`Loading elevation tiles for ${f.name}… ${D}/${Q}`)
    ), O = It(G.canvas);
    e == null || e(`Loading satellite imagery for ${f.name}…`);
    const yt = await ht(
      R,
      z,
      S.zoom,
      E,
      S.imageryUrl,
      (D, Q) => e == null ? void 0 : e(`Loading satellite imagery for ${f.name}… ${D}/${Q}`)
    ), $ = new w.CanvasTexture(yt.canvas);
    $.colorSpace = w.SRGBColorSpace, $.anisotropy = i.capabilities.getMaxAnisotropy(), $.minFilter = w.LinearMipmapLinearFilter, $.magFilter = w.LinearFilter, $.generateMipmaps = !0;
    const ot = Rt(U, S.zoom), it = {
      elevation: O,
      satTexture: $,
      meta: G.meta,
      worldW: ot * G.meta.width,
      worldH: ot * G.meta.height
    };
    return g.set(f.id, it), it;
  }
  async function dt(f) {
    if (!x && !p) {
      x = !0;
      try {
        const M = await ft(f);
        if (p) return;
        l && (mt(s, l), l = null), c && (s.remove(c.group), c.dispose(), c = null);
        const R = Et(f, M) ?? Lt(M), z = zt(M, R);
        s.add(z.mesh), s.add(z.marker), l = z, c = Yt(f, M, m), c && s.add(c.group), v !== 1 && nt(v);
        const { worldW: E } = M;
        h.position.setFromSphericalCoords(
          E * Y.initialDistFactor,
          w.MathUtils.degToRad(Y.initialPolarDeg),
          0
        ), u.target.set(0, 0, 0), u.minDistance = K.minDistance, u.maxDistance = E * K.maxDistFactor, u.update(), s.fog = new w.Fog(J.color, E * J.nearFactor, E * J.farFactor), e == null || e("");
      } catch (M) {
        throw console.error(M), e == null || e(`Error loading ${f.name}: ${M.message}`), M;
      } finally {
        x = !1;
      }
    }
  }
  function nt(f) {
    var M;
    if (v = f, l) {
      const { positions: R, baseElev: z, geometry: E, marker: U, focus: G } = l;
      for (let O = 0; O < R.count; O++)
        R.setY(O, z[O] * f);
      R.needsUpdate = !0, E.computeVertexNormals(), U.position.y = G.elev * f + H.heightOffset;
    }
    (M = c == null ? void 0 : c.applyVex) == null || M.call(c, f);
  }
  function gt() {
    if (!p) {
      p = !0, cancelAnimationFrame(B), y.disconnect(), window.removeEventListener("keydown", T), window.removeEventListener("keyup", F), l && mt(s, l), c && (s.remove(c.group), c.dispose());
      for (const f of g.values())
        f.satTexture.dispose();
      g.clear(), u.dispose(), i.dispose(), o.parentNode === n && n.removeChild(o);
    }
  }
  return { switchTo: dt, applyVex: nt, dispose: gt };
}
const qt = {
  locations: !0,
  verticalExaggeration: !0,
  info: !0
}, Kt = {
  locations: !1,
  verticalExaggeration: !1,
  info: !1
};
function jt(n) {
  return n === !1 ? Kt : n === !0 || n === void 0 ? qt : {
    locations: n.locations ?? !0,
    verticalExaggeration: n.verticalExaggeration ?? !0,
    info: n.info ?? !0
  };
}
function oe({
  className: n,
  locations: t,
  initialLocationId: e,
  controls: i
}) {
  const r = jt(i), a = rt(null), o = rt(null), [s, h] = q(null), [u, d] = q(j.default), [m, g] = q(""), [l, c] = q(!1);
  at(() => {
    const y = a.current;
    if (!y) return;
    const b = Xt(y, { onStatus: g });
    if (o.current = b, t.length > 0) {
      const A = t.find((T) => T.id === e) ?? t[0];
      c(!0), b.switchTo(A).then(() => h(A.id)).catch(() => {
      }).finally(() => c(!1));
    }
    return () => {
      b.dispose(), o.current = null;
    };
  }, []), at(() => {
    var y;
    (y = o.current) == null || y.applyVex(u);
  }, [u]);
  const v = Mt(
    async (y) => {
      if (!(l || y.id === s || !o.current)) {
        c(!0);
        try {
          await o.current.switchTo(y), h(y.id);
        } catch {
        } finally {
          c(!1);
        }
      }
    },
    [l, s]
  ), x = t.find((y) => y.id === s), p = ["terrain-map", n].filter(Boolean).join(" ");
  return /* @__PURE__ */ W("div", { ref: a, className: p, children: [
    m && /* @__PURE__ */ L("div", { className: "terrain-map__status", children: m }),
    r.locations && t.length > 1 && /* @__PURE__ */ L("div", { className: "terrain-map__locations", children: t.map((y) => /* @__PURE__ */ L(
      "button",
      {
        type: "button",
        className: y.id === s ? "is-active" : void 0,
        disabled: l,
        onClick: () => v(y),
        children: y.name
      },
      y.id
    )) }),
    r.info && /* @__PURE__ */ L("div", { className: "terrain-map__hud", children: x ? /* @__PURE__ */ W(vt, { children: [
      /* @__PURE__ */ L("strong", { children: x.name }),
      " · ",
      /* @__PURE__ */ L("span", { children: x.subtitle }),
      x.route && /* @__PURE__ */ W("span", { children: [
        " · ",
        x.route.name
      ] }),
      /* @__PURE__ */ L("br", {}),
      tt.mouseHint,
      /* @__PURE__ */ L("br", {}),
      tt.keyHint,
      /* @__PURE__ */ L("br", {}),
      /* @__PURE__ */ L("span", { className: "terrain-map__muted", children: tt.attribution })
    ] }) : /* @__PURE__ */ L("span", { className: "terrain-map__muted", children: "No location selected." }) }),
    r.verticalExaggeration && /* @__PURE__ */ W("div", { className: "terrain-map__vex", children: [
      /* @__PURE__ */ W("label", { children: [
        "Vertical exaggeration",
        " ",
        /* @__PURE__ */ W("span", { children: [
          u.toFixed(1),
          "×"
        ] })
      ] }),
      /* @__PURE__ */ L(
        "input",
        {
          type: "range",
          min: j.min,
          max: j.max,
          step: j.step,
          value: u,
          onChange: (y) => d(parseFloat(y.target.value))
        }
      )
    ] })
  ] });
}
export {
  oe as TerrainMap
};
//# sourceMappingURL=index.js.map
