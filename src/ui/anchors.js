// Плавный переход по якорям + связи между блоками:
//  • карточки сервисов и пункты «Экосистема» → калькулятор / подсветка сервиса;
//  • «Как это работает →» с набором сервисов → калькулятор с этим набором.
export function initAnchors({ lenis, fleet }) {
  const flashService = (id) => {
    const card = document.querySelector(`.svc[data-service="${id}"]`);
    if (!card) return;
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 1800);
  };

  document.querySelectorAll('a[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      const target = hash === '#top' ? 0 : document.querySelector(hash);
      if (target === null) return;
      e.preventDefault();
      window.dispatchEvent(new Event('menu:close'));

      const service = a.dataset.service;
      const preset = a.dataset.preset;
      const after = () => {
        if (preset && fleet) fleet.setPicks(preset.split(','));
        else if (service && hash === '#calc' && fleet) fleet.pulse(service);
        else if (service && hash === '#system') flashService(service);
      };

      const offset = hash === '#calc' || hash === '#system' ? -24 : 0;
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: after });
      else {
        (target === 0 ? document.body : target).scrollIntoView({ behavior: 'smooth' });
        setTimeout(after, 900);
      }
    });
  });
}
