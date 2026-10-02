// Deterministic mock of ~6000 cargo points over Russia's logistics network.
// Replace with real API data via loadMarkers({ url }).

const HUBS = {
  moscow: ['Москва', 55.756, 37.617, 18],
  spb: ['Санкт-Петербург', 59.939, 30.316, 4.5],
  tver: ['Тверь', 56.859, 35.912, 1.2],
  yaroslavl: ['Ярославль', 57.627, 39.894, 1.5],
  vologda: ['Вологда', 59.22, 39.891, 1],
  arkhangelsk: ['Архангельск', 64.539, 40.516, 1],
  murmansk: ['Мурманск', 68.97, 33.075, 1],
  petrozavodsk: ['Петрозаводск', 61.785, 34.346, 0.8],
  nnovgorod: ['Нижний Новгород', 56.327, 44.006, 3],
  kazan: ['Казань', 55.796, 49.106, 3],
  kirov: ['Киров', 58.603, 49.668, 1],
  perm: ['Пермь', 58.01, 56.229, 2],
  ekb: ['Екатеринбург', 56.838, 60.597, 4],
  chelyabinsk: ['Челябинск', 55.16, 61.403, 2.5],
  ufa: ['Уфа', 54.735, 55.958, 2],
  samara: ['Самара', 53.195, 50.1, 2.5],
  orenburg: ['Оренбург', 51.768, 55.097, 1.2],
  penza: ['Пенза', 53.195, 45.018, 1],
  ryazan: ['Рязань', 54.629, 39.736, 1.2],
  tula: ['Тула', 54.193, 37.617, 1.5],
  voronezh: ['Воронеж', 51.672, 39.184, 2],
  belgorod: ['Белгород', 50.595, 36.587, 1.2],
  bryansk: ['Брянск', 53.243, 34.364, 1],
  smolensk: ['Смоленск', 54.782, 32.045, 1],
  rostov: ['Ростов-на-Дону', 47.235, 39.701, 3],
  krasnodar: ['Краснодар', 45.035, 38.975, 3],
  novorossiysk: ['Новороссийск', 44.723, 37.769, 1.5],
  sochi: ['Сочи', 43.585, 39.723, 1.2],
  stavropol: ['Ставрополь', 45.044, 41.969, 1],
  makhachkala: ['Махачкала', 42.983, 47.504, 1],
  volgograd: ['Волгоград', 48.708, 44.514, 2],
  saratov: ['Саратов', 51.533, 46.034, 1.5],
  astrakhan: ['Астрахань', 46.347, 48.034, 1],
  tyumen: ['Тюмень', 57.153, 65.534, 1.5],
  surgut: ['Сургут', 61.254, 73.396, 1.2],
  omsk: ['Омск', 54.989, 73.368, 2.5],
  novosibirsk: ['Новосибирск', 55.008, 82.935, 4],
  tomsk: ['Томск', 56.484, 84.948, 1.2],
  barnaul: ['Барнаул', 53.348, 83.779, 1.3],
  kemerovo: ['Кемерово', 55.354, 86.088, 1.2],
  novokuznetsk: ['Новокузнецк', 53.757, 87.136, 1.2],
  krasnoyarsk: ['Красноярск', 56.01, 92.852, 2.5],
  irkutsk: ['Иркутск', 52.287, 104.305, 2.2],
  ulanude: ['Улан-Удэ', 51.834, 107.584, 1.2],
  chita: ['Чита', 52.034, 113.499, 1],
  blagoveshchensk: ['Благовещенск', 50.29, 127.527, 0.8],
  khabarovsk: ['Хабаровск', 48.48, 135.072, 2],
  vladivostok: ['Владивосток', 43.115, 131.885, 2.5],
  yakutsk: ['Якутск', 62.028, 129.732, 0.8],
  kaliningrad: ['Калининград', 54.71, 20.452, 1.2],
};

const ROUTES = [
  ['moscow', 'tver', 'spb'],
  ['spb', 'petrozavodsk', 'murmansk'],
  ['moscow', 'yaroslavl', 'vologda', 'arkhangelsk'],
  ['spb', 'vologda'],
  ['moscow', 'nnovgorod', 'kazan', 'ekb'],
  ['nnovgorod', 'kirov', 'perm', 'ekb'],
  ['kazan', 'ufa', 'chelyabinsk'],
  ['moscow', 'ryazan', 'penza', 'samara', 'ufa'],
  ['samara', 'orenburg'],
  ['ekb', 'tyumen', 'omsk', 'novosibirsk', 'krasnoyarsk', 'irkutsk', 'ulanude', 'chita'],
  ['chita', 'blagoveshchensk', 'khabarovsk', 'vladivostok'],
  ['chelyabinsk', 'omsk'],
  ['tyumen', 'surgut'],
  ['novosibirsk', 'barnaul'],
  ['novosibirsk', 'tomsk'],
  ['novosibirsk', 'kemerovo', 'novokuznetsk'],
  ['moscow', 'tula', 'voronezh', 'rostov', 'krasnodar', 'novorossiysk'],
  ['krasnodar', 'sochi'],
  ['rostov', 'stavropol', 'makhachkala'],
  ['tula', 'belgorod'],
  ['moscow', 'bryansk'],
  ['moscow', 'smolensk'],
  ['voronezh', 'saratov', 'samara'],
  ['saratov', 'volgograd', 'astrakhan'],
  ['volgograd', 'rostov'],
  ['khabarovsk', 'yakutsk'],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const D2R = Math.PI / 180;
const toVec = (lat, lon) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)];
const toLatLon = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [Math.asin(y / l) / D2R, Math.atan2(x, z) / D2R];
};

