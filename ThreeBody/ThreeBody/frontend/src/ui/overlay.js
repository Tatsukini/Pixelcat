// HUD overlay: crisp grid, X/Y/Z axes and a star-coordinate readout drawn above the
// WebGL canvas. The scene goes through a heavy blur/fog chain, so lines drawn inside
// it would smear — these are projected and drawn in 2D instead.
import { BODY_COLORS } from "../render/renderer.js";

// CSS reference pixel: 1 cm = 96/2.54 CSS px.
const CSS_PX_PER_CM = 96 / 2.54;
// Clip-space w below which a point is at or behind the eye.
const NEAR_W = 0.05;

const GRID_LINE = "rgba(150,180,230,0.30)";
const GRID_LINE_CENTER = "rgba(150,180,230,0.48)";
const TICK_TEXT = "rgba(214,226,244,0.95)";
const AXIS_COLOR = {
  x: "rgba(255,107,107,0.95)",
  y: "rgba(120,225,180,0.95)",
  z: "rgba(110,168,255,0.95)",
};

function project(vp, p) {
  return {
    x: vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12],
    y: vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13],
    w: vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15],
  };
}

function toPixel(c, w, h) {
  return [(c.x / c.w * 0.5 + 0.5) * w, (1 - (c.y / c.w * 0.5 + 0.5)) * h];
}

// Clip a clip-space segment against w = NEAR_W so nothing behind the eye is drawn.
function clipSegment(a, b) {
  const aok = a.w >= NEAR_W, bok = b.w >= NEAR_W;
  if (!aok && !bok) return null;
  if (aok && bok) return [a, b];
  const t = (NEAR_W - a.w) / (b.w - a.w);
  const cut = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: NEAR_W };
  return aok ? [a, cut] : [cut, b];
}

// Round a spacing up to a 1/2/5 x 10^n value so tick numbers stay readable.
function niceStep(x) {
  if (!(x > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / pow;
  const m = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return m * pow;
}

function noNegZero(s) {
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

// A length in world units expressed in the selected display unit.
export function formatUnit(value, unit, pxPerWorld) {
  if (unit === "pixels") return noNegZero((value * pxPerWorld).toFixed(0));
  if (unit === "cm") return noNegZero((value * pxPerWorld / CSS_PX_PER_CM).toFixed(1));
  return String(Math.round(value * 100) / 100);
}

export function unitSuffix(unit) {
  return unit === "pixels" ? "px" : unit === "cm" ? "cm" : "";
}

export class Overlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1; this.w = 0; this.h = 0;
    this.view = null;
  }

  _fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const bw = Math.max(1, Math.floor(w * dpr)), bh = Math.max(1, Math.floor(h * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw; this.canvas.height = bh;
    }
    this.dpr = dpr; this.w = w; this.h = h;
  }

  // Draws the overlay and returns the view metrics shared with the coordinate HUD.
  draw(params, vp) {
    this._fit();
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.view = null;
    if (!vp || this.w === 0 || this.h === 0) return null;

    const w = this.w, h = this.h;
    // Screen pixels per world unit, measured on the Y axis at the origin plane.
    const o = project(vp, [0, 0, 0]);
    const u = project(vp, [0, 1, 0]);
    if (o.w < NEAR_W || u.w < NEAR_W) return null;
    const [ox, oy] = toPixel(o, w, h);
    const [ux, uy] = toPixel(u, w, h);
    const pxPerWorld = Math.hypot(ux - ox, uy - oy);
    if (!isFinite(pxPerWorld) || pxPerWorld <= 0) return null;
    this.view = { vp, w, h, pxPerWorld };

    const toScreen = (p) => {
      const c = project(vp, p);
      return c.w < NEAR_W ? null : toPixel(c, w, h);
    };
    const seg = (a, b) => {
      const c = clipSegment(project(vp, a), project(vp, b));
      if (!c) return;
      const p0 = toPixel(c[0], w, h), p1 = toPixel(c[1], w, h);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    };

    // Grid spans the play area; fine lines every step, numbers on every other line.
    const radius = params.boundaryRadius > 0 ? params.boundaryRadius : 10;
    const extent = radius * 1.25;
    const step = niceStep(extent / 5);

    ctx.lineWidth = 1;
    ctx.font = "10px ui-monospace, Consolas, monospace";
    if (params.showGrid) this._grid(ctx, seg, toScreen, extent, step, pxPerWorld, params.gridUnit);
    if (params.showAxes) this._axes(ctx, seg, toScreen, extent, pxPerWorld, params.gridUnit);
    return this.view;
  }

  _text(ctx, x, y, s, align, baseline) {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5,6,10,0.85)";
    ctx.strokeText(s, x, y);
    ctx.fillStyle = TICK_TEXT;
    ctx.fillText(s, x, y);
    ctx.lineWidth = 1;
  }

  _grid(ctx, seg, toScreen, extent, step, k, unit) {
    const n = Math.floor(extent / step + 1e-6);
    for (let i = -n; i <= n; i++) {
      const c = i * step;
      ctx.strokeStyle = i === 0 ? GRID_LINE_CENTER : GRID_LINE;
      seg([c, 0, -extent], [c, 0, extent]);
      seg([-extent, 0, c], [extent, 0, c]);
    }
    // Tick numbers on the two floor axes; the outermost ones are dropped so they
    // do not collide with the axis letters drawn at the same tip.
    const labelMax = extent - step * 0.5;
    for (let i = -n; i <= n; i++) {
      if (i === 0 || i % 2 !== 0) continue;
      const c = i * step;
      if (Math.abs(c) > labelMax) continue;
      const onX = toScreen([c, 0, 0]);
      if (onX) this._text(ctx, onX[0], onX[1] + 5, formatUnit(c, unit, k), "center", "top");
      const onZ = toScreen([0, 0, c]);
      if (onZ) this._text(ctx, onZ[0] + 6, onZ[1] - 5, formatUnit(c, unit, k), "left", "bottom");
    }
  }

  _axes(ctx, seg, toScreen, extent, k, unit) {
    const suffix = unitSuffix(unit) ? " " + unitSuffix(unit) : "";
    // axis line, end point, letter, colour
    const axes = [
      [[-extent, 0, 0], [extent, 0, 0], "x", "X"],
      [[0, -extent, 0], [0, extent, 0], "y", "Y"],
      [[0, 0, -extent], [0, 0, extent], "z", "Z"],
    ];
    ctx.lineWidth = 1.5;
    for (const [a, b, key, letter] of axes) {
      ctx.strokeStyle = AXIS_COLOR[key];
      seg(a, b);
      const tip = toScreen(b);
      if (tip) this._text(ctx, tip[0] + 7, tip[1] - 7, letter + suffix, "left", "middle");
    }
    ctx.lineWidth = 1;

    const o = toScreen([0, 0, 0]);
    if (!o) return;
    ctx.beginPath();
    ctx.arc(o[0], o[1], 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232,236,241,0.9)";
    ctx.fill();
  }
}

