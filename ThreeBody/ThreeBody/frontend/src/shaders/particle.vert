attribute vec3 a_pos;
attribute float a_seed;
uniform mat4 u_viewProj;
uniform float u_time;
varying float v_seed;
void main() {
  vec3 p = a_pos;
  // gentle orbital jitter
  p.x += sin(u_time * 0.7 + a_seed * 12.0) * 0.02;
  p.y += cos(u_time * 0.5 + a_seed * 9.0) * 0.02;
  vec4 clip = u_viewProj * vec4(p, 1.0);
  gl_Position = clip;
  gl_PointSize = clamp((2.0 + a_seed * 3.0) * (15.0 / clip.w), 1.0, 12.0);
  v_seed = a_seed;
}
