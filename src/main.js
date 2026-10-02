// Лендинг Каргономики. Земля — копия интерактива cargo-earth (src/earth), остальное — страница поверх неё.
import './styles/fonts.css';
import './styles/main.css';
import { lenis, gsap, ScrollTrigger } from './earth/earth.js';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

import { initHeader } from './ui/header.js';
import { initReveal, heroIntro } from './ui/reveal.js';
import { initUnits } from './ui/units.js';
import { initFleet } from './ui/fleet.js';
import { initCarousels } from './ui/carousel.js';
import { initForm } from './ui/form.js';
import { initPointer } from './ui/pointer.js';
import { initAnchors } from './ui/anchors.js';
import { initHeroStrip } from './ui/hero-strip.js';

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.documentElement.classList.add('no-motion');

const ctx = { gsap, ScrollTrigger, lenis, reduce };

initHeader(ctx);
const fleet = initFleet(ctx);
const units = initUnits(ctx);
initCarousels(ctx);
initForm(ctx);
initPointer(ctx);
initHeroStrip(ctx);
initAnchors({ ...ctx, fleet, units });

// split headings into lines only after the web fonts are in, so line breaks are final
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
fontsReady.then(() => {
  initReveal(ctx);
  heroIntro(ctx);
  ScrollTrigger.refresh();
});
// the Earth progress ends at the footer: re-measure once images and fonts have settled
window.addEventListener('load', () => ScrollTrigger.refresh());

// для отладки и автотестов
window.__landing = { lenis, gsap, ScrollTrigger };
