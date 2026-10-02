// Модель выгоды для двух калькуляторов страницы.
// ВНИМАНИЕ: цифры — заглушки прототипа. Они подобраны так, чтобы стартовые состояния
// совпадали с макетом в Фигме:
//   • «Сумма эффективности» (блок 03): Топливо + Торговый дом → 96 000 ₽, стыков 1;
//   • «Посчитайте эффективность» (блок 07): 25 тягачей, все 9 сервисов →
//     10 625 000 ₽, на тягач 425 000 ₽, на стыках 3 350 000 ₽, стыков 9 / 9.
// Замените значения реальными — разметка и анимации пересчитаются сами.

export const SERVICES = [
  // id, название, выгода на одну сцепку (тягач) в год, ₽
  { id: 'fuel', name: 'Топливо', value: 42000 },
  { id: 'trade', name: 'Торговый дом', value: 36000 },
  { id: 'leasing', name: 'Лизинг', value: 58000 },
  { id: 'rent', name: 'Аренда', value: 22000 },
  { id: 'insurance', name: 'Страхование', value: 31000 },
  { id: 'monitoring', name: 'Мониторинг', value: 19000 },
  { id: 'logistics', name: 'Логистика', value: 38000 },
  { id: 'cargo', name: 'Грузы', value: 27000 },
  { id: 'market', name: 'Маркет', value: 18000 },
];

// «Соседние сервисы дают дополнительную выгоду на стыке».
// Сервисы стоят в кольце экосистемы; стык замыкается, когда выбраны оба соседа.
// Порядок в массиве = порядок по кольцу (последний соседствует с первым).
export const RING = ['fuel', 'trade', 'leasing', 'rent', 'insurance', 'monitoring', 'logistics', 'cargo', 'market'];
export const JUNCTION_VALUE = {
  'fuel|trade': 18000,
  'trade|leasing': 16000,
  'leasing|rent': 12000,
  'rent|insurance': 13000,
  'insurance|monitoring': 14000,
  'monitoring|logistics': 17000,
  'logistics|cargo': 16000,
  'cargo|market': 12000,
  'market|fuel': 16000,
};

const byId = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

export function neighbours(id) {
  const i = RING.indexOf(id);
  if (i < 0) return [];
  return [RING[(i + RING.length - 1) % RING.length], RING[(i + 1) % RING.length]];
}

/** Выгода на одну сцепку в год для набора выбранных сервисов. */
export function perUnit(selected) {
  const set = new Set(selected);
  let base = 0;
  for (const id of set) base += byId[id]?.value || 0;
  let junctions = 0;
  let closed = 0;
  for (let i = 0; i < RING.length; i++) {
    const a = RING[i];
    const b = RING[(i + 1) % RING.length];
    if (set.has(a) && set.has(b)) {
      junctions += JUNCTION_VALUE[`${a}|${b}`] || 0;
      closed++;
    }
  }
  return { base, junctions, total: base + junctions, closed, count: set.size };
}

/** Максимум на одну сцепку — все сервисы и все стыки. */
export const MAX_PER_UNIT = perUnit(RING).total;
export const TOTAL_SERVICES = SERVICES.length;
export const TOTAL_JUNCTIONS = RING.length;

export const rub = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
export const num = (n) => Math.round(n).toLocaleString('ru-RU');
