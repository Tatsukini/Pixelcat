precision highp float;
uniform sampler2D u_tex;     // current frame
uniform sampler2D u_prev;    // accumulated trail
uniform float u_amount;      // 0..1
varying vec2 v_uv;
void main() {
  vec4 cur = texture2D(u_tex, v_uv);
  vec4 prev = texture2D(u_prev, v_uv);
  gl_FragColor = mix(cur, prev, u_amount * 0.85) + cur * 0.15;
}
