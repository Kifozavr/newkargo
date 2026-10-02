import * as THREE from 'three';

const D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

const _P = new THREE.Vector3();
const _T = new THREE.Vector3();
const _F = new THREE.Vector3();
const _U = new THREE.Vector3();
const _R = new THREE.Vector3(1, 0, 0);

/**
 * Camera rig. The camera always lives in the world Y-Z plane above latitude `lat`,
 * looking north; the globe is rotated so that longitude `lon` faces the camera.
 *   dist   — distance from the earth's centre, in earth radii
 *   pitchK — how far the view is tilted from the centre towards the horizon,
 *            as a fraction of the globe's angular radius (1 = look exactly at the limb)
 *   spin   — counter-clockwise rotation about the polar axis (seen from the North Pole)
 */
export function computeRig(cfg, p, out = {}, fovDeg = cfg.camera.fov, aspect = 1.6) {
  const c = cfg.camera;
  const s = c.start;
  const e = c.end;
  const t = clamp01(p);
  const tz = easeInOutSine(t);
  // final distance: the globe's radius fills `end.fill` of the limiting half-dimension of the screen
  const tanV = Math.tan((fovDeg * D2R) / 2);
  const tanMin = Math.min(tanV, tanV * aspect);
  const endDist = 1 / Math.sin(Math.atan(e.fill * tanMin * (aspect < 1 ? 1.25 : 1)));
  // exponential dolly feels like constant-speed receding
  out.dist = s.dist * Math.pow(endDist / s.dist, easeInOut(t) * 0.85 + t * 0.15);
  const k = lerp(s.pitchK, e.pitchK, easeInOut(clamp01(t * 1.15)));
  out.pitch = k * Math.asin(1 / out.dist);
  out.lat = lerp(s.lat, e.lat, tz) * D2R;
  out.lon = lerp(s.lon, e.lon, tz) * D2R;
  out.spin = c.spin * D2R * tz;
  const l = cfg.light;
  out.lightX = lerp(l.start.x, l.end.x, tz);
  out.lightElev = lerp(l.start.elev, l.end.elev, tz) * D2R;
  // the close-up is lit like a grazing horizon shot; the far globe needs a softer falloff to read as a sphere
  out.viewPow = lerp(cfg.earth.viewPow, l.end.viewPow, tz);
  out.lightIntensity = lerp(cfg.earth.lightIntensity, l.end.intensity, tz);
  out.cloudViewPow = lerp(cfg.clouds.viewPow, l.end.cloudViewPow, tz);
  // markers overlap more as the globe shrinks; keep their summed glow in check
  out.markerGain = lerp(1, cfg.markers.farGain, tz);
  // the further the globe, the darker and flatter it gets, so it reads as a calm silhouette, not a busy texture
  const fade = cfg.fade;
  const tf = easeInOutSine(clamp01((t - fade.from) / (1 - fade.from)));
  out.dim = lerp(1, fade.brightness, tf);
  out.relief = lerp(1, fade.relief, tf);
  out.cloudDim = lerp(1, fade.clouds, tf);
  out.atmoDim = lerp(1, fade.atmosphere, tf);
  return out;
}

export function applyRig(rig, camera, globe, lightTarget) {
  const { dist, pitch, lat, lon, spin } = rig;
  _P.set(0, Math.sin(lat), Math.cos(lat)); // local up at the nadir
  _T.set(0, Math.cos(lat), -Math.sin(lat)); // north tangent
  _F.copy(_P).multiplyScalar(-Math.cos(pitch)).addScaledVector(_T, Math.sin(pitch));
  _U.set(0, -_F.z, _F.y);
  camera.position.copy(_P).multiplyScalar(dist);
  camera.up.copy(_U);
  camera.lookAt(camera.position.x + _F.x, camera.position.y + _F.y, camera.position.z + _F.z);
  camera.updateMatrixWorld();

  globe.group.rotation.set(0, -lon + spin, 0);

  // light: x across the screen, then elevation measured from the nadir's horizon plane
  lightTarget
    .copy(_T)
    .multiplyScalar(Math.cos(rig.lightElev))
    .addScaledVector(_P, Math.sin(rig.lightElev))
    .addScaledVector(_R, rig.lightX)
    .normalize();
}

/** Vertical FOV that keeps the horizontal framing of the 16:10 reference on narrower screens. */
export function fovForAspect(baseFov, aspect, refAspect = 1.6, maxFov = 64) {
  if (aspect >= refAspect) return baseFov;
  const h = 2 * Math.atan(Math.tan((baseFov * D2R) / 2) * refAspect);
  const v = (2 * Math.atan(Math.tan(h / 2) / aspect)) / D2R;
  return Math.min(v, maxFov);
}
