'use strict';

const LOAD_AT      = Date.now();
const MIN_FILL_MS  = 2500;
const EJS_KEY      = 'snAKDj3jg8ZKWcxY_';
const EJS_SVC      = 'service_bm9h6wp';
const EJS_TPL      = 'template_v5hjt9o';

document.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  initTheme();
  initHeader();
  initDrawer();
  initFloatBtn();
  initReveal();
  initPickers();
  initGallery();
  initForm();
});

/* ── EmailJS ─────────────────────────────────────────────────── */
function initEmailJS() {
  if (window.emailjs) emailjs.init(EJS_KEY);
}

/* ── Theme ───────────────────────────────────────────────────── */
function initTheme() {
  const cb = document.getElementById('dm');
  if (!cb) return;
  const stored = localStorage.getItem('flTheme');
  const dark   = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) { document.body.classList.add('dark'); cb.checked = true; }
  cb.addEventListener('change', () => {
    document.body.classList.toggle('dark', cb.checked);
    localStorage.setItem('flTheme', cb.checked ? 'dark' : 'light');
  });
}

/* ── Sticky Header ───────────────────────────────────────────── */
function initHeader() {
  const h = document.getElementById('hdr');
  if (!h) return;
  const fn = () => h.classList.toggle('scrolled', window.scrollY > 16);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

/* ── Mobile Drawer ───────────────────────────────────────────── */
function initDrawer() {
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const drover = document.getElementById('drover');
  const close  = document.getElementById('drawer-close');
  if (!burger || !drawer) return;

  const open = () => {
    drawer.classList.add('open');
    drover.classList.add('on');
    drawer.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    burger.classList.add('open');
  };
  const shut = () => {
    drawer.classList.remove('open');
    drover.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    burger.classList.remove('open');
  };

  burger.addEventListener('click', () => drawer.classList.contains('open') ? shut() : open());
  drover.addEventListener('click', shut);
  close?.addEventListener('click', shut);
  drawer.querySelectorAll('.d-link').forEach(l => l.addEventListener('click', shut));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
}

/* ── Floating CTA ────────────────────────────────────────────── */
function initFloatBtn() {
  const btn  = document.getElementById('fbtn');
  const hero = document.querySelector('.hero');
  if (!btn || !hero) return;
  new IntersectionObserver(
    ([e]) => btn.classList.toggle('on', !e.isIntersecting),
    { threshold: 0.08 }
  ).observe(hero);
}

/* ── Scroll Reveal ───────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  els.forEach(el => io.observe(el));
}

/* ── Flatpickr ───────────────────────────────────────────────── */
function initPickers() {
  if (typeof flatpickr === 'undefined') { setTimeout(initPickers, 250); return; }
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate  = new Date(); maxDate.setDate(maxDate.getDate() + 90);

  const de = document.getElementById('fdate');
  if (de) flatpickr(de, {
    minDate: tomorrow, maxDate,
    dateFormat: 'D, d M Y',
    disableMobile: false,
    disable: [d => d.getDay() === 0],
  });

  const te = document.getElementById('ftime');
  if (te) flatpickr(te, {
    enableTime: true, noCalendar: true,
    dateFormat: 'h:i K',
    minTime: '10:00', maxTime: '19:00',
    minuteIncrement: 30,
    disableMobile: false,
  });
}

/* ── Gallery + Lightbox ──────────────────────────────────────── */
function initGallery() {
  const grid  = document.getElementById('gal');
  const lbox  = document.getElementById('lbox');
  const limg  = document.getElementById('lb-img');
  const lp    = document.getElementById('lb-p');
  const ln    = document.getElementById('lb-n');
  const lx    = document.getElementById('lb-x');
  const dots  = document.getElementById('lb-dots');
  if (!grid || !lbox || !limg) return;

  const items = Array.from(grid.querySelectorAll('.g-item'));
  const imgs  = items.map(el => el.querySelector('img'));
  let cur = 0, touchX = 0;

  /* Build dot indicators */
  if (dots) {
    imgs.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'lb-dot' + (i === 0 ? ' act' : '');
      dots.appendChild(d);
    });
  }

  function updateDots() {
    if (!dots) return;
    dots.querySelectorAll('.lb-dot').forEach((d, i) =>
      d.classList.toggle('act', i === cur)
    );
  }

  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    limg.src = imgs[cur].src;
    limg.alt = imgs[cur].alt;
    updateDots();
    lbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }
  function hide() {
    lbox.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  items.forEach(el => el.addEventListener('click', () => show(+el.dataset.i)));
  lx?.addEventListener('click', hide);
  lp?.addEventListener('click', () => show(cur - 1));
  ln?.addEventListener('click', () => show(cur + 1));
  lbox.addEventListener('click', e => { if (e.target === lbox) hide(); });

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (lbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     hide();
    if (e.key === 'ArrowLeft')  show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  /* Touch swipe on lightbox */
  lbox.addEventListener('touchstart', e => {
    touchX = e.touches[0].clientX;
  }, { passive: true });
  lbox.addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) show(cur + (diff > 0 ? 1 : -1));
  }, { passive: true });
}

/* ── Booking Form ────────────────────────────────────────────── */
function initForm() {
  const form   = document.getElementById('bform');
  const status = document.getElementById('fstatus');
  const sbtn   = document.getElementById('sbtn');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    /* Bot checks */
    if (form.querySelector('input[name="_h"]')?.value) return;
    if (Date.now() - LOAD_AT < MIN_FILL_MS) {
      setStatus('Please take a moment to fill the form carefully 🌸', 'info');
      return;
    }

    const name = val('from_name'), phone = val('phone'),
          date = val('fdate'),    time  = val('ftime');
    if (!name || !phone || !date || !time) {
      setStatus('Please fill in Name, Phone, Date and Time 💕', 'err');
      return;
    }

    setLoad(true);

    const payload = {
      from_name: name, phone,
      instagram: '',
      email: '',
      date, time,
      service: val('service') || 'Custom Design',
      message: val('msg'),
    };

    let ok = false;

    /* 1. Vercel API */
    try {
      const r = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (r.ok) ok = true;
    } catch (_) {}

    /* 2. EmailJS fallback */
    if (!ok && window.emailjs) {
      try {
        await emailjs.send(EJS_SVC, EJS_TPL, payload);
        ok = true;
      } catch (err) { console.error('[EJS]', err); }
    }

    setLoad(false);

    if (ok) {
      form.reset();
      setStatus('Sent! 💖 We\'ll confirm your appointment within 24 hours.', 'ok');
    } else {
      setStatus('Something went wrong — please email us or reach us on Instagram 🌸', 'err');
    }
  });

  function val(id) { return (form.querySelector('#' + id)?.value || '').trim(); }
  function setLoad(on) {
    if (!sbtn) return;
    sbtn.disabled    = on;
    sbtn.textContent = on ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }
  function setStatus(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.style.color =
      type === 'ok'  ? '#22863a' :
      type === 'err' ? '#c0392b' : 'var(--muted)';
  }
}
