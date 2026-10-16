precision highp float;
// Ray-marched volumetric light (god rays) + exponential height fog.
uniform sampler2D u_scene;
uniform vec2 u_lightScreen;   // screen-space position of the primary light
uniform float u_lightStrength;
uniform float u_fogDensity;
varying vec2 v_uv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }

void main() {
  vec3 scene = texture2D(u_scene, v_uv).rgb;

  // --- volumetric light: radial decay from light screen position ---
  vec2 d = v_uv - u_lightScreen;
  float dist = length(d);
  float rays = pow(max(0.0, 1.0 - dist * 1.6), 2.0);
  rays *= 0.6 + 0.4 * sin(atan(d.y, d.x) * 18.0) * 0.5 + 0.5;
  vec3 lightCol = vec3(1.0, 0.9, 0.75);
  scene += lightCol * rays * u_lightStrength * 0.35;

  // --- volumetric fog: exponential density, viewport-gradient ---
  float fog = 1.0 - exp(-u_fogDensity * 4.0 * v_uv.y);
  vec3 fogCol = mix(vec3(0.04, 0.05, 0.09), vec3(0.10, 0.13, 0.20), v_uv.y);
  scene = mix(scene, fogCol, fog * 0.7);

  gl_FragColor = vec4(scene, 1.0);
}
