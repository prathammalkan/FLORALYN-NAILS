'use strict';

/* ═══════════════════════════════════════════════════════════════
   FLORALYN — script.js
   ═══════════════════════════════════════════════════════════════ */

// ── Global helpers ────────────────────────────────────────────
const LOAD_AT     = Date.now();
const MIN_FILL_MS = 1500;
const EJS_KEY     = 'snAKDj3jg8ZKWcxY_';
const EJS_SVC     = 'service_bm9h6wp';
const EJS_TPL     = 'template_v5hjt9o';

/** Get trimmed value of form element by id */
function fieldVal(form, id) {
  const el = form ? form.querySelector('#' + id) : document.getElementById(id);
  return (el?.value || '').trim();
}

document.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  initTheme();
  initHeader();
  initDrawer();
  initFloatBtn();
  initReveal();
  initPickers();
  initGallery();
  initForm();   // initMultiStep is called inside initForm
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
  const dark   = stored ? stored === 'dark'
                        : window.matchMedia('(prefers-color-scheme: dark)').matches;
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
  const closeBtn = document.getElementById('drawer-close');
  if (!burger || !drawer || !drover) return;

  function open() {
    drawer.classList.add('open');
    drover.classList.add('on');
    drawer.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', 'true');
    burger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function shut() {
    drawer.classList.remove('open');
    drover.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => drawer.classList.contains('open') ? shut() : open());
  drover.addEventListener('click', shut);
  closeBtn?.addEventListener('click', shut);
  drawer.querySelectorAll('.d-link').forEach(l => l.addEventListener('click', shut));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) shut(); });
}

