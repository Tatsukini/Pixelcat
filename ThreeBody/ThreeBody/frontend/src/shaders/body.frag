precision highp float;
varying vec3 v_color;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(v_color * glow, glow);
}