// Top-left readout of each body's coordinates in the selected unit.
export class CoordsHud {
  constructor(el) {
    this.el = el;
    this.rows = [];
    this._count = -1;
    this._names = null;
    this._unit = null;
    this.header = null;
  }

  update(frame, params, view) {
    if (!frame || !frame.positions || !view || !params.showCoords) {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;

    const names = ((frame.config && frame.config.bodies) || []).map((b) => b.name).join(",");
    if (frame.positions.length !== this._count || names !== this._names) {
      this._build(frame, names);
    }
    if (params.coordsUnit !== this._unit) {
      this._unit = params.coordsUnit;
      this.header.textContent =
        "STAR COORDS · " + (unitSuffix(this._unit) || "abs");
    }

    const k = view.pxPerWorld;
    for (let i = 0; i < this.rows.length; i++) {
      const p = frame.positions[i];
      const vals = this.rows[i];
      for (let a = 0; a < 3; a++) vals[a].textContent = formatUnit(p[a], this._unit, k);
    }
  }

  _build(frame, names) {
    this._count = frame.positions.length;
    this._names = names;
    this.el.textContent = "";
    this.header = document.createElement("div");
    this.header.className = "hud-title";
    this.el.appendChild(this.header);

    const bodies = (frame.config && frame.config.bodies) || [];
    this.rows = frame.positions.map((_, i) => {
      const row = document.createElement("div");
      row.className = "row";

      const dot = document.createElement("span");
      dot.className = "swatch";
      const c = BODY_COLORS[i % BODY_COLORS.length];
      dot.style.background =
        `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = (bodies[i] && bodies[i].name) || "#" + (i + 1);

      row.append(dot, name);
      const vals = [];
      for (let a = 0; a < 3; a++) {
        const v = document.createElement("span");
        v.className = "val";
        row.appendChild(v);
        vals.push(v);
      }
      this.el.appendChild(row);
      return vals;
    });
    this._unit = null;
  }
}
