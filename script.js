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
  initCustomPickers();
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

/* ── Custom Date + Time pickers ─────────────────────────────── */
function initCustomPickers() {
  /* ─── Date picker ─────────────────────────────────────────── */
  const cdpGrid  = document.getElementById('cdp-grid');
  const cdpLabel = document.getElementById('cdp-month');
  const cdpPrev  = document.getElementById('cdp-prev');
  const cdpNext  = document.getElementById('cdp-next');
  const fdateEl  = document.getElementById('fdate');
  if (!cdpGrid || !fdateEl) return;

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  // Limits: tomorrow → 90 days out
  const now      = new Date(); now.setHours(0,0,0,0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate  = new Date(now); maxDate.setDate(maxDate.getDate() + 90);

  let view     = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
  let selDate  = null;

  function fmtDate(d) {
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function render() {
    const y = view.getFullYear(), m = view.getMonth();
    if (cdpLabel) cdpLabel.textContent = `${MONTH_NAMES[m]} ${y}`;

    // Prev arrow disabled if already at min month
    if (cdpPrev) cdpPrev.disabled = (y === tomorrow.getFullYear() && m <= tomorrow.getMonth());
    // Next arrow disabled if beyond max month
    if (cdpNext) {
      const maxY = maxDate.getFullYear(), maxM = maxDate.getMonth();
      cdpNext.disabled = (y > maxY || (y === maxY && m >= maxM));
    }

    cdpGrid.innerHTML = '';
    const firstDow   = new Date(y, m, 1).getDay();   // 0=Sun
    const daysInMonth= new Date(y, m + 1, 0).getDate();

    // Empty leading cells
    for (let i = 0; i < firstDow; i++) {
      const sp = document.createElement('span');
      sp.className = 'cdp-day cdp-other';
      sp.setAttribute('aria-hidden', 'true');
      cdpGrid.appendChild(sp);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const isSun  = date.getDay() === 0;
      const isPast = date < tomorrow;
      const isMax  = date > maxDate;
      const isTod  = date.getTime() === now.getTime();
      const isSel  = selDate && date.getTime() === selDate.getTime();

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'cdp-day' +
        (isTod ? ' cdp-today' : '') +
        (isSel ? ' cdp-sel'   : '');
      btn.textContent = String(d);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', fmtDate(date));

      if (isSun || isPast || isMax) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.addEventListener('click', () => {
          selDate = date;
          fdateEl.value = fmtDate(date);
          render(); // re-render to update .cdp-sel
        });
      }
      cdpGrid.appendChild(btn);
    }
  }

  cdpPrev?.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  cdpNext?.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
  render();

  /* ─── Time slot picker ────────────────────────────────────── */
  const SLOT_GROUPS = [
    { id: 'ctp-am',  slots: ['10:00 AM','10:30 AM','11:00 AM','11:30 AM'] },
    { id: 'ctp-pm',  slots: ['12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'] },
    { id: 'ctp-eve', slots: ['4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM'] },
  ];
  const ftimeEl = document.getElementById('ftime');
  if (!ftimeEl) return;

  let allSlots = [];

  SLOT_GROUPS.forEach(({ id, slots }) => {
    const container = document.getElementById(id);
    if (!container) return;
    slots.forEach(time => {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'ctp-slot';
      btn.textContent = time;
      btn.addEventListener('click', () => {
        allSlots.forEach(s => s.classList.remove('ctp-sel'));
        btn.classList.add('ctp-sel');
        ftimeEl.value = time;
      });
      container.appendChild(btn);
      allSlots.push(btn);
    });
  });
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
