// 3D simplex noise with analytic gradient.
// Based on webgl-noise (noise3Dgrad) by Ian McEwan & Stefan Gustavson, MIT License.
export const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v, out vec3 gradient) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
  vec4 temp = m2 * m * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}

float snoise(vec3 v) { vec3 g; return snoise(v, g); }
`;

// Shared cloud density field (used by the cloud shell and by cloud shadows on the ground).
// p is a unit vector in cloud space.
export const cloudFieldGLSL = /* glsl */ `
uniform float uCloudFreq;
uniform float uCloudWarp;
uniform float uCloudCover;
uniform float uCloudSoft;
uniform float uCloudDetail;
uniform vec3  uCloudStretch;
uniform float uCloudMacro;
uniform float uCloudMacroFreq;

// pix = size of one screen pixel on the unit sphere (0 = no filtering). Octaves finer than ~2 px are
// faded to their mean value, so far / grazing clouds don't sparkle while the camera moves.
float cloudField(vec3 p, int octaves, float pix) {
  vec3 q = p * uCloudStretch * uCloudFreq;
  vec3 w = vec3(
    snoise(q * 0.55 + vec3(13.1, 7.7, -3.3)),
    snoise(q * 0.55 + vec3(-21.4, 4.2, 17.9)),
    snoise(q * 0.55 + vec3(5.6, -31.2, 9.4))
  );
  q += w * uCloudWarp;
  float f = 0.0;
  float a = 0.5;
  float s = 1.0;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    float n = snoise(q * s + float(i) * 19.19);
    // billowy high octaves give the granular cumulus texture
    float mean = 0.0;
    if (i >= 2) {
      n = mix(n, 1.0 - 2.0 * abs(n), uCloudDetail);
      mean = 0.5 * uCloudDetail;
    }
    float keep = 1.0 - smoothstep(0.18, 0.42, uCloudFreq * s * pix);
    f += a * mix(mean, n, keep);
    s *= 2.07;
    a *= 0.52;
  }
  // large-scale weather systems: whole regions are clear or overcast
  f += uCloudMacro * snoise(p * uCloudMacroFreq + vec3(3.7, -1.3, 8.1));
  return f;
}

float cloudField(vec3 p, int octaves) { return cloudField(p, octaves, 0.0); }

float cloudCoverage(float field) {
  return smoothstep(uCloudCover, uCloudCover + uCloudSoft, field);
}
`;
