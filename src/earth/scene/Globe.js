import * as THREE from 'three';
import { earthVertex, earthFragment } from '../shaders/earth.glsl.js';
import { cloudsVertex, cloudsFragment, atmosphereVertex, atmosphereFragment } from '../shaders/clouds.glsl.js';
import { markersVertex, markersFragment } from '../shaders/markers.glsl.js';

const lin = (hex) => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear working space
const D2R = Math.PI / 180;

export function latLonToVec3(lat, lon, r = 1, target = new THREE.Vector3()) {
  const phi = lat * D2R;
  const lam = lon * D2R;
  return target.set(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

/**
 * The planet: procedural contour-relief surface, glowing markers, cloud shell, atmosphere.
 * Everything that sits on the planet lives inside `group`, so rotating the group spins all layers together.
 */
export class Globe {
  constructor(cfg) {
    this.cfg = cfg;
    this.group = new THREE.Group();
    this.cloudGroup = new THREE.Group();
    this.group.add(this.cloudGroup);

    const L = new THREE.Vector3(0, 1, 0);
    this.lightDir = L;

    // ---- earth -------------------------------------------------------------
    const t = cfg.terrain;
    const e = cfg.earth;
    const c = cfg.clouds;
    this.cloudUniforms = {
      uCloudFreq: { value: c.freq },
      uCloudWarp: { value: c.warp },
      uCloudCover: { value: c.cover },
      uCloudSoft: { value: c.soft },
      uCloudDetail: { value: c.detail },
      uCloudStretch: { value: new THREE.Vector3(...c.stretch) },
      uCloudMacro: { value: c.macro },
      uCloudMacroFreq: { value: c.macroFreq },
    };
    this.earthUniforms = {
      uModelRot: { value: new THREE.Matrix3() },
      uCloudRot: { value: new THREE.Matrix3() },
      uLightDir: { value: L },
      uTerrainFreq: { value: t.freq },
      uTerrainGain: { value: t.gain },
      uWarpFreq: { value: t.warpFreq },
      uWarpAmt: { value: t.warpAmt },
      uLevels: { value: t.levels },
      uRidgeWidth: { value: t.ridgeWidth },
      uRidgeSlope: { value: t.ridgeSlope },
      uRidgeSharp: { value: t.ridgeSharp },
      uEven: { value: t.even },
      uAAWidth: { value: t.aaWidth },
      uAAFade: { value: t.aaFade },
      uMinSpacing: { value: t.minSpacing },
      uAAMin: { value: t.aaMin },
      uSSBelow: { value: t.ssBelow },
      uSSSpread: { value: t.ssSpread },
      uAlbedo: { value: lin(e.albedo) },
      uLightIntensity: { value: e.lightIntensity },
      uViewPow: { value: e.viewPow },
      uViewBumpMix: { value: e.viewBumpMix },
      uTermSoft: { value: e.termSoft },
      uAmbient: { value: e.ambient },
      uHazeColor: { value: lin(e.hazeColor) },
      uHazeAmount: { value: e.hazeAmount },
      uHazePow: { value: e.hazePow },
      uKnee: { value: e.knee },
      uRelief: { value: 1 },
      uDim: { value: 1 },
      uCloudShadow: { value: c.enabled ? c.shadow : 0 },
      uCloudHeight: { value: c.radius - 1 },
      ...this.cloudUniforms,
    };
    const seg = cfg.quality.segments;
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, seg, seg / 2),
      new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        uniforms: this.earthUniforms,
      })
    );
    this.earth.renderOrder = 0;
    this.group.add(this.earth);

    // ---- clouds ------------------------------------------------------------
    this.cloudsMatUniforms = {
      uLightDir: { value: L },
      uCloudDensity: { value: c.density },
      uCloudBright: { value: c.bright },
      uCloudViewPow: { value: c.viewPow },
      uCloudAmbient: { value: c.ambient },
      uCloudPuff: { value: c.puff },
      uCloudOpacity: { value: c.opacity },
      uCloudColor: { value: lin(c.color) },
      uCloudModelRot: { value: new THREE.Matrix3() },
      uCloudLightStep: { value: c.lightStep },
      uCloudMax: { value: c.max },
      uCloudDim: { value: 1 },
      ...this.cloudUniforms,
    };
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(c.radius, seg, seg / 2),
      new THREE.ShaderMaterial({
        vertexShader: cloudsVertex,
        fragmentShader: cloudsFragment,
        uniforms: this.cloudsMatUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      })
    );
    this.clouds.renderOrder = 2;
    this.clouds.visible = c.enabled;
    this.cloudGroup.add(this.clouds);

    // ---- atmosphere (world space, not rotated) -------------------------------
    const a = cfg.atmosphere;
    this.atmoUniforms = {
      uLightDir: { value: L },
      uColor: { value: lin(a.color) },
      uRimAmount: { value: a.rimAmount },
      uRimWidth: { value: a.rimWidth },
      uHaloAmount: { value: a.haloAmount },
      uHaloWidth: { value: a.haloWidth },
      uSideMin: { value: a.sideMin },
      uAtmoDim: { value: 1 },
    };
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 96, 48),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: this.atmoUniforms,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.atmosphere.renderOrder = 3;

    // ---- markers -----------------------------------------------------------
    const m = cfg.markers;
    this.markerUniforms = {
      uScale: { value: 1000 },
      uSize: { value: m.size },
      uMinPx: { value: m.minPx },
      uMaxPx: { value: m.maxPx },
      uGlowScale: { value: m.glowScale },
      uGlowAmount: { value: m.glowAmount },
      uGlowFalloff: { value: m.glowFalloff },
      uCoreBoost: { value: m.coreBoost },
      uCoreColor: { value: lin(m.coreColor) },
      uGlowColor: { value: lin(m.glowColor) },
      uHoverColor: { value: lin(m.hoverColor) },
      uHover: { value: -1 },
      uTime: { value: 0 },
      uTwinkle: { value: m.twinkle },
      uGain: { value: 1 },
      uDpr: { value: 1 },
    };
    this.markers = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        vertexShader: markersVertex,
        fragmentShader: markersFragment,
        uniforms: this.markerUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.markers.renderOrder = 1;
    this.markers.frustumCulled = false;
    this.group.add(this.markers);
    this.points = [];
    this.localPositions = new Float32Array(0);
  }

  /** Replace marker data. points: [{ id, lat, lon, weight, name }] */
  setMarkers(points) {
    const n = points.length;
    const r = this.cfg.markers.radius;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const inten = new Float32Array(n);
    const index = new Float32Array(n);
    const phase = new Float32Array(n);
    let wmax = 0;
    for (const p of points) wmax = Math.max(wmax, p.weight ?? 1);
    const v = new THREE.Vector3();
    points.forEach((p, i) => {
      latLonToVec3(p.lat, p.lon, r, v);
      pos.set([v.x, v.y, v.z], i * 3);
      const w = (p.weight ?? 1) / (wmax || 1);
      size[i] = 0.7 + 0.7 * w;
      inten[i] = 0.4 + 0.6 * w;
      index[i] = i;
      phase[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    });
    const g = this.markers.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aIntensity', new THREE.BufferAttribute(inten, 1));
    g.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.computeBoundingSphere();
    this.points = points;
    this.localPositions = pos;
  }

  setLight(dir) {
    this.lightDir.copy(dir).normalize();
  }

  /** Scroll-dependent shading (set by the camera rig). */
  setShading(rig) {
    this.earthUniforms.uViewPow.value = rig.viewPow;
    this.earthUniforms.uLightIntensity.value = rig.lightIntensity;
    this.cloudsMatUniforms.uCloudViewPow.value = rig.cloudViewPow;
    this.markerUniforms.uGain.value = rig.markerGain;
    this.earthUniforms.uDim.value = rig.dim;
    this.earthUniforms.uRelief.value = rig.relief;
    this.cloudsMatUniforms.uCloudDim.value = rig.cloudDim;
    this.atmoUniforms.uAtmoDim.value = rig.atmoDim;
  }

  update(time, camera, bufferHeight, dpr = 1) {
    const c = this.cfg.clouds;
    this.cloudGroup.rotation.y = time * c.drift;
    this.group.updateMatrixWorld(true);
    this.earthUniforms.uModelRot.value.setFromMatrix4(this.group.matrixWorld);
    this.cloudsMatUniforms.uCloudModelRot.value.setFromMatrix4(this.cloudGroup.matrixWorld);
    // earth object space -> cloud space = inverse of the cloud group's local rotation
    this.earthUniforms.uCloudRot.value.setFromMatrix4(this.cloudGroup.matrix).transpose();
    const fovRad = (camera.fov * Math.PI) / 180;
    this.markerUniforms.uScale.value = bufferHeight / (2 * Math.tan(fovRad / 2));
    this.markerUniforms.uTime.value = time;
    this.markerUniforms.uDpr.value = dpr;
  }

  /** Nearest visible marker to a screen point (CSS px). Returns index or -1. */
  pick(camera, x, y, width, height, radiusPx = 12) {
    const pos = this.localPositions;
    if (!pos.length) return -1;
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.group.matrixWorld);
    const e = m.elements;
    const w = this.group.matrixWorld.elements;
    const cp = camera.position;
    let best = -1;
    let bestD = radiusPx * radiusPx;
    for (let i = 0, n = pos.length / 3; i < n; i++) {
      const px = pos[i * 3];
      const py = pos[i * 3 + 1];
      const pz = pos[i * 3 + 2];
      // world position (rotation only, earth at origin)
      const wx = w[0] * px + w[4] * py + w[8] * pz;
      const wy = w[1] * px + w[5] * py + w[9] * pz;
      const wz = w[2] * px + w[6] * py + w[10] * pz;
      if (wx * (cp.x - wx) + wy * (cp.y - wy) + wz * (cp.z - wz) <= 0) continue; // back side
      const cw = e[3] * px + e[7] * py + e[11] * pz + e[15];
      if (cw <= 0) continue;
      const sx = ((e[0] * px + e[4] * py + e[8] * pz + e[12]) / cw * 0.5 + 0.5) * width;
      const sy = (1 - ((e[1] * px + e[5] * py + e[9] * pz + e[13]) / cw * 0.5 + 0.5)) * height;
      const d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  setHover(i) {
    this.markerUniforms.uHover.value = i;
  }

  /** Push config values into uniforms (used by the debug panel). */
  syncUniforms() {
    const { terrain: t, earth: e, clouds: c, atmosphere: a, markers: m } = this.cfg;
    const U = this.earthUniforms;
    U.uTerrainFreq.value = t.freq;
    U.uTerrainGain.value = t.gain;
    U.uWarpFreq.value = t.warpFreq;
    U.uWarpAmt.value = t.warpAmt;
    U.uLevels.value = t.levels;
    U.uRidgeWidth.value = t.ridgeWidth;
    U.uRidgeSlope.value = t.ridgeSlope;
    U.uRidgeSharp.value = t.ridgeSharp;
    U.uEven.value = t.even;
    U.uAAWidth.value = t.aaWidth;
    U.uAAFade.value = t.aaFade;
    U.uMinSpacing.value = t.minSpacing;
    U.uAAMin.value = t.aaMin;
    U.uSSBelow.value = t.ssBelow;
    U.uSSSpread.value = t.ssSpread;
    U.uLightIntensity.value = e.lightIntensity;
    U.uViewPow.value = e.viewPow;
    U.uViewBumpMix.value = e.viewBumpMix;
    U.uTermSoft.value = e.termSoft;
    U.uAmbient.value = e.ambient;
    U.uHazeAmount.value = e.hazeAmount;
    U.uHazePow.value = e.hazePow;
    U.uKnee.value = e.knee;
    U.uCloudShadow.value = c.enabled ? c.shadow : 0;
    const C = this.cloudUniforms;
    C.uCloudFreq.value = c.freq;
    C.uCloudWarp.value = c.warp;
    C.uCloudCover.value = c.cover;
    C.uCloudSoft.value = c.soft;
    C.uCloudDetail.value = c.detail;
    C.uCloudStretch.value.set(...c.stretch);
    C.uCloudMacro.value = c.macro;
    C.uCloudMacroFreq.value = c.macroFreq;
    const CM = this.cloudsMatUniforms;
    CM.uCloudDensity.value = c.density;
    CM.uCloudBright.value = c.bright;
    CM.uCloudViewPow.value = c.viewPow;
    CM.uCloudAmbient.value = c.ambient;
    CM.uCloudPuff.value = c.puff;
    CM.uCloudOpacity.value = c.opacity;
    CM.uCloudLightStep.value = c.lightStep;
    CM.uCloudMax.value = c.max;
    this.clouds.visible = c.enabled;
    const A = this.atmoUniforms;
    A.uRimAmount.value = a.rimAmount;
    A.uRimWidth.value = a.rimWidth;
    A.uHaloAmount.value = a.haloAmount;
    A.uHaloWidth.value = a.haloWidth;
    A.uSideMin.value = a.sideMin;
    const M = this.markerUniforms;
    M.uSize.value = m.size;
    M.uMinPx.value = m.minPx;
    M.uMaxPx.value = m.maxPx;
    M.uGlowScale.value = m.glowScale;
    M.uGlowAmount.value = m.glowAmount;
    M.uGlowFalloff.value = m.glowFalloff;
    M.uCoreBoost.value = m.coreBoost;
    M.uTwinkle.value = m.twinkle;
  }
}
