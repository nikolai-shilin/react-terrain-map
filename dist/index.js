var ut = Object.defineProperty;
var ht = (e, t, n) => t in e ? ut(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var K = (e, t, n) => ht(e, typeof t != "symbol" ? t + "" : t, n);
import { jsxs as _, jsx as A, Fragment as mt } from "react/jsx-runtime";
import { useRef as Y, useState as z, useEffect as Z, useCallback as ft } from "react";
import * as w from "three";
import { MapControls as pt } from "three/addons/controls/MapControls.js";
import { Line2 as dt } from "three/addons/lines/Line2.js";
import { LineGeometry as gt } from "three/addons/lines/LineGeometry.js";
import { LineMaterial as wt } from "three/addons/lines/LineMaterial.js";
const L = 12, F = 16, G = 256, J = 1024, yt = (e, t, n) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${e}/${t}/${n}.png`, xt = (e, t, n) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${e}/${n}/${t}`;
function H(e, t) {
  return (e + 180) / 360 * 2 ** t;
}
function O(e, t) {
  const n = e * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(n)) / Math.PI) / 2 * 2 ** t;
}
function vt(e, t) {
  return 156543.03392 * Math.cos(e * Math.PI / 180) / 2 ** t;
}
function Mt(e) {
  return new Promise((t, n) => {
    const o = new Image();
    o.crossOrigin = "anonymous", o.onload = () => t(o), o.onerror = () => n(new Error(`Failed to load ${e}`)), o.src = e;
  });
}
async function tt(e, t, n, o, a, r) {
  const s = Math.floor(e - o / 2), i = Math.floor(t - o / 2), c = G * o, u = G * o, f = document.createElement("canvas");
  f.width = c, f.height = u;
  const h = f.getContext("2d", { willReadFrequently: !0 }), p = o * o;
  let l = 0;
  const m = [];
  for (let b = 0; b < o; b++)
    for (let x = 0; x < o; x++) {
      const v = a(n, s + x, i + b);
      m.push(
        Mt(v).then((d) => {
          h.drawImage(d, x * G, b * G), l++, r == null || r(l, p);
        })
      );
    }
  return await Promise.all(m), { canvas: f, meta: { x0: s, y0: i, width: c, height: u } };
}
function bt(e) {
  const t = e.getContext("2d"), { width: n, height: o } = e, a = t.getImageData(0, 0, n, o).data, r = new Float32Array(n * o);
  for (let s = 0, i = 0; s < r.length; s++, i += 4)
    r[s] = a[i] * 256 + a[i + 1] + a[i + 2] / 256 - 32768;
  return r;
}
function nt(e, t, n) {
  const o = e.meta.width, a = e.meta.height, r = Math.max(0, Math.min(o - 1.0001, t * (o - 1))), s = Math.max(0, Math.min(a - 1.0001, n * (a - 1))), i = Math.floor(r), c = Math.floor(s), u = r - i, f = s - c, h = c * o + i, p = e.elevation[h], l = e.elevation[h + 1], m = e.elevation[h + o], b = e.elevation[h + o + 1];
  return p * (1 - u) * (1 - f) + l * u * (1 - f) + m * (1 - u) * f + b * u * f;
}
function Tt(e) {
  const { elevation: t, meta: n, worldW: o, worldH: a } = e, r = n.width;
  let s = -1 / 0, i = 0;
  for (let f = 0; f < t.length; f++)
    t[f] > s && (s = t[f], i = f);
  const c = i % r, u = Math.floor(i / r);
  return {
    x: (c / r - 0.5) * o,
    z: (u / n.height - 0.5) * a,
    elev: s,
    kind: "summit"
  };
}
function kt(e, t) {
  if (!e.orbitPoint) return null;
  const n = H(e.orbitPoint.lon, L), o = O(e.orbitPoint.lat, L), a = (n - t.meta.x0) / F, r = (o - t.meta.y0) / F;
  return a < 0 || a > 1 || r < 0 || r > 1 ? null : {
    x: (a - 0.5) * t.worldW,
    z: (r - 0.5) * t.worldH,
    elev: nt(t, a, r),
    kind: "orbit"
  };
}
function St(e) {
  const t = e.kind === "orbit" ? 16756768 : 16724804, n = e.kind === "orbit" ? 5583616 : 6689041, o = new w.Mesh(
    new w.ConeGeometry(80, 320, 16),
    new w.MeshStandardMaterial({ color: t, emissive: n, roughness: 0.4 })
  );
  return o.position.set(e.x, e.elev + 200, e.z), o;
}
function At(e, t) {
  const { satTexture: n, worldW: o, worldH: a } = e, r = new w.PlaneGeometry(o, a, J, J);
  r.rotateX(-Math.PI / 2);
  const s = r.attributes.position, i = new Float32Array(s.count);
  for (let h = 0; h < s.count; h++) {
    const p = s.getX(h), l = s.getZ(h), m = nt(e, p / o + 0.5, l / a + 0.5);
    i[h] = m, s.setY(h, m);
  }
  s.needsUpdate = !0, r.computeVertexNormals();
  const c = new w.MeshStandardMaterial({
    map: n,
    roughness: 0.95,
    metalness: 0
  }), u = new w.Mesh(r, c), f = St(t);
  return { mesh: u, marker: f, geometry: r, material: c, positions: s, baseElev: i, focus: t };
}
function et(e, t) {
  e.remove(t.mesh), e.remove(t.marker), t.geometry.dispose(), t.material.dispose(), t.marker.geometry.dispose(), t.marker.material.dispose();
}
class It {
  constructor(t) {
    K(this, "items", []);
    this.cmp = t;
  }
  get size() {
    return this.items.length;
  }
  push(t) {
    this.items.push(t);
    let n = this.items.length - 1;
    for (; n > 0; ) {
      const o = n - 1 >> 1;
      if (this.cmp(this.items[n], this.items[o]) >= 0) break;
      [this.items[n], this.items[o]] = [this.items[o], this.items[n]], n = o;
    }
  }
  pop() {
    if (this.items.length === 0) return;
    const t = this.items[0], n = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = n;
      let o = 0;
      const a = this.items.length;
      for (; ; ) {
        const r = 2 * o + 1, s = 2 * o + 2;
        let i = o;
        if (r < a && this.cmp(this.items[r], this.items[i]) < 0 && (i = r), s < a && this.cmp(this.items[s], this.items[i]) < 0 && (i = s), i === o) break;
        [this.items[o], this.items[i]] = [this.items[i], this.items[o]], o = i;
      }
    }
    return t;
  }
}
function Lt(e, t) {
  const n = e.meta.width, o = e.meta.height, a = Math.floor(n / t), r = Math.floor(o / t), s = new Uint8Array(a * r), i = t * t;
  for (let l = 0; l < r; l++)
    for (let m = 0; m < a; m++) {
      let b = 0;
      for (let x = 0; x < t; x++)
        for (let v = 0; v < t; v++) {
          const d = m * t + v, M = l * t + x;
          e.elevation[M * n + d] > 0 && b++;
        }
      s[l * a + m] = b * 2 < i ? 1 : 0;
    }
  const c = new Int32Array(a * r);
  let u = 0, f = 0, h = 0;
  const p = [];
  for (let l = 0; l < s.length; l++) {
    if (!s[l] || c[l] !== 0) continue;
    h++, p.length = 0, p.push(l), c[l] = h;
    let m = 0, b = 0;
    for (; b < p.length; ) {
      const x = p[b++];
      m++;
      const v = x % a, d = x / a | 0;
      for (const [M, T] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = v + M, E = d + T;
        if (k < 0 || k >= a || E < 0 || E >= r) continue;
        const C = E * a + k;
        !s[C] || c[C] !== 0 || (c[C] = h, p.push(C));
      }
    }
    m > f && (f = m, u = h);
  }
  for (let l = 0; l < s.length; l++)
    s[l] = c[l] === u ? 1 : 0;
  return { mask: s, gw: a, gh: r, downscale: t };
}
function Et(e, t, n, o = 60) {
  if (n.mask[t * n.gw + e]) return { x: e, y: t };
  const a = new Uint8Array(n.gw * n.gh), r = [t * n.gw + e];
  a[t * n.gw + e] = 1;
  let s = 0;
  for (; s < r.length; ) {
    const i = r[s++], c = i % n.gw, u = i / n.gw | 0;
    if (!(Math.abs(c - e) + Math.abs(u - t) > o)) {
      if (n.mask[i]) return { x: c, y: u };
      for (const [f, h] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = c + f, l = u + h;
        if (p < 0 || p >= n.gw || l < 0 || l >= n.gh) continue;
        const m = l * n.gw + p;
        a[m] || (a[m] = 1, r.push(m));
      }
    }
  }
  return null;
}
const Rt = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];
function Ft(e, t, n, o, a) {
  const { mask: r, gw: s, gh: i } = e, c = n * s + t, u = a * s + o;
  if (!r[c] || !r[u]) return null;
  const f = new Int32Array(s * i).fill(-1), h = new Float32Array(s * i);
  h.fill(1 / 0), h[c] = 0;
  const p = new It((l, m) => l.f - m.f);
  for (p.push({ x: t, y: n, f: Math.hypot(o - t, a - n) }); p.size > 0; ) {
    const l = p.pop(), m = l.y * s + l.x;
    if (l.x === o && l.y === a) {
      const x = [];
      let v = m;
      for (; v >= 0; )
        x.push([v % s, v / s | 0]), v = f[v];
      return x.reverse();
    }
    const b = h[m];
    if (!(l.f > b + Math.hypot(o - l.x, a - l.y) + 1e-6))
      for (const [x, v, d] of Rt) {
        const M = l.x + x, T = l.y + v;
        if (M < 0 || M >= s || T < 0 || T >= i) continue;
        const k = T * s + M;
        if (!r[k] || x !== 0 && v !== 0 && (!r[l.y * s + M] || !r[T * s + l.x]))
          continue;
        const E = b + d;
        E < h[k] && (h[k] = E, f[k] = m, p.push({ x: M, y: T, f: E + Math.hypot(o - M, a - T) }));
      }
  }
  return null;
}
function Ct(e, t, n, o, a) {
  let r = t, s = n;
  const i = Math.abs(o - t), c = Math.abs(a - n), u = t < o ? 1 : -1, f = n < a ? 1 : -1;
  let h = i - c;
  for (; ; ) {
    if (!e.mask[s * e.gw + r]) return !1;
    if (r === o && s === a) return !0;
    const p = h * 2;
    p > -c && (h -= c, r += u), p < i && (h += i, s += f);
  }
}
function Pt(e, t) {
  if (t.length < 3) return t;
  const n = [t[0]];
  let o = 0;
  for (let a = 2; a < t.length; a++) {
    const [r, s] = t[o], [i, c] = t[a];
    Ct(e, r, s, i, c) || (n.push(t[a - 1]), o = a - 1);
  }
  return n.push(t[t.length - 1]), n;
}
function Nt(e, t, n) {
  const o = H(e.lon, L), a = O(e.lat, L), r = (o - t.meta.x0) / F, s = (a - t.meta.y0) / F, i = Math.max(0, Math.min(n.gw - 1, Math.round(r * (n.gw - 1)))), c = Math.max(0, Math.min(n.gh - 1, Math.round(s * (n.gh - 1))));
  return { x: i, y: c };
}
function _t(e, t) {
  if (!e.route || e.route.waypoints.length < 2) return [];
  const n = 80, o = Lt(t, 8), a = [];
  for (const i of e.route.waypoints) {
    const c = Nt(i, t, o);
    a.push(Et(c.x, c.y, o, 80) ?? c);
  }
  const r = [];
  for (let i = 0; i < a.length - 1; i++) {
    const c = a[i], u = a[i + 1], f = Ft(o, c.x, c.y, u.x, u.y);
    if (!f) {
      console.warn(`[route] no sea path between hint ${i} and ${i + 1}`), i === 0 && r.push([c.x, c.y]), r.push([u.x, u.y]);
      continue;
    }
    i === 0 ? r.push(...f) : r.push(...f.slice(1));
  }
  return Pt(o, r).map(([i, c]) => {
    const u = i / (o.gw - 1), f = c / (o.gh - 1);
    return new w.Vector3(
      (u - 0.5) * t.worldW,
      n,
      (f - 0.5) * t.worldH
    );
  });
}
function $t(e, t, n) {
  if (!e.route || e.route.waypoints.length < 2) return null;
  const o = _t(e, t);
  if (o.length < 2) return null;
  const a = [];
  for (const h of o) a.push(h.x, h.y, h.z);
  const r = new gt();
  r.setPositions(a);
  const s = new wt({
    color: 57599,
    linewidth: 3,
    transparent: !0,
    opacity: 0.95,
    depthTest: !0
  });
  s.resolution.copy(n);
  const i = new dt(r, s);
  i.computeLineDistances();
  const c = new w.Group();
  c.add(i);
  const u = new w.MeshStandardMaterial({
    color: 57599,
    emissive: 16480,
    emissiveIntensity: 1.2,
    roughness: 0.3
  }), f = [];
  for (const h of e.route.waypoints) {
    if (!h.label) continue;
    const p = H(h.lon, L), l = O(h.lat, L), m = (p - t.meta.x0) / F, b = (l - t.meta.y0) / F, x = (m - 0.5) * t.worldW, v = (b - 0.5) * t.worldH, d = new w.SphereGeometry(180, 18, 14), M = new w.Mesh(d, u);
    M.position.set(x, 200, v), c.add(M), f.push(d);
    const T = new w.CylinderGeometry(20, 20, 240, 8), k = new w.Mesh(T, u);
    k.position.set(x, 120, v), c.add(k), f.push(T);
  }
  return {
    group: c,
    dispose: () => {
      r.dispose(), s.dispose(), u.dispose();
      for (const h of f) h.dispose();
    }
  };
}
function Wt(e, t = {}) {
  const { onStatus: n } = t, o = new w.WebGLRenderer({ antialias: !0 });
  o.setPixelRatio(Math.min(window.devicePixelRatio, 2)), o.outputColorSpace = w.SRGBColorSpace;
  const a = Math.max(1, e.clientWidth), r = Math.max(1, e.clientHeight);
  o.setSize(a, r, !1);
  const s = o.domElement;
  s.style.display = "block", s.style.width = "100%", s.style.height = "100%", e.appendChild(s);
  const i = new w.Scene();
  i.background = new w.Color(0);
  const c = new w.PerspectiveCamera(55, a / r, 10, 4e5), u = new pt(c, s);
  u.enableDamping = !0, u.dampingFactor = 0.08, u.maxPolarAngle = Math.PI * 0.498, u.screenSpacePanning = !1;
  const f = new w.DirectionalLight(16774374, 2.6);
  f.position.set(4e4, 14e3, -25e3), i.add(f), i.add(new w.HemisphereLight(12114175, 4930086, 0.55)), i.add(new w.AmbientLight(16777215, 0.15));
  const h = new w.Vector2(a, r), p = /* @__PURE__ */ new Map();
  let l = null, m = null, b = 1, x = !1, v = !1;
  const d = new ResizeObserver(() => {
    if (v) return;
    const g = Math.max(1, e.clientWidth), y = Math.max(1, e.clientHeight);
    c.aspect = g / y, c.updateProjectionMatrix(), o.setSize(g, y, !1), h.set(g, y), m && m.group.children[0].material.resolution.copy(h);
  });
  d.observe(e);
  const M = { left: !1, right: !1, up: !1, down: !1 }, T = (g) => (y) => {
    const S = y.target;
    if (!(S && S.matches("input, textarea, select"))) {
      if (y.key === "ArrowLeft") M.left = g;
      else if (y.key === "ArrowRight") M.right = g;
      else if (y.key === "ArrowUp") M.up = g;
      else if (y.key === "ArrowDown") M.down = g;
      else return;
      y.preventDefault();
    }
  }, k = T(!0), E = T(!1);
  window.addEventListener("keydown", k), window.addEventListener("keyup", E);
  const C = new w.Clock(), ot = new w.Vector3(0, 1, 0), $ = new w.Vector3(), W = new w.Spherical(), it = 1.1, st = 0.9, rt = 0.05;
  let D = 0;
  const j = () => {
    if (v) return;
    D = requestAnimationFrame(j);
    const g = C.getDelta(), y = (M.left ? 1 : 0) - (M.right ? 1 : 0), S = (M.down ? 1 : 0) - (M.up ? 1 : 0);
    (y !== 0 || S !== 0) && ($.subVectors(c.position, u.target), y !== 0 && $.applyAxisAngle(ot, y * it * g), S !== 0 && (W.setFromVector3($), W.phi = Math.max(
      rt,
      Math.min(u.maxPolarAngle, W.phi + S * st * g)
    ), $.setFromSpherical(W)), c.position.copy(u.target).add($)), u.update(), o.render(i, c);
  };
  D = requestAnimationFrame(j);
  async function at(g) {
    const y = p.get(g.id);
    if (y) return y;
    const S = H(g.lon, L), R = O(g.lat, L);
    n == null || n(`Loading elevation tiles for ${g.name}…`);
    const I = await tt(
      S,
      R,
      L,
      F,
      yt,
      (U, q) => n == null ? void 0 : n(`Loading elevation tiles for ${g.name}… ${U}/${q}`)
    ), V = bt(I.canvas);
    n == null || n(`Loading satellite imagery for ${g.name}…`);
    const P = await tt(
      S,
      R,
      L,
      F,
      xt,
      (U, q) => n == null ? void 0 : n(`Loading satellite imagery for ${g.name}… ${U}/${q}`)
    ), N = new w.CanvasTexture(P.canvas);
    N.colorSpace = w.SRGBColorSpace, N.anisotropy = o.capabilities.getMaxAnisotropy(), N.minFilter = w.LinearMipmapLinearFilter, N.magFilter = w.LinearFilter, N.generateMipmaps = !0;
    const Q = vt(g.lat, L), X = {
      elevation: V,
      satTexture: N,
      meta: I.meta,
      worldW: Q * I.meta.width,
      worldH: Q * I.meta.height
    };
    return p.set(g.id, X), X;
  }
  async function ct(g) {
    if (!x && !v) {
      x = !0;
      try {
        const y = await at(g);
        if (v) return;
        l && (et(i, l), l = null), m && (i.remove(m.group), m.dispose(), m = null);
        const S = kt(g, y) ?? Tt(y), R = At(y, S);
        i.add(R.mesh), i.add(R.marker), l = R, m = $t(g, y, h), m && i.add(m.group), b !== 1 && B(b);
        const { worldW: I } = y;
        c.position.setFromSphericalCoords(
          I * 0.55,
          w.MathUtils.degToRad(5),
          0
        ), u.target.set(0, 0, 0), u.minDistance = 800, u.maxDistance = I * 1.6, u.update(), i.fog = new w.Fog(0, I * 0.7, I * 2.4), n == null || n("");
      } catch (y) {
        throw console.error(y), n == null || n(`Error loading ${g.name}: ${y.message}`), y;
      } finally {
        x = !1;
      }
    }
  }
  function B(g) {
    if (b = g, !l) return;
    const { positions: y, baseElev: S, geometry: R, marker: I, focus: V } = l;
    for (let P = 0; P < y.count; P++)
      y.setY(P, S[P] * g);
    y.needsUpdate = !0, R.computeVertexNormals(), I.position.y = V.elev * g + 200;
  }
  function lt() {
    if (!v) {
      v = !0, cancelAnimationFrame(D), d.disconnect(), window.removeEventListener("keydown", k), window.removeEventListener("keyup", E), l && et(i, l), m && (i.remove(m.group), m.dispose());
      for (const g of p.values())
        g.satTexture.dispose();
      p.clear(), u.dispose(), o.dispose(), s.parentNode === e && e.removeChild(s);
    }
  }
  return { switchTo: ct, applyVex: B, dispose: lt };
}
const zt = {
  locations: !0,
  verticalExaggeration: !0,
  info: !0
}, Gt = {
  locations: !1,
  verticalExaggeration: !1,
  info: !1
};
function Ht(e) {
  return e === !1 ? Gt : e === !0 || e === void 0 ? zt : {
    locations: e.locations ?? !0,
    verticalExaggeration: e.verticalExaggeration ?? !0,
    info: e.info ?? !0
  };
}
function Qt({
  className: e,
  locations: t,
  initialLocationId: n,
  controls: o
}) {
  const a = Ht(o), r = Y(null), s = Y(null), [i, c] = z(null), [u, f] = z(1), [h, p] = z(""), [l, m] = z(!1);
  Z(() => {
    const d = r.current;
    if (!d) return;
    const M = Wt(d, { onStatus: p });
    if (s.current = M, t.length > 0) {
      const T = t.find((k) => k.id === n) ?? t[0];
      m(!0), M.switchTo(T).then(() => c(T.id)).catch(() => {
      }).finally(() => m(!1));
    }
    return () => {
      M.dispose(), s.current = null;
    };
  }, []), Z(() => {
    var d;
    (d = s.current) == null || d.applyVex(u);
  }, [u]);
  const b = ft(
    async (d) => {
      if (!(l || d.id === i || !s.current)) {
        m(!0);
        try {
          await s.current.switchTo(d), c(d.id);
        } catch {
        } finally {
          m(!1);
        }
      }
    },
    [l, i]
  ), x = t.find((d) => d.id === i), v = ["terrain-map", e].filter(Boolean).join(" ");
  return /* @__PURE__ */ _("div", { ref: r, className: v, children: [
    h && /* @__PURE__ */ A("div", { className: "terrain-map__status", children: h }),
    a.locations && t.length > 1 && /* @__PURE__ */ A("div", { className: "terrain-map__locations", children: t.map((d) => /* @__PURE__ */ A(
      "button",
      {
        type: "button",
        className: d.id === i ? "is-active" : void 0,
        disabled: l,
        onClick: () => b(d),
        children: d.name
      },
      d.id
    )) }),
    a.info && /* @__PURE__ */ A("div", { className: "terrain-map__hud", children: x ? /* @__PURE__ */ _(mt, { children: [
      /* @__PURE__ */ A("strong", { children: x.name }),
      " · ",
      /* @__PURE__ */ A("span", { children: x.subtitle }),
      x.route && /* @__PURE__ */ _("span", { children: [
        " · ",
        x.route.name
      ] }),
      /* @__PURE__ */ A("br", {}),
      "drag to pan · right-drag to rotate · scroll to zoom",
      /* @__PURE__ */ A("br", {}),
      "← → rotate · ↑ ↓ tilt",
      /* @__PURE__ */ A("br", {}),
      /* @__PURE__ */ A("span", { className: "terrain-map__muted", children: "elevation: AWS Terrain Tiles · imagery: ESRI World Imagery" })
    ] }) : /* @__PURE__ */ A("span", { className: "terrain-map__muted", children: "No location selected." }) }),
    a.verticalExaggeration && /* @__PURE__ */ _("div", { className: "terrain-map__vex", children: [
      /* @__PURE__ */ _("label", { children: [
        "Vertical exaggeration",
        " ",
        /* @__PURE__ */ _("span", { children: [
          u.toFixed(1),
          "×"
        ] })
      ] }),
      /* @__PURE__ */ A(
        "input",
        {
          type: "range",
          min: 1,
          max: 4,
          step: 0.1,
          value: u,
          onChange: (d) => f(parseFloat(d.target.value))
        }
      )
    ] })
  ] });
}
export {
  Qt as TerrainMap
};
//# sourceMappingURL=index.js.map
