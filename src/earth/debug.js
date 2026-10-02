import GUI from 'lil-gui';

// Live tuning panel: open the page with ?debug
export function mountDebug(config, sync) {
  const gui = new GUI({ title: 'Earth · tuning', width: 300 });
  const on = () => sync();

  const t = gui.addFolder('Рельеф / изолинии');
  t.add(config.terrain, 'freq', 0.5, 10, 0.01).onChange(on);
  t.add(config.terrain, 'gain', 0, 0.8, 0.01).onChange(on);
  t.add(config.terrain, 'warpFreq', 0, 4, 0.01).onChange(on);
  t.add(config.terrain, 'warpAmt', 0, 0.8, 0.01).onChange(on);
  t.add(config.terrain, 'levels', 4, 80, 0.5).onChange(on);
  t.add(config.terrain, 'ridgeWidth', 0.02, 0.5, 0.005).onChange(on);
  t.add(config.terrain, 'ridgeSlope', 0, 4, 0.01).onChange(on);
  t.add(config.terrain, 'ridgeSharp', 0.3, 2, 0.01).onChange(on);
  t.add(config.terrain, 'even', 0, 1, 0.01).onChange(on);
  t.add(config.terrain, 'minSpacing', 1, 20, 0.1).onChange(on);
  t.add(config.terrain, 'aaMin', 0.5, 6, 0.1).onChange(on);
  t.add(config.terrain, 'ssBelow', 0, 40, 0.5).onChange(on);
  t.add(config.terrain, 'ssSpread', 0.5, 2.5, 0.05).onChange(on);

  const e = gui.addFolder('Свет поверхности');
  e.add(config.earth, 'lightIntensity', 0, 10, 0.01).onChange(on);
  e.add(config.earth, 'viewPow', 0, 12, 0.01).onChange(on);
  e.add(config.earth, 'viewBumpMix', 0, 1, 0.01).onChange(on);
  e.add(config.earth, 'termSoft', 0, 0.5, 0.005).onChange(on);
  e.add(config.earth, 'ambient', 0, 0.1, 0.001).onChange(on);
  e.add(config.earth, 'hazeAmount', 0, 1, 0.005).onChange(on);
  e.add(config.earth, 'hazePow', 0.5, 20, 0.1).onChange(on);

  const c = gui.addFolder('Облака');
  c.add(config.clouds, 'enabled').onChange(on);
  c.add(config.clouds, 'freq', 0.5, 8, 0.01).onChange(on);
  c.add(config.clouds, 'warp', 0, 2, 0.01).onChange(on);
  c.add(config.clouds, 'cover', -0.6, 0.6, 0.005).onChange(on);
  c.add(config.clouds, 'soft', 0.02, 1, 0.005).onChange(on);
  c.add(config.clouds, 'detail', 0, 1, 0.01).onChange(on);
  c.add(config.clouds, 'macro', 0, 0.8, 0.01).onChange(on);
  c.add(config.clouds, 'macroFreq', 0.2, 4, 0.01).onChange(on);
  c.add(config.clouds, 'density', 0, 3, 0.01).onChange(on);
  c.add(config.clouds, 'opacity', 0, 1, 0.01).onChange(on);
  c.add(config.clouds, 'bright', 0, 4, 0.01).onChange(on);
  c.add(config.clouds, 'viewPow', 0, 8, 0.01).onChange(on);
  c.add(config.clouds, 'ambient', 0, 0.3, 0.001).onChange(on);
  c.add(config.clouds, 'puff', 0, 8, 0.01).onChange(on);
  c.add(config.clouds, 'lightStep', 0.001, 0.05, 0.0005).onChange(on);
  c.add(config.clouds, 'max', 0.2, 2, 0.01).onChange(on);
  c.add(config.clouds, 'shadow', 0, 1, 0.01).onChange(on);
  c.add(config.clouds, 'drift', 0, 0.05, 0.0005);

  const a = gui.addFolder('Атмосфера');
  a.add(config.atmosphere, 'rimAmount', 0, 3, 0.01).onChange(on);
  a.add(config.atmosphere, 'rimWidth', 0.001, 0.05, 0.0005).onChange(on);
  a.add(config.atmosphere, 'haloAmount', 0, 0.5, 0.001).onChange(on);
  a.add(config.atmosphere, 'haloWidth', 0.01, 0.5, 0.005).onChange(on);
  a.add(config.atmosphere, 'sideMin', 0, 1, 0.01).onChange(on);

  const m = gui.addFolder('Точки');
  m.add(config.markers, 'size', 0.0002, 0.01, 0.0001).onChange(on);
  m.add(config.markers, 'minPx', 0.5, 8, 0.1).onChange(on);
  m.add(config.markers, 'maxPx', 2, 30, 0.5).onChange(on);
  m.add(config.markers, 'glowScale', 1, 10, 0.1).onChange(on);
  m.add(config.markers, 'glowAmount', 0, 3, 0.01).onChange(on);
  m.add(config.markers, 'glowFalloff', 0.2, 5, 0.01).onChange(on);
  m.add(config.markers, 'coreBoost', 0, 8, 0.01).onChange(on);
  m.add(config.markers, 'twinkle', 0, 1, 0.01).onChange(on);

  const p = gui.addFolder('Пост-обработка');
  p.add(config.post, 'bloomStrength', 0, 3, 0.01).onChange(on);
  p.add(config.post, 'bloomRadius', 0, 1, 0.01).onChange(on);
  p.add(config.post, 'bloomThreshold', 0, 2, 0.01).onChange(on);
  p.add(config.post, 'grain', 0, 0.2, 0.001).onChange(on);
  p.add(config.post, 'vignette', 0, 1, 0.01).onChange(on);

  const k = gui.addFolder('Камера / скролл');
  k.add(config.camera.start, 'lat', -10, 70, 0.1).name('start lat');
  k.add(config.camera.start, 'lon', -180, 180, 0.1).name('start lon');
  k.add(config.camera.end, 'fill', 0.1, 1, 0.01).name('end globe size');
  k.add(config.fade, 'from', 0, 0.95, 0.01).name('fade starts at');
  k.add(config.fade, 'brightness', 0, 1, 0.01).name('far brightness');
  k.add(config.fade, 'relief', 0, 1, 0.01).name('far relief');
  k.add(config.fade, 'clouds', 0, 1, 0.01).name('far clouds');
  k.add(config.fade, 'atmosphere', 0, 1, 0.01).name('far atmosphere');
  k.add(config.camera, 'spin', 0, 360, 1).name('spin, °');
  k.add(config.light.start, 'elev', -30, 40, 0.1).name('light start elev');
  k.add(config.light.end, 'elev', -60, 60, 0.1).name('light end elev');
  k.add(config.light.end, 'x', -1.5, 1.5, 0.01).name('light end x');
  k.add(config.light.end, 'viewPow', 0, 8, 0.01).name('end view falloff');
  k.add(config.light.end, 'intensity', 0, 8, 0.01).name('end light');

  gui.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(config, null, 2)) }, 'copy').name('Скопировать конфиг (JSON)');
  [t, e, c, a, m, p, k].forEach((f) => f.close());
  return gui;
}
