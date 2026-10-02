import { generateMockCargo } from './mockCargo.js';

/**
 * Loads marker points. Accepted payloads (array or { points: [...] }):
 *   { id?, lat, lon, weight?, name?, coupling?, load?, mileage?, efficiency? }
 *   { latitude, longitude, ... }
 *   [lat, lon] | [lat, lon, weight]
 * Falls back to mock data when no URL is given or the request fails.
 */
export async function loadMarkers({ url, signal } = {}) {
  if (url) {
    try {
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.points || json.data || json.items || [];
      const parsed = normalize(list);
      if (parsed.length) return { points: withCargoStats(parsed), source: 'api' };
      console.warn('[earth] API returned no points, using mock data');
    } catch (err) {
      console.warn('[earth] API failed, using mock data:', err.message);
    }
  }
  return { points: withCargoStats(generateMockCargo(6000)), source: 'mock' };
}

export function normalize(list) {
  const out = [];
  list.forEach((it, i) => {
    let lat;
    let lon;
    let weight = 1;
    let id = i + 1;
    let name = '';
    let extra = {};
    if (Array.isArray(it)) {
      [lat, lon, weight = 1] = it;
    } else if (it && typeof it === 'object') {
      lat = it.lat ?? it.latitude;
      lon = it.lon ?? it.lng ?? it.longitude;
      weight = it.weight ?? it.value ?? 1;
      id = it.id ?? id;
      name = it.name ?? it.title ?? '';
      extra = {
        coupling: it.coupling ?? it.hitch ?? it.number,
        load: it.load ?? it.loadT,
        mileage: it.mileage ?? it.mileagePerDay ?? it.kmPerDay,
        efficiency: it.efficiency ?? it.rubPerKm,
      };
    }
    lat = Number(lat);
    lon = Number(lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) out.push({ id, lat, lon, weight: Number(weight) || 1, name, ...extra });
  });
  return out;
}

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const num = (v) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Hover-card fields of a coupling (сцепка). Values from the API win; anything missing is filled with
 * demo values once per load, so a point shows the same numbers every time it is hovered.
 *   coupling   — номер сцепки, 0…14000
 *   load       — загрузка, т (XX)
 *   mileage    — пробег в сутки, км (XXX)
 *   efficiency — эффективность, ₽/км (XXXX)
 */
export function withCargoStats(points) {
  for (const p of points) {
    p.coupling = num(p.coupling) ?? randInt(0, 14000);
    p.load = num(p.load) ?? randInt(12, 44);
    p.mileage = num(p.mileage) ?? randInt(320, 980);
    p.efficiency = num(p.efficiency) ?? randInt(1100, 4900);
  }
  return points;
}
