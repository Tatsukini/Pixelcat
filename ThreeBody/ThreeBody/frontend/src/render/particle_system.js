// GPU particle system: a static cloud of points distributed around bodies.
export class ParticleSystem {
  constructor(gl) {
    this.gl = gl;
    this.count = 4000;
    this.buffer = gl.createBuffer();
    this.seedBuffer = gl.createBuffer();
    this._rebuild(4000);
  }
  _rebuild(n) {
    const gl = this.gl;
    this.count = n;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // random point in a shell around origin (bodies orbit here)
      const r = 3 + Math.random() * 6;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
      seed[i] = Math.random();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
  }
  setCount(n) {
    if (Math.abs(n - this.count) > 500) this._rebuild(n);
  }
  draw(program, viewProj, time) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_viewProj"), false, viewProj);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    const sl = gl.getAttribLocation(program, "a_seed");
    gl.enableVertexAttribArray(sl);
    gl.vertexAttribPointer(sl, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }
  dispose() {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteBuffer(this.seedBuffer);
  }
}
