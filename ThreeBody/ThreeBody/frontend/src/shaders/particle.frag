precision highp float;
varying float v_seed;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.0, r) * 0.35;
  vec3 col = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.7, 0.5), v_seed);
  gl_FragColor = vec4(col, a);
}
