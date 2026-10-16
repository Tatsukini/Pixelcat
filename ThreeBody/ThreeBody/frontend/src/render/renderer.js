// WebGL2 renderer: scene pass -> gaussian blur -> motion blur -> volumetric -> composite.
import { ParticleSystem } from "./particle_system.js";
import { PostFX } from "./postfx.js";

const VS = async (p) => (await fetch(`/src/shaders/${p}`)).text();

// Shared with the HUD overlay so its legend swatches match the rendered bodies.
export const BODY_COLORS = [[1, 0.42, 0.42], [0.31, 0.8, 0.76], [1, 0.9, 0.43]];

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s));
  }
  return s;
}
function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }
  return p;
}

// Minimal perspective * lookAt.
function mat4Perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}
function mat4LookAt(eye, center, up) {
  const z = norm([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0]/l, a[1]/l, a[2]/l];
}
function mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    o[i*4+j] = a[j]*b[i*4] + a[4+j]*b[i*4+1] + a[8+j]*b[i*4+2] + a[12+j]*b[i*4+3];
  }
  return o;
}

export class Renderer {
  constructor(canvas) {
    this.gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!this.gl) throw new Error("WebGL unavailable");
    this.canvas = canvas;
    this.frame = null;
    this.start = performance.now();
  }
  async init() {
    const gl = this.gl;
    const [bodyVs, bodyFs, partVs, partFs, postVs, blurFs, motionFs, volFs, compFs] =
      await Promise.all([
        VS("body.vert"), VS("body.frag"), VS("particle.vert"), VS("particle.frag"),
        VS("post.vert"), VS("blur.frag"), VS("motion_blur.frag"),
        VS("volumetric.frag"), VS("composite.frag"),
      ]);
    this.progBody = link(gl, bodyVs, bodyFs);
    this.progPart = link(gl, partVs, partFs);
    this.progBlur = link(gl, postVs, blurFs);
    this.progMotion = link(gl, postVs, motionFs);
    this.progVol = link(gl, postVs, volFs);
    this.progComp = link(gl, postVs, compFs);

    // fullscreen quad
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    this.bodies = gl.createBuffer();
    this.particles = new ParticleSystem(gl);
    this.post = new PostFX(gl, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w; this.canvas.height = h;
      this.post.resize(w, h);
    }
  }

  setFrame(f) { this.frame = f; }

  draw(params) {
    const gl = this.gl;
    this.resize();
    const W = this.canvas.width, H = this.canvas.height;
    const t = (performance.now() - this.start) / 1000;

    // orbit camera around the world origin
    const dist = params.cameraDistance;
    const az = params.cameraAzimuth * Math.PI / 180;
    const el = params.cameraElevation * Math.PI / 180;
    const eye = [
      dist * Math.cos(el) * Math.cos(az),
      dist * Math.sin(el),
      dist * Math.cos(el) * Math.sin(az),
    ];
    const proj = mat4Perspective(Math.PI / 4, W / H, Math.max(0.05, dist * 0.02), dist + 200);
    const view = mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
    const vp = mul(proj, view);

    // published for the HUD overlay (grid/axes project with the same matrix)
    this.viewProj = vp;
    this.cssW = this.canvas.clientWidth;
    this.cssH = this.canvas.clientHeight;

    // ---- 1. scene pass into post.fbo[0] ----
    gl.enable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post.fbo[0].fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.02, 0.03, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // bodies
    if (this.frame) {
      const n = this.frame.positions.length;
      const data = new Float32Array(n * 7); // x,y,z,size,r,g,b
      const colors = BODY_COLORS;
      for (let i = 0; i < n; i++) {
        const p = this.frame.positions[i];
        data[i*7] = p[0]; data[i*7+1] = p[1]; data[i*7+2] = p[2];
        data[i*7+3] = 18;
        const c = colors[i % colors.length];
        data[i*7+4] = c[0]; data[i*7+5] = c[1]; data[i*7+6] = c[2];
      }
      gl.useProgram(this.progBody);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.progBody, "u_viewProj"), false, vp);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bodies);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const loc = gl.getAttribLocation(this.progBody, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 28, 0);
      const sz = gl.getAttribLocation(this.progBody, "a_size");
      gl.enableVertexAttribArray(sz);
      gl.vertexAttribPointer(sz, 1, gl.FLOAT, false, 28, 12);
      const cl = gl.getAttribLocation(this.progBody, "a_color");
      gl.enableVertexAttribArray(cl);
      gl.vertexAttribPointer(cl, 3, gl.FLOAT, false, 28, 16);
      gl.drawArrays(gl.POINTS, 0, n);
    }
    // particles
    this.particles.setCount(params.particleCount);
    this.particles.draw(this.progPart, vp, t);

    // post passes write full-screen quads and must replace, not accumulate
    gl.disable(gl.BLEND);

    // ---- 2. gaussian blur (horizontal -> vertical) ----
    this._applyPost(this.progBlur, this.post.fbo[0].tex, this.post.fbo[1].fbo, (p) => {
      gl.uniform2f(gl.getUniformLocation(p, "u_dir"), 1.5 / W, 0);
      gl.uniform1f(gl.getUniformLocation(p, "u_radius"), params.gaussianBlur);
    });
    this._applyPost(this.progBlur, this.post.fbo[1].tex, this.post.fbo[0].fbo, (p) => {
      gl.uniform2f(gl.getUniformLocation(p, "u_dir"), 0, 1.5 / H);
      gl.uniform1f(gl.getUniformLocation(p, "u_radius"), params.gaussianBlur);
    });

    // ---- 3. motion blur (scene + previous trail) ----
    this._applyPost(this.progMotion, this.post.fbo[0].tex, this.post.fbo[1].fbo, (p) => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.post.trail.tex);
      gl.uniform1i(gl.getUniformLocation(p, "u_prev"), 1);
      gl.uniform1f(gl.getUniformLocation(p, "u_amount"), params.motionBlur);
    });
    // copy result into trail for next frame
    this._applyPost(this.progComp, this.post.fbo[1].tex, this.post.trail.fbo, () => {});

    // ---- 4. volumetric light + fog ----
    this._applyPost(this.progVol, this.post.fbo[1].tex, this.post.fbo[0].fbo, (p) => {
      gl.uniform2f(gl.getUniformLocation(p, "u_lightScreen"), 0.5, 0.75);
      gl.uniform1f(gl.getUniformLocation(p, "u_lightStrength"), params.volumetricLight);
      gl.uniform1f(gl.getUniformLocation(p, "u_fogDensity"), params.volumetricFog);
    });

    // ---- 5. composite to screen ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.progComp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.post.fbo[0].tex);
    gl.uniform1i(gl.getUniformLocation(this.progComp, "u_tex"), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(this.progComp, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _applyPost(program, srcTex, dstFbo, extra) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(gl.getUniformLocation(program, "u_tex"), 0);
    if (extra) extra(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    this.particles.dispose();
    this.post.dispose();
  }
}
