'use strict';

const LOAD_AT     = Date.now();
const MIN_FILL_MS = 2000;
const EJS_KEY     = 'snAKDj3jg8ZKWcxY_';
const EJS_SVC     = 'service_bm9h6wp';
const EJS_TPL     = 'template_v5hjt9o';

document.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  initTheme();
  initHeader();
  initDrawer();
  initFloatBtn();
  initReveal();
  initPickers();
  initMultiStep();
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
    { threshold: 0.07 }
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

/* ── Multi-step Form ─────────────────────────────────────────── */
function initMultiStep() {
  const steps  = Array.from(document.querySelectorAll('.f-step'));
  const dots   = Array.from(document.querySelectorAll('.step-dot'));
  const status = document.getElementById('fstatus');
  if (!steps.length) return;

  let cur = 0;

  function goTo(n, isBack = false) {
    steps[cur].classList.remove('act', 'back-anim');
    dots[cur]?.classList.remove('act');
    cur = Math.max(0, Math.min(n, steps.length - 1));
    steps[cur].classList.add('act');
    if (isBack) steps[cur].classList.add('back-anim');
    dots[cur]?.classList.add('act');
    if (status) { status.textContent = ''; status.style.color = ''; }
  }

  function validateStep(i) {
    if (i === 0) {
      const name  = val('from_name');
      const phone = val('phone');
      if (!name)  { shake(document.getElementById('from_name')); setStatus('Please enter your name 💕', 'err'); return false; }
      if (!phone) { shake(document.getElementById('phone'));     setStatus('Please enter your phone number 💕', 'err'); return false; }
      return true;
    }
    if (i === 1) {
      const date = val('fdate');
      const time = val('ftime');
      if (!date) { setStatus('Please pick a date 📅', 'err'); return false; }
      if (!time) { setStatus('Please pick a time ⏰', 'err'); return false; }
      return true;
    }
    return true;
  }

  // Wire Next buttons
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(cur)) goTo(+btn.dataset.next, false);
    });
  });

  // Wire Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      if (status) { status.textContent = ''; }
      goTo(+btn.dataset.back, true);
    });
  });

  function setStatus(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.style.color = type === 'err' ? '#c0392b' : type === 'ok' ? '#22863a' : 'var(--muted)';
  }

  function shake(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shakeField .4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  // Expose setStatus for form submission
  window._mfSetStatus = setStatus;
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

  // Only <button> elements are gallery items (not the g-drive anchor)
  const items = Array.from(grid.querySelectorAll('button.g-item'));
  const imgs  = items.map(el => el.querySelector('img'));
  let cur = 0, touchX = 0;

  if (dots) {
    imgs.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'lb-dot' + (i === 0 ? ' act' : '');
      dots.appendChild(d);
    });
  }

  function updateDots() {
    dots?.querySelectorAll('.lb-dot').forEach((d, i) => d.classList.toggle('act', i === cur));
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

  document.addEventListener('keydown', e => {
    if (lbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     hide();
    if (e.key === 'ArrowLeft')  show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  // Touch swipe
  lbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lbox.addEventListener('touchend',   e => {
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

  const setStatus = window._mfSetStatus || function(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.style.color = type === 'ok' ? '#22863a' : type === 'err' ? '#c0392b' : 'var(--muted)';
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Honeypot
    if (form.querySelector('input[name="_h"]')?.value) return;

    // Fill-time bot check
    if (Date.now() - LOAD_AT < MIN_FILL_MS) {
      setStatus('Please fill the form carefully 🌸', 'info');
      return;
    }

    // Collect values
    const name  = val('from_name');
    const phone = val('phone');
    const date  = val('fdate');
    const time  = val('ftime');
    const svc   = (form.querySelector('input[name="service"]:checked')?.value || 'Custom Design');
    const msg   = val('msg');

    if (!name || !phone || !date || !time) {
      setStatus('Please complete all steps first 💕', 'err');
      return;
    }

    setLoad(true);
    setStatus('Sending… 🌷', 'info');

    const payload = { from_name: name, phone, date, time, service: svc, message: msg, instagram: '', email: '' };

    let ok = false, waOk = false;

    // 1. Vercel API (primary — WhatsApp + Email + DB)
    try {
      const r    = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        ok   = true;
        waOk = data.whatsapp === true;
      }
    } catch (_) {}

    // 2. EmailJS fallback (if primary failed)
    if (!ok && window.emailjs) {
      try {
        await emailjs.send(EJS_SVC, EJS_TPL, payload);
        ok = true;
      } catch (err) { console.error('[EJS]', err); }
    }

    setLoad(false);

    if (ok) {
      form.reset();
      // Reset multi-step back to step 0
      document.querySelectorAll('.f-step').forEach((s, i) => {
        s.classList.toggle('act', i === 0);
        s.classList.remove('back-anim');
      });
      document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('act', i === 0));
      setStatus('Enquiry sent! 💖 We\'ll confirm your appointment within 24 hours.', 'ok');
    } else {
      setStatus('Something went wrong — please email us or DM on Instagram 🌸', 'err');
    }
  });

  function val(id) { return (form.querySelector('#' + id)?.value || '').trim(); }
  function setLoad(on) {
    if (!sbtn) return;
    sbtn.disabled    = on;
    sbtn.textContent = on ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }
}
