// Billboarded body sprite vertex shader.
attribute vec3 a_pos;
attribute float a_size;
attribute vec3 a_color;
uniform mat4 u_viewProj;
varying vec3 v_color;
void main() {
  vec4 clip = u_viewProj * vec4(a_pos, 1.0);
  gl_Position = clip;
  gl_PointSize = clamp(a_size * (60.0 / clip.w), 4.0, 180.0);
  v_color = a_color;
}
