// UI control panel binding.
export class ControlPanel {
  constructor(canvas) {
    this.canvas = canvas;
    this.params = {
      preset: "figure_eight",
      gaussianBlur: 0.6,
      motionBlur: 0.35,
      volumetricLight: 0.55,
      volumetricFog: 0.4,
      particleCount: 4000,
      showGrid: true,
      gridUnit: "absolute",
      showAxes: true,
      showCoords: true,
      coordsUnit: "absolute",
      boundaryRadius: 0,
      cameraAzimuth: 90,
      cameraElevation: -53,
      cameraDistance: 10,
      running: true,
    };
    this._fittedRadius = null;
    this._bind();
  }

  _bind() {
    const $ = (id) => document.getElementById(id);
    this.ui = {
      az: $("cam-az"),
      tilt: $("cam-el"),
      zoom: $("cam-dist"),
      toggle: $("toggle"),
      collapse: $("collapse"),
      panel: $("panel"),
    };

    $("preset").onchange = (e) => {
      this.params.preset = e.target.value;
      fetch("/api/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: this.params.preset }),
      });
    };
    $("gauss").oninput = (e) => this.params.gaussianBlur = +e.target.value;
    $("motion").oninput = (e) => this.params.motionBlur = +e.target.value;
    $("volight").oninput = (e) => this.params.volumetricLight = +e.target.value;
    $("vofog").oninput = (e) => this.params.volumetricFog = +e.target.value;
    $("pcount").oninput = (e) => this.params.particleCount = +e.target.value;

    $("grid-on").onchange = (e) => this.params.showGrid = e.target.checked;
    $("grid-unit").onchange = (e) => this.params.gridUnit = e.target.value;
    $("axes-on").onchange = (e) => this.params.showAxes = e.target.checked;
    $("coords-on").onchange = (e) => this.params.showCoords = e.target.checked;
    $("coords-unit").onchange = (e) => this.params.coordsUnit = e.target.value;

    this.ui.az.oninput = (e) => this.params.cameraAzimuth = +e.target.value;
    this.ui.tilt.oninput = (e) => this.params.cameraElevation = +e.target.value;
    this.ui.zoom.oninput = (e) => this.params.cameraDistance = +e.target.value;

    this.ui.toggle.onclick = () => {
      this.params.running = !this.params.running;
      fetch(this.params.running ? "/api/start" : "/api/stop", { method: "POST" });
      this.ui.toggle.textContent = this.params.running ? "Pause" : "Resume";
    };

    this.ui.collapse.onclick = () => {
      const collapsed = this.ui.panel.classList.toggle("collapsed");
      this.ui.collapse.textContent = collapsed ? "+" : "–";
      this.ui.collapse.title = collapsed ? "Expand panel" : "Collapse panel";
    };

    this._bindCameraDrag();
  }

  // Left-drag orbits, wheel zooms, both mirrored onto the sliders.
  _bindCameraDrag() {
    const c = this.canvas;
    let dragging = false, lx = 0, ly = 0;

    c.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      lx = e.clientX; ly = e.clientY;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      this._setOrbit(
        this.params.cameraAzimuth - (e.clientX - lx) * 0.4,
        this.params.cameraElevation + (e.clientY - ly) * 0.4,
      );
      lx = e.clientX; ly = e.clientY;
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this._setDistance(this.params.cameraDistance * (e.deltaY > 0 ? 1.1 : 1 / 1.1));
    }, { passive: false });
  }

  _setOrbit(az, el) {
    az = (((az + 180) % 360) + 360) % 360 - 180;
    el = Math.max(-89, Math.min(89, el));
    this.params.cameraAzimuth = az;
    this.params.cameraElevation = el;
    this.ui.az.value = az;
    this.ui.tilt.value = el;
  }

  _setDistance(d) {
    d = Math.max(1, Math.min(80, d));
    this.params.cameraDistance = d;
    this.ui.zoom.value = d;
  }

  // Frame the whole boundary sphere when the preset (and thus its radius) changes.
  applyBoundaryFit(radius) {
    if (!(radius > 0)) return;
    this.params.boundaryRadius = radius;
    if (radius === this._fittedRadius) return;
    this._fittedRadius = radius;
    this._setDistance(radius * 2.9);
  }
}
