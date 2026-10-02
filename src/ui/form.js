// 11 «Форма заявки»: маска телефона, проверка полей, загрузка и экран «Заявка отправлена» (без реальной отправки).
export function initForm({ gsap, reduce }) {
  const form = document.querySelector('.form');
  if (!form) return;
  const body = form.querySelector('.form__body');
  const done = form.querySelector('.form__done');
  const name = form.elements.name;
  const phone = form.elements.phone;
  const agree = form.elements.agree;
  const submit = form.querySelector('.submit');
  const checkErr = form.querySelector('.field__err--check');

  const digits = (v) => v.replace(/\D/g, '');
  function formatPhone(v) {
    let d = digits(v);
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let s = '+7';
    if (p.length) s += ' (' + p.slice(0, 3);
    if (p.length >= 3) s += ')';
    if (p.length > 3) s += ' ' + p.slice(3, 6);
    if (p.length > 6) s += '-' + p.slice(6, 8);
    if (p.length > 8) s += '-' + p.slice(8, 10);
    return s;
  }
  phone.addEventListener('input', () => {
    phone.value = formatPhone(phone.value);
    if (phone.closest('.field').classList.contains('is-error')) check(phone);
  });
  phone.addEventListener('focus', () => !phone.value && (phone.value = '+7 ('));
  phone.addEventListener('blur', () => digits(phone.value).length <= 1 && (phone.value = ''));

  const rules = {
    name: () => (name.value.trim().length >= 2 ? '' : 'Введите имя'),
    phone: () => (digits(phone.value).length === 11 ? '' : 'Введите номер полностью'),
  };
  function check(input) {
    const field = input.closest('.field');
    const msg = rules[input.name]();
    field.classList.toggle('is-error', !!msg);
    field.classList.toggle('is-ok', !msg);
    field.querySelector('.field__err').textContent = msg;
    return !msg;
  }
  [name, phone].forEach((i) => {
    i.addEventListener('blur', () => i.value && check(i));
    i.addEventListener('input', () => i.closest('.field').classList.contains('is-error') && check(i));
  });
  const checkAgree = () => {
    const ok = agree.checked;
    agree.closest('.check').classList.toggle('is-error', !ok);
    checkErr.textContent = ok ? '' : 'Нужно согласие на обработку данных';
    checkErr.classList.toggle('is-shown', !ok);
    return ok;
  };
  agree.addEventListener('change', () => checkErr.classList.contains('is-shown') && checkAgree());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submit.classList.contains('is-loading')) return;
    const ok = [check(name), check(phone), checkAgree()];
    if (ok.includes(false)) {
      const first = [name, phone, agree][ok.indexOf(false)];
      first.focus({ preventScroll: true });
      if (!reduce) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.45, ease: 'power2.out' });
      return;
    }
    submit.classList.add('is-loading');
    submit.disabled = true;
    setTimeout(() => {
      const h0 = form.offsetHeight;
      body.hidden = true;
      done.hidden = false;
      const h1 = form.offsetHeight;
      gsap.fromTo(form, { height: h0 }, { height: h1, duration: 0.7, ease: 'expo.out', clearProps: 'height' });
      gsap.fromTo(done.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07 });
      requestAnimationFrame(() => done.classList.add('is-in'));
    }, 1100);
  });

  form.querySelector('.form__again').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('.is-error, .is-ok').forEach((el) => el.classList.remove('is-error', 'is-ok'));
    submit.classList.remove('is-loading');
    submit.disabled = false;
    const h0 = form.offsetHeight;
    done.hidden = true;
    done.classList.remove('is-in');
    body.hidden = false;
    gsap.fromTo(form, { height: h0 }, { height: form.offsetHeight, duration: 0.6, ease: 'expo.out', clearProps: 'height' });
    gsap.fromTo(body.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04 });
  });
}
