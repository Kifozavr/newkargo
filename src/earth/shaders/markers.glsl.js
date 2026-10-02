export const markersVertex = /* glsl */ `
attribute float aSize;
attribute float aIntensity;
attribute float aIndex;
attribute float aPhase;

uniform float uScale;      // device px per world unit at distance 1
uniform float uSize;       // core diameter, world units
uniform float uMinPx;
uniform float uMaxPx;
uniform float uGlowScale;  // sprite size / core size
uniform float uHover;
uniform float uTime;
uniform float uTwinkle;
uniform float uGain;
uniform float uDpr;        // min/max sizes are CSS px

varying float vAlpha;
varying float vCorePx;
varying float vHover;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 nrm = normalize(wp.xyz);
  vec3 V = normalize(cameraPosition - wp.xyz);
  float facing = dot(nrm, V);

  vec4 mv = viewMatrix * wp;
  float dist = max(-mv.z, 1e-3);
  float hover = 1.0 - step(0.5, abs(aIndex - uHover));
  float corePx = clamp(uSize * aSize * uScale / dist, uMinPx * uDpr, uMaxPx * uDpr);
  corePx *= 1.0 + hover * 1.6;
  vCorePx = corePx;
  vHover = hover;
  gl_PointSize = corePx * uGlowScale;

  float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0));
  vAlpha = uGain * aIntensity * tw * smoothstep(-0.01, 0.10, facing);
  vAlpha = max(vAlpha, hover * step(0.0, facing));
  gl_Position = projectionMatrix * mv;
}
`;

export const markersFragment = /* glsl */ `
precision highp float;
uniform vec3  uCoreColor;
uniform vec3  uGlowColor;
uniform vec3  uHoverColor;
uniform float uGlowScale;
uniform float uGlowAmount;
uniform float uGlowFalloff;
uniform float uCoreBoost;

varying float vAlpha;
varying float vCorePx;
varying float vHover;

void main() {
  if (vAlpha <= 0.001) discard;
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  // distances in "core radius" units (1.0 = tip of the diamond)
  float dDiamond = (abs(c.x) + abs(c.y)) * uGlowScale;
  float dRound = length(c) * uGlowScale;
  float aaw = 1.4 / max(vCorePx, 1.0);
  float core = 1.0 - smoothstep(1.0 - aaw, 1.0 + aaw, dDiamond);
  float glow = exp(-max(dRound - 0.4, 0.0) * uGlowFalloff) * (1.0 - smoothstep(uGlowScale * 0.7, uGlowScale, dRound));
  vec3 coreCol = mix(uCoreColor, uHoverColor, vHover);
  vec3 col = coreCol * core * uCoreBoost + uGlowColor * glow * uGlowAmount;
  gl_FragColor = vec4(col * vAlpha, 1.0);
}
`;
