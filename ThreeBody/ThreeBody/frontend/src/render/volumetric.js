// Thin wrapper: volumetric light + fog pass is implemented in volumetric.frag;
// this module just exposes the uniform layout used by the renderer.
export const VolumetricUniforms = {
  scene: "u_scene",
  lightScreen: "u_lightScreen",
  lightStrength: "u_lightStrength",
  fogDensity: "u_fogDensity",
};
