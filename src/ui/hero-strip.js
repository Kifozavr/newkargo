// Первый экран: при наведении на сцепку (точку на Земле) нижняя плашка показывает данные этой сцепки
// (макет «Главный экран с информацией по наведению на конкретную сцепку»).
// Пока плашка открыта, сцепка «едет»: слева пройденные метры растут, справа оставшиеся уменьшаются,
// полоса внизу ползёт вправо. Интерактив Земли не меняется: наведение читается из его карточки #tip.

// Wagnermaier и Helfimmer выпадают чаще остальных: вместе ≈ 70 % наведений
const MODEL_WEIGHTS = [
  ['Wagnermaier', 35],
  ['Helfimmer', 35],
  ['Mercedes-Benz Actros', 4], ['Volvo FH', 3], ['Scania R 450', 3], ['MAN TGX', 3], ['DAF XF', 3], ['KAMAZ 54901', 3],
  ['Sitrak C7H', 2], ['Shacman X6000', 2], ['FAW J7', 2], ['Renault T', 2], ['Iveco S-Way', 1], ['Howo TX', 1], ['Mercedes-Benz Arocs', 1],
];
const WEIGHT_SUM = MODEL_WEIGHTS.reduce((a, [, w]) => a + w, 0);
const pickModel = (u) => {
  let x = u * WEIGHT_SUM;
  for (const [name, w] of MODEL_WEIGHTS) if ((x -= w) < 0) return name;
  return MODEL_WEIGHTS[0][0];
};

// узлы грузовой сети (широта, долгота)
const CITIES = [
  ['Калининград', 54.71, 20.51], ['Санкт-Петербург', 59.94, 30.31], ['Мурманск', 68.97, 33.07], ['Новороссийск', 44.72, 37.77],
  ['Москва', 55.75, 37.62], ['Краснодар', 45.04, 38.98], ['Воронеж', 51.66, 39.2], ['Ростов-на-Дону', 47.23, 39.72],
  ['Архангельск', 64.54, 40.54], ['Нижний Новгород', 56.33, 44.0], ['Волгоград', 48.71, 44.51], ['Астрахань', 46.35, 48.04],
  ['Казань', 55.79, 49.11], ['Самара', 53.2, 50.15], ['Уфа', 54.74, 55.97], ['Пермь', 58.01, 56.25], ['Екатеринбург', 56.84, 60.6],
  ['Челябинск', 55.16, 61.4], ['Тюмень', 57.15, 65.53], ['Омск', 54.99, 73.37], ['Новосибирск', 55.03, 82.92],
  ['Барнаул', 53.35, 83.78], ['Кемерово', 55.35, 86.09], ['Красноярск', 56.01, 92.87], ['Иркутск', 52.29, 104.3],
  ['Улан-Удэ', 51.83, 107.6], ['Чита', 52.03, 113.5], ['Благовещенск', 50.27, 127.53], ['Хабаровск', 48.48, 135.08],
  ['Владивосток', 43.12, 131.89], ['Якутск', 62.03, 129.73],
];

const ROAD = 1.22; // дорога длиннее прямой
const CRAWL = 0.0008; // доля маршрута в секунду: полоса ползёт ≈ 1 px/с

const fmt = (v) => Math.round(v).toLocaleString('ru-RU');
const D2R = Math.PI / 180;
function haversineKm(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * D2R;
  const dLon = (bLon - aLon) * D2R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * D2R) * Math.cos(bLat * D2R) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Маршрут и модель сцепки. Поля из API (model, from, to, traveled, remaining — метры) имеют приоритет. */
function describe(pt, index) {
  const r = rng((pt.coupling || 0) * 7919 + index * 31 + 17);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const near = (list) => list.map((c) => ({ c, d: haversineKm(pt.lat, pt.lon, c[1], c[2]) })).sort((a, b) => a.d - b.d);
  const west = near(CITIES.filter((c) => c[2] < pt.lon - 1.5)).slice(0, 6);
  const east = near(CITIES.filter((c) => c[2] > pt.lon + 1.5)).slice(0, 6);
  let a = west.length ? pick(west).c : null;
  let b = east.length ? pick(east).c : null;
  if (!a || !b) {
    const all = near(CITIES);
    a = a || all[1 + Math.floor(r() * 3)].c;
    b = b || all[4 + Math.floor(r() * 4)].c;
  }
  const [from, to] = r() < 0.6 ? [a, b] : [b, a]; // чаще едут на восток
  const traveled = pt.traveled ?? haversineKm(from[1], from[2], pt.lat, pt.lon) * ROAD * 1000 + r() * 900;
  const remaining = pt.remaining ?? haversineKm(pt.lat, pt.lon, to[1], to[2]) * ROAD * 1000 + r() * 900;
  return {
    coupling: pt.coupling,
    model: pt.model || pickModel(r()),
    load: pt.load,
    mileage: pt.mileage,
    efficiency: pt.efficiency,
    from: pt.from || from[0],
    to: pt.to || to[0],
    traveled,
    total: traveled + remaining,
  };
}

