import { noiseGLSL, cloudFieldGLSL } from './noise.glsl.js';

export const earthVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const earthFragment = /* glsl */ `
precision highp float;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform mat3 uModelRot;      // earth object -> world rotation
uniform mat3 uCloudRot;      // earth object -> cloud space
uniform vec3 uLightDir;      // world, unit, towards the light

// terrain
uniform float uTerrainFreq;
uniform float uTerrainGain;
uniform float uWarpFreq;
uniform float uWarpAmt;
uniform float uLevels;
uniform float uRidgeWidth;
uniform float uRidgeSlope;
uniform float uRelief;      // 1 = full relief contrast, lower = flatter (far globe)
uniform float uDim;         // overall brightness multiplier (far globe)
uniform float uRidgeSharp;
uniform float uEven;
uniform float uAAWidth;
uniform float uAAFade;
uniform float uMinSpacing;
uniform float uAAMin;
uniform float uSSBelow;    // supersample where visible line spacing is below this many px
uniform float uSSSpread;   // sub-pixel sample spread (1 = one pixel box)

// shading
uniform vec3  uAlbedo;
uniform float uLightIntensity;
uniform float uViewPow;
uniform float uViewBumpMix;
uniform float uTermSoft;
uniform float uAmbient;
uniform vec3  uHazeColor;
uniform float uHazeAmount;
uniform float uHazePow;
uniform float uKnee;

// clouds
uniform float uCloudShadow;
uniform float uCloudHeight;

${noiseGLSL}
${cloudFieldGLSL}

// Height field on the unit sphere with analytic gradient (object space).
float terrain(vec3 p, out vec3 grad, out vec3 grad0) {
  vec3 q = p * uWarpFreq;
  vec3 g1, g2, g3;
  float w1 = snoise(q + vec3(17.1, 3.2, 9.7), g1);
  float w2 = snoise(q + vec3(-5.3, 21.4, -13.6), g2);
  float w3 = snoise(q + vec3(8.9, -11.7, 31.3), g3);
  vec3 pw = p + vec3(w1, w2, w3) * uWarpAmt;
  // transpose of the warp jacobian
  mat3 Jt = mat3(1.0) + (uWarpAmt * uWarpFreq) * mat3(g1, g2, g3);

  float h = 0.0;
  vec3 gsum = vec3(0.0);
  float f = uTerrainFreq;
  float a = 1.0;
  vec3 g;
  for (int i = 0; i < 3; i++) {
    float n = snoise(pw * f + float(i) * 7.31, g);
    h += a * n;
    gsum += a * f * g;
    if (i == 0) grad0 = Jt * (f * g);
    f *= 2.0;
    a *= uTerrainGain;
  }
  grad = Jt * gsum;
  return h;
}

// Ridge profile (1-x^2)^2 around each integer contour of t; returns signed d(bump)/d(level).
float ridgeSlope(float t, float fw) {
  float r = t - floor(t + 0.5);              // signed distance to nearest contour, level units
  float w = max(uRidgeWidth, fw * uAAWidth);  // analytic prefilter: never thinner than ~a pixel
  float x = clamp(abs(r) / w, 0.0, 1.0);
  float k = 1.0 - x * x;
  float dprof = -4.0 * x * k;
  float aa = pow(clamp(uRidgeWidth / w, 0.0, 1.0), uAAFade);
  aa *= smoothstep(uAAMin, uAAMin * 2.2, 1.0 / fw); // fade lines out below ~2px spacing
  return aa * sign(r) * dprof;
}

void main() {
  vec3 p = normalize(vObj);
  vec3 n0 = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);

  // ---- contour ridges -------------------------------------------------
  vec3 grad, grad0;
  float h = terrain(p, grad, grad0);
  grad -= p * dot(grad, p);                 // tangent component
  grad0 -= p * dot(grad0, p);
  float glen = length(grad);
  vec3 gdir = grad / max(glen, 1e-5);

  // partially normalise by the large-scale slope -> evenly spaced contour lines
  float sN = clamp(pow(length(grad0) / (uTerrainFreq * 1.6), uEven), 0.45, 2.2);
  float t = h * uLevels / sN;
  // screen-space rate of change of the contour coordinate, measured across the lines (Euclidean,
  // so it does not depend on how the lines are oriented on screen)
  float tdx = dFdx(t);
  float tdy = dFdy(t);
  float fw = max(length(vec2(tdx, tdy)), 1e-5);
  // contour LOD: when lines get denser than uMinSpacing px, keep every 2nd, 4th... line
  // (like an infinite grid), cross-fading between levels so zooming stays smooth.
  float lod = max(0.0, log2(uMinSpacing * fw));
  float lk = floor(lod);
  float lf = smoothstep(0.0, 1.0, fract(lod));
  float m1 = exp2(lk);
  float gfade = smoothstep(0.0, 0.15 * uTerrainFreq, glen);
  float slopeK = uRidgeSlope * uRelief * gfade;

  float ndl0 = dot(n0, L);
  float ndv0 = clamp(dot(n0, V), 0.0, 1.0);

  // ---- supersampled ridge shading ---------------------------------------
  // The relief is a normal map with very steep, thin ridges: sampling it once per pixel makes the
  // lines break into crawling dashes (moire) as the camera moves. Where lines are dense we shade
  // 4 sub-pixel positions (rotated grid) and average; the noise itself is evaluated only once.
  const vec2 SS0 = vec2(-0.125, -0.375);
  const vec2 SS1 = vec2(0.375, -0.125);
  const vec2 SS2 = vec2(0.125, 0.375);
  const vec2 SS3 = vec2(-0.375, 0.125);
  int ns = (m1 / fw < uSSBelow) ? 4 : 1;
  float litAcc = 0.0;
  float ambAcc = 0.0;
  for (int k = 0; k < 4; k++) {
    if (k >= ns) break;
    vec2 o = ns == 1 ? vec2(0.0) : (k == 0 ? SS0 : k == 1 ? SS1 : k == 2 ? SS2 : SS3) * uSSSpread;
    float ts = t + tdx * o.x + tdy * o.y;
    float ridge = mix(ridgeSlope(ts / m1, fw / m1), ridgeSlope(ts / (m1 * 2.0), fw / (m1 * 2.0)), lf);
    float slope = slopeK * ridge;
    slope = sign(slope) * pow(abs(slope), uRidgeSharp);
    vec3 n = normalize(uModelRot * normalize(p - slope * gdir));
    float ndl = dot(n, L);
    float diff = smoothstep(-uTermSoft, uTermSoft, ndl) * max(ndl + uTermSoft, 0.0) / (1.0 + uTermSoft);
    float ndv = clamp(dot(n, V), 0.0, 1.0);
    float viewTerm = pow(1.0 - mix(ndv0, ndv, uViewBumpMix), uViewPow);
    litAcc += diff * viewTerm;
    ambAcc += 0.35 + 0.65 * pow(1.0 - ndv, 2.0);
  }
  litAcc /= float(ns);
  ambAcc /= float(ns);

  // cloud shadows
  float shadow = 1.0;
  if (uCloudShadow > 0.0) {
    vec3 Lobj = transpose(uModelRot) * L;
    vec3 Lt = Lobj - p * dot(Lobj, p);
    vec3 ps = normalize(p + Lt * uCloudHeight / max(dot(Lobj, p), 0.08));
    float c = cloudCoverage(cloudField(uCloudRot * ps, 3));
    shadow = 1.0 - uCloudShadow * c;
  }

  vec3 col = uAlbedo * uLightIntensity * litAcc * shadow;
  // faint ambient so the relief reads on the night side
  col += uAlbedo * uAmbient * ambAcc;
  // atmospheric in-scatter near the limb
  float haze = pow(1.0 - ndv0, uHazePow) * smoothstep(-0.25, 0.35, ndl0);
  col += uHazeColor * uHazeAmount * haze;

  // soft shoulder: keeps the near-limb band from clipping flat white
  vec3 knee = vec3(uKnee);
  col = mix(col, knee + (1.0 - knee) * (1.0 - exp(-(col - knee) / (1.0 - knee))), step(knee, col));
  gl_FragColor = vec4(col * uDim, 1.0);
}
`;
