// Шапка: стекло после начала скролла, прячется при скролле вниз и возвращается при скролле вверх.
// Выпадающее меню «Экосистема» и мобильное меню.
export function initHeader({ lenis }) {
  const hdr = document.getElementById('hdr');
  const burger = hdr.querySelector('.burger');
  const mnav = document.querySelector('.mnav');
  let last = 0;
  let menuOpen = false;

  const onScroll = (y) => {
    hdr.classList.toggle('is-scrolled', y > 40);
    const d = y - last;
    if (Math.abs(d) < 4) return;
    if (y > 240 && d > 0 && !menuOpen && !hdr.matches(':focus-within')) hdr.classList.add('is-hidden');
    else hdr.classList.remove('is-hidden');
    last = y;
  };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  onScroll(scrollY);

  // dropdown: hover on desktop (CSS), click / keyboard for touch and a11y
  hdr.querySelectorAll('.nav__item.has-sub').forEach((item) => {
    const btn = item.querySelector('button');
    const close = () => {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    item.addEventListener('mouseleave', close);
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
    item.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  });

  // mobile menu
  const setMenu = (open) => {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', String(!open));
    hdr.classList.remove('is-hidden');
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!menuOpen));
  mnav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && menuOpen && setMenu(false));
  window.addEventListener('menu:close', () => menuOpen && setMenu(false));
}