export function initHeroStrip({ gsap, reduce }) {
  const strip = document.querySelector('.stats');
  const tip = document.getElementById('tip');
  const hero = document.querySelector('.hero');
  if (!strip || !tip || !hero) return;
  const $ = (k) => strip.querySelector(`[data-u="${k}"]`);
  const el = { coupling: $('coupling'), model: $('model'), load: $('load'), mileage: $('mileage'), efficiency: $('efficiency'), from: $('from'), to: $('to'), traveled: $('traveled'), remaining: $('remaining'), bar: $('bar') };
  const root = document.documentElement;

  const cache = new Map(); // index → описание (маршрут продолжается с того же места)
  const shown = { load: 0, mileage: 0, efficiency: 0 };
  let current = -1;
  let info = null;
  let leaveTimer = 0;
  let raf = 0;
  let last = 0;
  let barTween = null;

  // «первый экран»: верх страницы, пока хиро занимает бóльшую часть окна
  let inHero = true;
  const checkHero = () => {
    const was = inHero;
    inHero = scrollY < hero.offsetHeight * 0.45;
    root.classList.toggle('hero-zone', inHero);
    if (was && !inHero) showBase();
  };
  addEventListener('scroll', checkHero, { passive: true });
  checkHero();

  const paintRoute = () => {
    const left = Math.min(info.total, info.traveled);
    el.traveled.textContent = fmt(left);
    el.remaining.textContent = fmt(info.total - left);
  };
  const tick = (t) => {
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    if (info) {
      info.traveled = Math.min(info.total, info.traveled + info.total * CRAWL * dt);
      paintRoute();
      if (!barTween?.isActive()) el.bar.style.width = `${(info.traveled / info.total) * 100}%`;
    }
    raf = requestAnimationFrame(tick);
  };

  function show(i) {
    clearTimeout(leaveTimer);
    if (i === current) return;
    const pt = window.__earth?.globe?.points?.[i];
    if (!pt) return;
    const first = current < 0;
    current = i;
    if (!cache.has(i)) cache.set(i, describe(pt, i));
    info = cache.get(i);

    el.coupling.textContent = `Сцепка #${info.coupling}`;
    el.model.textContent = info.model;
    el.from.textContent = info.from;
    el.to.textContent = info.to;
    paintRoute();
    // цифры перетекают от прошлой сцепки к новой
    gsap.to(shown, {
      load: info.load, mileage: info.mileage, efficiency: info.efficiency,
      duration: reduce || first ? 0 : 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => {
        el.load.textContent = Math.round(shown.load);
        el.mileage.textContent = Math.round(shown.mileage);
        el.efficiency.textContent = Math.round(shown.efficiency);
      },
    });
    if (!reduce) {
      gsap.fromTo([el.model, el.coupling], { y: 14, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out', stagger: 0.04, overwrite: true });
      barTween = gsap.fromTo(el.bar, { width: first ? '0%' : el.bar.style.width || '0%' }, { width: `${(info.traveled / info.total) * 100}%`, duration: 0.9, ease: 'expo.out' });
    }
    strip.dataset.mode = 'unit';
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function showBase() {
    clearTimeout(leaveTimer);
    current = -1;
    strip.dataset.mode = 'base';
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // наведение читаем из карточки интерактива: класс on + data-index
  const sync = () => {
    const on = tip.classList.contains('on');
    const i = Number(tip.dataset.index);
    if (on && inHero && Number.isInteger(i) && i >= 0) show(i);
    else if (current >= 0) {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(showBase, 1200); // карточка задерживается, чтобы её успели прочитать
    }
  };
  new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['class', 'data-index'] });
}
