// 07 «Посчитайте эффективность своего парка»: размер парка (слайдер 1–300 + пресеты) × выгода выбранных сервисов.
import { perUnit, TOTAL_JUNCTIONS, rub } from '../data/economics.js';

const MIN = 1;
const MAX = 300;
// шкала нелинейная, как в макете (25 тягачей ≈ 35 % трека): мелким паркам больше точности
const K = 0.42;
const toT = (n) => Math.pow((n - MIN) / (MAX - MIN), K);
const toN = (t) => Math.round(MIN + (MAX - MIN) * Math.pow(Math.min(1, Math.max(0, t)), 1 / K));

export function initFleet({ gsap }) {
  const root = document.querySelector('.calc');
  if (!root) return null;
  const range = root.querySelector('[data-range]');
  const knob = range.querySelector('.range__knob');
  const fill = range.querySelector('.range__fill');
  const countEl = root.querySelector('[data-out="fleet-n"]');
  const wordEl = root.querySelector('[data-out="fleet-word"]');
  const out = (k) => root.querySelector(`[data-out="${k}"]`);
  const unitEl = out('fleet-unit');
  const juncEl = out('fleet-junctions');
  const closedEl = out('fleet-closed');
  const presets = [...root.querySelectorAll('.preset')];
  const picks = [...root.querySelectorAll('.pick')];
  const byId = Object.fromEntries(picks.map((p) => [p.dataset.pick, p]));
  const sumEl = out('fleet-sum');
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'тягач' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'тягача' : 'тягачей');

  let n = 25;
  const sel = new Set(picks.filter((p) => p.classList.contains('is-on')).map((p) => p.dataset.pick));
  const pos = { t: toT(n) };
  const shown = { v: 0 };

  const place = (t) => {
    const pct = `${t * 100}%`;
    fill.style.width = pct;
    knob.style.left = pct;
  };

  function compute(animate = true) {
    const r = perUnit(sel);
    const total = r.total * n;
    unitEl.textContent = rub(r.total);
    juncEl.textContent = rub(r.junctions * n);
    closedEl.textContent = `${r.closed} / ${TOTAL_JUNCTIONS}`;
    gsap.to(shown, { v: total, duration: animate ? 0.8 : 0, ease: 'power3.out', overwrite: true, onUpdate: () => (sumEl.textContent = rub(shown.v)) });
  }

  function setN(v, { glide = true } = {}) {
    n = Math.min(MAX, Math.max(MIN, Math.round(v)));
    countEl.textContent = n;
    wordEl.textContent = plural(n);
    knob.setAttribute('aria-valuenow', String(n));
    knob.setAttribute('aria-valuetext', `${n} тягачей`);
    presets.forEach((p) => p.classList.toggle('is-on', +p.dataset.fleet === n));
    if (glide) gsap.to(pos, { t: toT(n), duration: 0.7, ease: 'expo.out', overwrite: true, onUpdate: () => place(pos.t) });
    compute();
  }

  // drag anywhere on the track
  const tFromEvent = (e) => {
    const r = range.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  range.addEventListener('pointerdown', (e) => {
    range.setPointerCapture(e.pointerId);
    range.classList.add('is-drag');
    gsap.killTweensOf(pos);
    const move = (ev) => {
      pos.t = tFromEvent(ev);
      place(pos.t);
      const v = toN(pos.t);
      if (v !== n) setN(v, { glide: false });
    };
    move(e);
    const up = () => {
      range.classList.remove('is-drag');
      range.removeEventListener('pointermove', move);
      range.removeEventListener('pointerup', up);
      range.removeEventListener('pointercancel', up);
      gsap.to(pos, { t: toT(n), duration: 0.4, ease: 'expo.out', onUpdate: () => place(pos.t) });
    };
    range.addEventListener('pointermove', move);
    range.addEventListener('pointerup', up);
    range.addEventListener('pointercancel', up);
  });
  knob.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (step) setN(n + step);
    else if (e.key === 'Home') setN(MIN);
    else if (e.key === 'End') setN(MAX);
    else return;
    e.preventDefault();
  });

  presets.forEach((p) => p.addEventListener('click', () => setN(+p.dataset.fleet)));

  const setPick = (id, on) => {
    const p = byId[id];
    if (!p) return;
    on ? sel.add(id) : sel.delete(id);
    p.classList.toggle('is-on', on);
    p.setAttribute('aria-pressed', String(on));
  };
  picks.forEach((p) =>
    p.addEventListener('click', () => {
      setPick(p.dataset.pick, !sel.has(p.dataset.pick));
      compute();
    })
  );

  place(pos.t);
  setN(n, { glide: false });
  compute(false);

  return {
    /** выбрать ровно эти сервисы (для ссылок «Как это работает →») */
    setPicks(ids) {
      Object.keys(byId).forEach((id) => setPick(id, ids.includes(id)));
      compute();
      ids.forEach((id) => this.pulse(id));
    },
    pulse(id) {
      const p = byId[id];
      if (!p) return;
      p.classList.remove('is-pulse');
      void p.offsetWidth;
      p.classList.add('is-pulse');
    },
  };
}
