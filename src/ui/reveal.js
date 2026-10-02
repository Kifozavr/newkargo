// Появление блоков при скролле, счётчики, параллакс, «проявление» цитаты по словам, вход в хиро.
import { SplitText } from 'gsap/SplitText';

const EASE = 'expo.out';
const fmt = (v) => Math.round(v).toLocaleString('ru-RU');

function countUp(gsap, el, { delay = 0, duration = 1.8 } = {}) {
  const end = parseFloat(el.dataset.count);
  if (!isFinite(end)) return;
  const o = { v: 0 };
  el.textContent = '0';
  gsap.to(o, { v: end, duration, delay, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) });
}

export function initReveal({ gsap, ScrollTrigger, reduce }) {
  if (reduce) {
    gsap.set('[data-fade], [data-rise], [data-stagger] > *', { opacity: 1 });
    return;
  }

  // headings: lines slide up from under a mask
  document.querySelectorAll('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.15,
          ease: EASE,
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    });
  });

  // paragraphs: soft focus-in
  gsap.utils.toArray('[data-fade]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: EASE, delay: 0.1, clearProps: 'filter', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
    );
  });

  // big panels: rise + slight scale
  gsap.utils.toArray('[data-rise]').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 70, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: EASE, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  // card grids: items that enter together animate together, staggered
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    const items = [...group.children];
    gsap.set(items, { opacity: 0, y: 56 });
    ScrollTrigger.batch(items, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.15, ease: EASE, stagger: 0.08, overwrite: true }),
    });
  });

  // numbers outside the hero count up when they come into view
  gsap.utils.toArray('[data-count]').forEach((el) => {
    if (el.closest('.hero')) return;
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(gsap, el, { delay: 0.15 }) });
  });

  // 05: the card opens up from a smaller window, the trucks drift slower than the page
  const how = document.querySelector('[data-expand]');
  if (how) {
    gsap.fromTo(how, { clipPath: 'inset(7% 5% 7% 5% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 8px)', ease: 'none', scrollTrigger: { trigger: how, start: 'top 95%', end: 'top 30%', scrub: true } });
    const img = how.querySelector('.how__media img');
    if (img) gsap.fromTo(img, { yPercent: -4 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: how, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // 09: textures move inside their cards
  gsap.utils.toArray('.pr').forEach((card) => {
    gsap.fromTo(card, { '--py': '-28px' }, { '--py': '28px', ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // 08: the quote lights up word by word while it scrolls through the screen
  const quote = document.querySelector('[data-words]');
  if (quote) {
    const split = SplitText.create(quote, { type: 'words', wordsClass: 'w' });
    gsap.to(split.words, { opacity: 1, ease: 'none', stagger: 0.06, scrollTrigger: { trigger: quote, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
  }

  // hero copy drifts up and fades as the Earth starts to recede
  gsap.to('.hero__copy', { yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
}

/** First screen: wait for the Earth's first frame, then bring in the headline, the button and the stats. */
export function heroIntro({ gsap, reduce }) {
  const run = () => {
    const counters = [...document.querySelectorAll('.hero [data-count]')];
    if (reduce) {
      gsap.set('.hero__txt, .hero-cta, .live, .stats', { opacity: 1 });
      return;
    }
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo('.hero__txt', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.5, ease: EASE, stagger: 0.12 })
      .fromTo('.hero-cta', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, ease: EASE }, '-=1.05')
      .fromTo('.stats', { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 1.3, ease: EASE, onStart: () => counters.forEach((el, i) => countUp(gsap, el, { delay: 0.1 + i * 0.06, duration: 2 })) }, '-=0.85')
      .fromTo('.live', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, ease: EASE }, '-=0.7');
  };
  const t0 = performance.now();
  const wait = () => (window.__earth?.ready || performance.now() - t0 > 2200 ? run() : requestAnimationFrame(wait));
  wait();
}
