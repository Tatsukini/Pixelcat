precision highp float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  vec3 c = texture2D(u_tex, v_uv).rgb;
  // simple ACES-ish tonemap + gamma
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(c, vec3(1.0 / 2.2));
  gl_FragColor = vec4(c, 1.0);
}
