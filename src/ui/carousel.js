// Карусели 04 и 10: перетаскивание с инерцией и доводкой к карточке, стрелки, горизонтальный свайп тачпадом.
import { Draggable } from 'gsap/Draggable';

export function initCarousels({ gsap }) {
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const vp = root.querySelector('.carousel__viewport');
    const track = root.querySelector('.carousel__track');
    const items = [...track.children];
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    const bar = root.querySelector('.ctrl__progress i');
    let snaps = [0];
    let minX = 0;
    let idx = 0; // карточка, к которой едем (стрелки работают и во время анимации)
    const syncIdx = () => (idx = snaps.indexOf(nearest(x())));

    const x = () => gsap.getProperty(track, 'x');
    const clamp = (v) => Math.min(0, Math.max(minX, v));
    const nearest = (v) => snaps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), snaps[0]);

    const update = () => {
      const cur = x();
      prev.disabled = cur > -2;
      next.disabled = cur < minX + 2;
      if (bar) {
        const frac = Math.min(1, vp.clientWidth / track.scrollWidth);
        const p = minX ? cur / minX : 1;
        bar.style.transform = `scaleX(${frac + (1 - frac) * p})`;
      }
    };

    const drag = Draggable.create(track, {
      type: 'x',
      inertia: true,
      edgeResistance: 0.88,
      allowNativeTouchScrolling: true,
      zIndexBoost: false,
      cursor: 'grab',
      activeCursor: 'grabbing',
      snap: { x: (v) => nearest(clamp(v)) },
      onDrag: update,
      onThrowUpdate: update,
      onThrowComplete: () => (update(), syncIdx()),
      onDragEnd: () => setTimeout(syncIdx, 0),
    })[0];

    function measure() {
      minX = Math.min(0, vp.clientWidth - track.scrollWidth);
      snaps = [...new Set(items.map((it) => clamp(-it.offsetLeft)))].sort((a, b) => b - a);
      drag.applyBounds({ minX, maxX: 0 });
      gsap.set(track, { x: clamp(x()) });
      drag.update();
      update();
      syncIdx();
    }

    const go = (dir) => {
      idx = Math.min(snaps.length - 1, Math.max(0, idx + dir));
      gsap.to(track, { x: snaps[idx], duration: 0.9, ease: 'expo.out', overwrite: true, onUpdate: update, onComplete: () => drag.update() });
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));

    // trackpad horizontal swipe; vertical wheel keeps scrolling the page
    let settle;
    vp.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 1) return;
        e.preventDefault();
        e.stopPropagation();
        gsap.killTweensOf(track);
        gsap.set(track, { x: clamp(x() - e.deltaX) });
        drag.update();
        update();
        clearTimeout(settle);
        settle = setTimeout(() => {
          syncIdx();
          gsap.to(track, { x: snaps[idx], duration: 0.6, ease: 'expo.out', onUpdate: update, onComplete: () => drag.update() });
        }, 140);
      },
      { passive: false }
    );

    // keyboard: focus a card's link → bring it into view
    items.forEach((it) =>
      it.addEventListener('focusin', () => {
        const target = clamp(-it.offsetLeft);
        idx = snaps.indexOf(nearest(target));
        if (Math.abs(target - x()) > 2) gsap.to(track, { x: target, duration: 0.7, ease: 'expo.out', onUpdate: update, onComplete: () => drag.update() });
        vp.scrollLeft = 0;
      })
    );

    new ResizeObserver(measure).observe(vp);
    measure();
  });
}
