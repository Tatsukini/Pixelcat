precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_dir;       // (1/w,0) horizontal or (0,1/h) vertical
uniform float u_radius;   // 0..1
varying vec2 v_uv;
void main() {
  vec4 sum = texture2D(u_tex, v_uv) * 0.227027;
  float off[3];
  off[0] = 1.384615; off[1] = 3.230769;
  for (int i = 0; i < 2; i++) {
    sum += texture2D(u_tex, v_uv + u_dir * off[i] * u_radius) * 0.316216;
    sum += texture2D(u_tex, v_uv - u_dir * off[i] * u_radius) * 0.316216;
  }
  gl_FragColor = sum;
}
