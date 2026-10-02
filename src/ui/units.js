// 03 «Сумма эффективности при выбранных юнитах»: выбор юнитов, стыки соседних сервисов, анимированная сумма.
import { perUnit, MAX_PER_UNIT, TOTAL_SERVICES, neighbours, rub, num } from '../data/economics.js';

export function initUnits({ gsap }) {
  const root = document.querySelector('.scheme');
  if (!root) return null;
  const chips = [...root.querySelectorAll('.unit')];
  const byId = Object.fromEntries(chips.map((c) => [c.dataset.unit, c]));
  const out = (k) => root.querySelector(`[data-out="${k}"]`);
  const sumEl = out('unit-sum');
  const deltaEl = out('unit-delta');
  const metaEl = out('unit-meta');
  const barEl = out('unit-bar');

  const sel = new Set(chips.filter((c) => c.classList.contains('is-on')).map((c) => c.dataset.unit));
  let prev = perUnit(sel);
  const shown = { v: prev.total };
  let hideDelta;

  function render(animate = true) {
    const r = perUnit(sel);
    metaEl.textContent = `в год на одну сцепку · выбрано юнитов: ${r.count} из ${TOTAL_SERVICES} · стыков замкнуто: ${r.closed}`;
    barEl.style.width = `${(r.total / MAX_PER_UNIT) * 100}%`;
    gsap.to(shown, { v: r.total, duration: animate ? 0.9 : 0, ease: 'power3.out', overwrite: true, onUpdate: () => (sumEl.textContent = rub(shown.v)) });

    const diff = r.total - prev.total;
    if (animate && diff) {
      const junction = r.closed > prev.closed ? ' · стык' : '';
      deltaEl.textContent = `${diff > 0 ? '+' : '−'}${num(Math.abs(diff))} ₽${junction}`;
      deltaEl.classList.toggle('is-minus', diff < 0);
      hideDelta?.kill();
      gsap.fromTo(deltaEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out', overwrite: true });
      hideDelta = gsap.to(deltaEl, { opacity: 0, y: -6, duration: 0.5, delay: 1.6, ease: 'power2.in' });
    }
    prev = r;
  }

  function set(id, on) {
    const c = byId[id];
    if (!c) return;
    on ? sel.add(id) : sel.delete(id);
    c.classList.toggle('is-on', on);
    c.setAttribute('aria-pressed', String(on));
  }

  chips.forEach((c) => {
    const id = c.dataset.unit;
    c.addEventListener('click', () => {
      set(id, !sel.has(id));
      render();
    });
    // show which neighbours form a junction with this unit
    const near = (on) => neighbours(id).forEach((n) => byId[n]?.classList.toggle('is-near', on));
    c.addEventListener('pointerenter', () => near(true));
    c.addEventListener('pointerleave', () => near(false));
    c.addEventListener('focus', () => near(true));
    c.addEventListener('blur', () => near(false));
  });

  render(false);
  return { set: (id, on) => (set(id, on), render()) };
}
