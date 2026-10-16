import { Renderer } from "./render/renderer.js";
import { WsClient } from "./net/ws_client.js";
import { ControlPanel } from "./ui/control_panel.js";
import { Overlay, CoordsHud } from "./ui/overlay.js";

const canvas = document.getElementById("gl");
const status = document.getElementById("status");

const panel = new ControlPanel(canvas);
const renderer = new Renderer(canvas);
const overlay = new Overlay(document.getElementById("overlay"));
const coords = new CoordsHud(document.getElementById("coords"));

let lastFrame = null;

renderer.init().then(() => {
  const ws = new WsClient(
    (frame) => {
      lastFrame = frame;
      renderer.setFrame(frame);
      if (frame.config) panel.applyBoundaryFit(frame.config.boundary_radius);
    },
    (s) => { status.textContent = s; },
  );
  const loop = () => {
    renderer.draw(panel.params);
    const view = overlay.draw(panel.params, renderer.viewProj);
    coords.update(lastFrame, panel.params, view);
    requestAnimationFrame(loop);
  };
  loop();
}).catch((e) => {
  status.textContent = "renderer error: " + e.message;
  console.error(e);
});