function slerp(a, b, t) {
  const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(d);
  if (om < 1e-6) return a.slice();
  const s = Math.sin(om);
  const k0 = Math.sin((1 - t) * om) / s;
  const k1 = Math.sin(t * om) / s;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

export function generateMockCargo(total = 6000, seed = 7) {
  const rnd = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out = [];
  const push = (lat, lon, hub, weight) => {
    out.push({ id: out.length + 1, lat: +lat.toFixed(5), lon: +lon.toFixed(5), weight: +weight.toFixed(3), name: hub });
  };

  const hubKeys = Object.keys(HUBS);
  const wsum = hubKeys.reduce((s, k) => s + HUBS[k][3], 0);

  // 1) city clusters (dense, bright cores) — 34%
  const nCity = Math.round(total * 0.34);
  for (const k of hubKeys) {
    const [name, lat, lon, w] = HUBS[k];
    const n = Math.round((nCity * w) / wsum);
    const spread = 0.05 + 0.07 * Math.sqrt(w);
    for (let i = 0; i < n; i++) {
      const r = Math.abs(gauss()) * spread * (rnd() < 0.2 ? 2.5 : rnd() < 0.5 ? 0.45 : 1);
      const a = rnd() * Math.PI * 2;
      push(lat + Math.sin(a) * r, lon + (Math.cos(a) * r) / Math.cos(lat * D2R), name, 0.6 + 0.4 * rnd() + (r < spread * 0.4 ? 0.4 : 0));
    }
  }

  // 2) corridors — 60%
  const segs = [];
  for (const route of ROUTES) for (let i = 0; i < route.length - 1; i++) segs.push([route[i], route[i + 1]]);
  const segLen = segs.map(([a, b]) => {
    const A = toVec(HUBS[a][1], HUBS[a][2]);
    const B = toVec(HUBS[b][1], HUBS[b][2]);
    return Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  });
  const lsum = segLen.reduce((s, v) => s + v, 0);
  const nRoute = Math.round(total * 0.6);
  segs.forEach(([a, b], si) => {
    const A = toVec(HUBS[a][1], HUBS[a][2]);
    const B = toVec(HUBS[b][1], HUBS[b][2]);
    const n = Math.round((nRoute * segLen[si]) / lsum);
    const wig = 0.15 + rnd() * 0.35; // degrees of meander
    const f1 = 2 + rnd() * 3;
    const f2 = 5 + rnd() * 6;
    const ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
      // stations cluster along the corridor
      let t = rnd();
      if (rnd() < 0.3) t = Math.round(t * 18) / 18 + gauss() * 0.006;
      t = Math.min(1, Math.max(0, t));
      const P = slerp(A, B, t);
      let [lat, lon] = toLatLon(P);
      const env = Math.sin(Math.PI * t);
      const off = env * (Math.sin(t * f1 * 6.28 + ph) * wig + Math.sin(t * f2 * 6.28 + ph * 2) * wig * 0.35) + gauss() * 0.025;
      // offset perpendicular-ish to the route (latitude mostly for E-W routes)
      const dLat = HUBS[b][1] - HUBS[a][1];
      const dLon = (HUBS[b][2] - HUBS[a][2]) * Math.cos(lat * D2R);
      const len = Math.hypot(dLat, dLon) || 1;
      lat += (dLon / len) * off;
      lon += ((-dLat / len) * off) / Math.cos(lat * D2R);
      push(lat, lon, `${HUBS[a][0]} — ${HUBS[b][0]}`, 0.35 + 0.45 * rnd());
    }
  });

  // 3) scattered settlements near corridors — rest
  while (out.length < total) {
    const si = Math.floor(rnd() * segs.length);
    const [a, b] = segs[si];
    const P = slerp(toVec(HUBS[a][1], HUBS[a][2]), toVec(HUBS[b][1], HUBS[b][2]), rnd());
    const [lat0, lon0] = toLatLon(P);
    const clat = lat0 + gauss() * 0.9;
    const clon = lon0 + (gauss() * 1.3) / Math.cos(lat0 * D2R);
    const k = 1 + Math.floor(rnd() * 4);
    for (let i = 0; i < k && out.length < total; i++) {
      push(clat + gauss() * 0.03, clon + gauss() * 0.05, HUBS[a][0], 0.15 + 0.3 * rnd());
    }
  }
  return out.slice(0, total);
}
