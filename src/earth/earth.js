import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { config } from './config.js';
// LANDING: copy of web/src/main.js — only the scroll source and the exports at the end differ.
import { Globe } from './scene/Globe.js';
import { computeRig, applyRig, fovForAspect } from './scene/rig.js';
import { loadMarkers } from './data/api.js';

const params = new URLSearchParams(location.search);
const fixedProgress = params.has('p') ? parseFloat(params.get('p')) : null;
const frozen = params.has('freeze');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers = params.get('layers');
const view = params.get('view');

// quick overrides for tuning/tests: ?cfg=earth.viewPow:5,post.bloomStrength:0
if (params.has('cfg')) {
  for (const pair of params.get('cfg').split(',')) {
    const [path, raw] = pair.split(':');
    const keys = path.split('.');
    let o = config;
    for (let i = 0; i < keys.length - 1; i++) o = o?.[keys[i]];
    if (o && keys.at(-1) in o) o[keys.at(-1)] = raw === 'true' ? true : raw === 'false' ? false : isNaN(+raw) ? raw : +raw;
  }
}

// lighter settings for phones / low-power devices
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
if (lowPower && !params.has('hq')) {
  config.clouds.shadow = 0;
  config.clouds.puff = 0;
  config.quality.maxDpr = Math.min(config.quality.maxDpr, 1.75);
  config.quality.segments = 256;
}

// ---------------------------------------------------------------------------
// renderer / composer
const canvas = document.getElementById('globe');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  throw err;
}
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = config.post.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.01, 100);

const globe = new Globe(config);
scene.add(globe.group);
scene.add(globe.atmosphere);

if (layers) {
  const on = new Set(layers.split(','));
  globe.earth.visible = on.has('earth');
  globe.clouds.visible = on.has('clouds');
  globe.markers.visible = on.has('markers');
  globe.atmosphere.visible = on.has('atmo');
  if (!on.has('clouds')) globe.earthUniforms.uCloudShadow.value = 0;
}

const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: params.has('msaa') ? +params.get('msaa') : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), config.post.bloomStrength, config.post.bloomRadius, config.post.bloomThreshold);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: config.post.grain },
    uVignette: { value: config.post.vignette },
    uAspect: { value: 1 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVignette; uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
      c.rgb *= v;
      float n = hash(gl_FragCoord.xy + fract(uTime * 7.31) * 123.0) - 0.5;
      c.rgb += n * uGrain * (0.35 + 0.65 * (1.0 - c.rgb));
      gl_FragColor = c;
    }`,
});
composer.addPass(finish);

// ---------------------------------------------------------------------------
// sizing + adaptive resolution
let dpr = Math.min(window.devicePixelRatio || 1, config.quality.maxDpr);
let width = 1;
let height = 1;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  composer.setPixelRatio(dpr);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = view === 'ref' ? 30 : fovForAspect(config.camera.fov, camera.aspect);
  camera.updateProjectionMatrix();
  finish.uniforms.uAspect.value = camera.aspect;
}
window.addEventListener('resize', resize);
resize();

let frameTimes = [];
function adaptQuality(dt) {
  if (fixedProgress !== null) return;
  frameTimes.push(dt);
  if (frameTimes.length < 90) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  frameTimes = [];
  const budget = 1000 / config.quality.targetFps;
  if (avg > budget * 1.25 && dpr > config.quality.minDpr) {
    dpr = Math.max(config.quality.minDpr, dpr - 0.25);
    resize();
  } else if (avg < budget * 0.6 && dpr < Math.min(window.devicePixelRatio || 1, config.quality.maxDpr)) {
    dpr = Math.min(config.quality.maxDpr, dpr + 0.25);
    resize();
  }
}

// ---------------------------------------------------------------------------
// scroll: Lenis smooth scrolling drives a GSAP ScrollTrigger-scrubbed progress value
const state = { p: fixedProgress ?? 0 };
gsap.registerPlugin(ScrollTrigger);
let lenis = null;
if (fixedProgress === null) {
  if (reducedMotion) {
    config.markers.twinkle = 0;
    config.clouds.drift = 0;
  }
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: !reducedMotion });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // LANDING: progress runs over the whole page instead of the empty #scroll block (520vh):
  // p = 0 at the top, p = 1 when the footer's top edge enters the viewport (farthest point).
  gsap.to(state, {
    p: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', endTrigger: '#footer', end: 'top bottom', scrub: 1.1, invalidateOnRefresh: true },
  });
} else {
  document.documentElement.classList.add('fixed');
}

// ---------------------------------------------------------------------------
// hover / picking
const tip = document.getElementById('tip');
const pointer = { x: -1, y: -1, moved: false, inside: false };
canvas.addEventListener('pointermove', (ev) => {
  pointer.x = ev.clientX;
  pointer.y = ev.clientY;
  pointer.moved = true;
  pointer.inside = true;
});
// touch: a tap selects the nearest point (there is no hover on phones)
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'mouse') return;
  pointer.x = ev.clientX;
  pointer.y = ev.clientY;
  pointer.moved = true;
  pointer.inside = true;
});
canvas.addEventListener('pointerleave', () => {
  pointer.inside = false;
  pointer.moved = true;
});
let hoverIndex = -1;
const beam = document.getElementById('beam');
const _mv = new THREE.Vector3();
const _toCam = new THREE.Vector3();
/** Screen position (CSS px) of marker i, or null when it is on the far side of the globe. */
function markerToScreen(i) {
  _mv.fromArray(globe.localPositions, i * 3).applyMatrix4(globe.group.matrixWorld);
  if (_mv.dot(_toCam.subVectors(camera.position, _mv)) <= 0) return null;
  _mv.project(camera);
  return { x: (_mv.x * 0.5 + 0.5) * width, y: (1 - (_mv.y * 0.5 + 0.5)) * height };
}

function updateHover() {
  if (!pointer.moved && hoverIndex < 0) return;
  pointer.moved = false;
  let i = -1;
  if (pointer.inside) {
    // a little stickiness, so neighbouring points don't steal the hover while the cursor rests
    const cur = hoverIndex >= 0 ? markerToScreen(hoverIndex) : null;
    i = cur && Math.hypot(cur.x - pointer.x, cur.y - pointer.y) < 14 ? hoverIndex : globe.pick(camera, pointer.x, pointer.y, width, height, 10);
  }
  const changed = i !== hoverIndex;
  hoverIndex = i;
  globe.setHover(i);
  canvas.style.cursor = i >= 0 ? 'pointer' : '';

  // glowing column rising from the hovered point; follows it while the globe moves
  const sp = i >= 0 ? markerToScreen(i) : null;
  if (beam) {
    if (sp) {
      beam.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`;
      if (changed) {
        beam.classList.remove('on');
        void beam.offsetWidth; // restart the rise animation for a new point
      }
      beam.classList.add('on');
    } else {
      beam.classList.remove('on');
    }
  }

  if (i >= 0 && tip) {
    const pt = globe.points[i];
    if (tip.dataset.index !== String(i)) {
      tip.dataset.index = String(i);
      const el = (tag, text) => {
        const [name, cls] = tag.split('.');
        return Object.assign(document.createElement(name), { textContent: text, className: cls || '' });
      };
      const fmt = (v) => Math.round(v).toString();
      tip.replaceChildren(
        el('b', `Сцепка #${fmt(pt.coupling)}`),
        el('span.k', 'Загрузка'), el('span.v', `${fmt(pt.load)} т`),
        el('span.k', 'Пробег в сутки'), el('span.v', `${fmt(pt.mileage)} км`),
        el('span.k', 'Эффективность'), el('span.v', `${fmt(pt.efficiency)} р/км`)
      );
    }
    // keep the card on screen near the edges
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = pointer.x + 16 + w > width - 8 ? pointer.x - 16 - w : pointer.x + 16;
    const y = pointer.y + 16 + h > height - 8 ? pointer.y - 16 - h : pointer.y + 16;
    tip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    tip.classList.add('on');
  } else if (tip) {
    tip.classList.remove('on');
  }
}
canvas.addEventListener('click', () => {
  if (hoverIndex >= 0) window.dispatchEvent(new CustomEvent('marker:click', { detail: globe.points[hoverIndex] }));
});

