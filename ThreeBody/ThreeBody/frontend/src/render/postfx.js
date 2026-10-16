// Post-processing chain: ping-pong framebuffers for Gaussian blur,
// motion-blur trail accumulation, volumetric light/fog, composite.
export class PostFX {
  constructor(gl, w, h) {
    this.gl = gl;
    this.w = w; this.h = h;
    this.fbo = [];
    for (let i = 0; i < 2; i++) this.fbo.push(this._makeTarget(w, h));
    this.trail = this._makeTarget(w, h);
  }
  _makeTarget(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }
  resize(w, h) {
    for (const t of [...this.fbo, this.trail]) {
      this.gl.deleteTexture(t.tex);
      this.gl.deleteFramebuffer(t.fbo);
    }
    this.w = w; this.h = h;
    this.fbo = [this._makeTarget(w, h), this._makeTarget(w, h)];
    this.trail = this._makeTarget(w, h);
  }
  dispose() {
    for (const t of [...this.fbo, this.trail]) {
      this.gl.deleteTexture(t.tex);
      this.gl.deleteFramebuffer(t.fbo);
    }
  }
}