/* ── Floating Book CTA ───────────────────────────────────────── */
function initFloatBtn() {
  const btn  = document.getElementById('fbtn');
  const hero = document.querySelector('.hero');
  if (!btn || !hero) return;
  new IntersectionObserver(
    ([entry]) => btn.classList.toggle('on', !entry.isIntersecting),
    { threshold: 0.1 }
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
    { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => io.observe(el));
}

/* ── Flatpickr date + time pickers ──────────────────────────── */
function initPickers() {
  if (typeof flatpickr === 'undefined') {
    setTimeout(initPickers, 300);
    return;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  const de = document.getElementById('fdate');
  if (de && !de._flatpickr) {
    flatpickr(de, {
      minDate: tomorrow,
      maxDate,
      dateFormat: 'D, d M Y',
      disableMobile: false,
      disable: [d => d.getDay() === 0], // no Sundays
    });
  }

  const te = document.getElementById('ftime');
  if (te && !te._flatpickr) {
    flatpickr(te, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'h:i K',
      minTime: '10:00',
      maxTime: '19:00',
      minuteIncrement: 30,
      disableMobile: false,
    });
  }
}

/* ── Gallery + Lightbox ──────────────────────────────────────── */
function initGallery() {
  const grid = document.getElementById('gal');
  const lbox = document.getElementById('lbox');
  const limg = document.getElementById('lb-img');
  const lp   = document.getElementById('lb-p');
  const ln   = document.getElementById('lb-n');
  const lx   = document.getElementById('lb-x');
  const dotsEl = document.getElementById('lb-dots');
  if (!grid || !lbox || !limg) return;

  // Collect only button.g-item (excludes the anchor g-drive card)
  const items = Array.from(grid.querySelectorAll('button.g-item[data-i]'));
  const srcs  = items.map(el => ({
    src: el.querySelector('img')?.src || '',
    alt: el.querySelector('img')?.alt || '',
  }));
  let cur = 0, touchX = 0;

  if (!srcs.length) return;

  // Build lightbox dots
  if (dotsEl) {
    dotsEl.innerHTML = '';
    srcs.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'lb-dot' + (i === 0 ? ' act' : '');
      d.setAttribute('aria-hidden', 'true');
      dotsEl.appendChild(d);
    });
  }

  function refreshDots() {
    dotsEl?.querySelectorAll('.lb-dot').forEach((d, i) => d.classList.toggle('act', i === cur));
  }

  function show(i) {
    cur = ((i % srcs.length) + srcs.length) % srcs.length;
    limg.src = srcs[cur].src;
    limg.alt = srcs[cur].alt;
    refreshDots();
    lbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    lx?.focus();
  }
  function hide() {
    lbox.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  items.forEach(el => {
    el.addEventListener('click', () => show(+el.dataset.i));
  });
  lx?.addEventListener('click', hide);
  lp?.addEventListener('click', () => show(cur - 1));
  ln?.addEventListener('click', () => show(cur + 1));
  lbox.addEventListener('click', e => { if (e.target === lbox) hide(); });

  // Keyboard nav
  document.addEventListener('keydown', e => {
    if (lbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     { e.preventDefault(); hide(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(cur - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });

  // Touch swipe (45px threshold)
  lbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lbox.addEventListener('touchend',   e => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 45) show(cur + (dx > 0 ? 1 : -1));
  }, { passive: true });
}

/* ── Booking Form (multi-step) ───────────────────────────────── */
function initForm() {
  const form    = document.getElementById('bform');
  const statusEl= document.getElementById('fstatus');
  const sbtn    = document.getElementById('sbtn');
  if (!form) return;

  const steps   = Array.from(form.querySelectorAll('.f-step'));
  const dots    = Array.from(document.querySelectorAll('.step-dot'));
  let   cur     = 0;

  // ── Helpers ────────────────────────────────────────────────
  function val(id) { return fieldVal(form, id); }

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    const colors = { ok: '#22863a', err: '#c0392b', info: 'var(--muted)' };
    statusEl.style.color = colors[type] || 'var(--muted)';
    // Scroll status into view on mobile
    if (type === 'ok' || type === 'err') {
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearStatus() { if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; } }

  function shake(el) {
    if (!el) return;
    el.classList.remove('shake-field');
    void el.offsetWidth; // force reflow
    el.classList.add('shake-field');
    el.addEventListener('animationend', () => el.classList.remove('shake-field'), { once: true });
  }

  function setLoading(on) {
    if (!sbtn) return;
    sbtn.disabled    = on;
    sbtn.textContent = on ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }

  // ── Step navigation ────────────────────────────────────────
  function goTo(n, isBack = false) {
    if (n < 0 || n >= steps.length) return;
    steps[cur].classList.remove('act', 'back-anim');
    dots[cur]?.classList.remove('act');
    cur = n;
    steps[cur].classList.add('act');
    if (isBack) steps[cur].classList.add('back-anim');
    dots[cur]?.classList.add('act');
    clearStatus();
    // Scroll booking section into view
    form.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(i) {
    if (i === 0) {
      const name  = val('from_name');
      const phone = val('phone');
      if (!name)  { shake(form.querySelector('#from_name')); setStatus('Please enter your name 💕', 'err'); return false; }
      if (name.length < 2) { shake(form.querySelector('#from_name')); setStatus('Name is too short', 'err'); return false; }
      if (!phone) { shake(form.querySelector('#phone'));     setStatus('Please enter your phone number 💕', 'err'); return false; }
      if (!/^[\d\s\+\-\(\)]{7,20}$/.test(phone)) { shake(form.querySelector('#phone')); setStatus('Please enter a valid phone number', 'err'); return false; }
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

  // Wire step buttons
  form.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = +(btn.dataset.next ?? (cur + 1));
      if (validateStep(cur)) goTo(next, false);
    });
  });
  form.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const back = +(btn.dataset.back ?? (cur - 1));
      goTo(back, true);
    });
  });

  // ── Form submit ────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Honeypot
    if ((form.querySelector('input[name="_h"]')?.value || '').trim()) return;

    // Bot timing check
    if (Date.now() - LOAD_AT < MIN_FILL_MS) {
      setStatus('Please complete the form carefully 🌸', 'info');
      return;
    }

    // Collect all values
    const name  = val('from_name');
    const phone = val('phone');
    const date  = val('fdate');
    const time  = val('ftime');
    const svc   = form.querySelector('input[name="service"]:checked')?.value || 'Custom Design';
    const msg   = val('msg');

    // Guard: validate all steps before submit
    if (!name || !phone) { goTo(0); setStatus('Please enter your name and phone number 💕', 'err'); return; }
    if (!date || !time)  { goTo(1); setStatus('Please pick a date and time 📅', 'err'); return; }

    setLoading(true);
    setStatus('Sending your enquiry… 🌷', 'info');

    const payload = { from_name: name, phone, date, time, service: svc, message: msg };

    let ok = false;

    // ── Primary: Vercel API ──────────────────────────────────
    try {
      const resp = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data.ok) ok = true;
        // Log diagnostics to console (not shown to user)
        if (data.waErrCode) console.warn('[WA error]', data.waErrCode, data.waErrMsg);
        if (data.emailErr)  console.warn('[Email error]', data.emailErr);
      }
    } catch (err) {
      console.error('[API fetch]', err);
    }

    // ── Fallback: EmailJS ────────────────────────────────────
    if (!ok && window.emailjs) {
      try {
        await emailjs.send(EJS_SVC, EJS_TPL, {
          from_name: name, phone, date, time, service: svc, message: msg,
        });
        ok = true;
      } catch (err) {
        console.error('[EmailJS]', err);
      }
    }

    setLoading(false);

    if (ok) {
      // Reset form to step 0
      form.reset();
      steps.forEach((s, i) => { s.classList.toggle('act', i === 0); s.classList.remove('back-anim'); });
      dots.forEach((d, i) => d.classList.toggle('act', i === 0));
      cur = 0;
      setStatus('✅ Enquiry sent! We\'ll confirm within 24 hours 💖', 'ok');
    } else {
      setStatus('Could not send — please email floralyyn7@gmail.com or DM us on Instagram 🌸', 'err');
    }
  });
}