// ---------------------------------------------------------------------------
// render loop
const rig = {};
const clock = new THREE.Clock();
let ready = false;
function frame() {
  const dt = clock.getDelta() * 1000;
  const time = frozen ? 0 : clock.elapsedTime;
  if (view === 'ref') {
    // camera that reproduces the framing of earth.png / earth+clouds.png (2560x1440)
    Object.assign(rig, computeRig(config, 0, {}, camera.fov, camera.aspect));
    rig.dist = 1.2531;
    rig.pitch = (41.98 * Math.PI) / 180;
  } else {
    computeRig(config, state.p, rig, camera.fov, camera.aspect);
  }
  applyRig(rig, camera, globe, globe.lightDir);
  globe.setShading(rig);
  globe.update(time, camera, height * dpr, dpr);
  finish.uniforms.uTime.value = time;
  updateHover();
  if (params.has('direct')) renderer.render(scene, camera); else composer.render();
  adaptQuality(dt);
  if (!ready) {
    ready = true;
    document.documentElement.classList.add('ready');
    window.__earth.ready = true;
  }
  if (!frozen || fixedProgress === null) requestAnimationFrame(frame);
}

window.__earth = {
  ready: false,
  config,
  globe,
  camera,
  /** screen position (CSS px) of marker i, or null if on the far side */
  markerScreen: (i) => markerToScreen(i),
  setProgress(p) {
    state.p = p;
  },
  get progress() {
    return state.p;
  },
  get dpr() {
    return dpr;
  },
  renderOnce() {
    frame();
  },
  sync() {
    globe.syncUniforms();
    bloom.strength = config.post.bloomStrength;
    bloom.radius = config.post.bloomRadius;
    bloom.threshold = config.post.bloomThreshold;
    finish.uniforms.uGrain.value = config.post.grain;
    finish.uniforms.uVignette.value = config.post.vignette;
  },
};

// ---------------------------------------------------------------------------
// data
const apiUrl = params.get('api') || document.documentElement.dataset.api || '';
loadMarkers({ url: apiUrl }).then(({ points, source }) => {
  globe.setMarkers(points);
  window.__earth.markerSource = source;
  window.dispatchEvent(new CustomEvent('markers:ready', { detail: { count: points.length, source } }));
  requestAnimationFrame(frame);
});

if (params.has('debug') || location.hash === '#debug') import('./debug.js').then((m) => m.mountDebug(config, window.__earth.sync));

// LANDING: shared with the page (anchor scrolling, block animations)
export { lenis, gsap, ScrollTrigger, config };
