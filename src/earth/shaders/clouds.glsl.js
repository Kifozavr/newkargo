import { noiseGLSL, cloudFieldGLSL } from './noise.glsl.js';

export const cloudsVertex = /* glsl */ `
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

export const cloudsFragment = /* glsl */ `
precision highp float;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform vec3  uLightDir;
uniform float uCloudDensity;
uniform float uCloudBright;
uniform float uCloudViewPow;
uniform float uCloudAmbient;
uniform float uCloudPuff;
uniform float uCloudOpacity;
uniform vec3  uCloudColor;
uniform mat3  uCloudModelRot;
uniform float uCloudLightStep;
uniform float uCloudMax;
uniform float uCloudDim;

${noiseGLSL}
${cloudFieldGLSL}

void main() {
  vec3 p = normalize(vObj);
  // early out: the 4 skipped octaves can add at most ~0.27 to the field
  if (cloudField(p, 2) + 0.27 < uCloudCover) discard;
  float pix = length(fwidth(p)) * 0.7071;
  float field = cloudField(p, 6, pix);
  float cov = cloudCoverage(field);
  if (cov < 0.003) discard;

  vec3 n0 = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);

  vec3 n = n0;

  float ndv0 = clamp(dot(n0, V), 0.0, 1.0);
  float tau = cov * uCloudDensity / max(ndv0, 0.05);
  float alpha = (1.0 - exp(-tau)) * uCloudOpacity;
  // soften the shell's own silhouette above the horizon (edge-on clouds alias into a jagged strip)
  alpha *= smoothstep(0.0, 0.12, ndv0);

  float ndl = dot(n, L);
  float lit = smoothstep(-0.35, 0.6, ndl) * (0.55 + 0.45 * max(ndl, 0.0));
  float view = pow(1.0 - ndv0, uCloudViewPow);

  // puffy self-shadowing: compare density here with density a step towards the light
  float shade = 1.0;
  if (uCloudPuff > 0.0) {
    vec3 Lobj = transpose(uCloudModelRot) * L;
    vec3 Lt = Lobj - p * dot(Lobj, p);
    float fieldL = cloudField(normalize(p + Lt * uCloudLightStep), 4, pix);
    shade = clamp(0.55 + (field - fieldL) * uCloudPuff, 0.08, 1.6);
  }
  float b = uCloudBright * lit * (0.06 + 0.94 * view) * shade + uCloudAmbient;
  b *= 0.65 + 0.35 * cov;
  b = min(b, uCloudMax);

  alpha *= mix(1.0, uCloudDim, 0.5);
  gl_FragColor = vec4(uCloudColor * b * uCloudDim * alpha, alpha);
}
`;

export const atmosphereVertex = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const atmosphereFragment = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
uniform vec3  uLightDir;
uniform vec3  uColor;
uniform float uRimAmount;
uniform float uRimWidth;
uniform float uHaloAmount;
uniform float uHaloWidth;
uniform float uSideMin;
uniform float uAtmoDim;

void main() {
  vec3 D = normalize(vWorldPos - cameraPosition);
  float tca = dot(-cameraPosition, D);
  vec3 closest = cameraPosition + D * max(tca, 0.0);
  float b = length(closest);
  float hgt = max(b - 1.0, 0.0);
  float glow = uRimAmount * exp(-hgt / uRimWidth) + uHaloAmount * exp(-hgt / uHaloWidth);
  vec3 limb = closest / max(b, 1e-5);
  float side = mix(uSideMin, 1.0, smoothstep(-0.5, 0.7, dot(limb, normalize(uLightDir))));
  gl_FragColor = vec4(uColor * glow * side * uAtmoDim, 1.0);
}
`;
