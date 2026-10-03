'use strict';

/* ═══════════════════════════════════════════════════════════════
   FLORALYN — script.js  (release build)
   ═══════════════════════════════════════════════════════════════ */

const LOAD_AT     = Date.now();
const MIN_FILL_MS = 1500;

document.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initSiteSettings(); // fetch + apply dynamic admin settings
  initTheme();
  initHeader();
  initDrawer();
  initFloatBtn();
  initReveal();
  initCustomPickers();
  initGallery();
  initForm();
});

/* ── Theme (dark / light) ────────────────────────────────────── */
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

/* ── Sticky header ───────────────────────────────────────────── */
function initHeader() {
  const h = document.getElementById('hdr');
  if (!h) return;
  const fn = () => h.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

/* ── Mobile drawer ───────────────────────────────────────────── */
function initDrawer() {
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const drover = document.getElementById('drover');
  const closeBtn = document.getElementById('drawer-close');
  if (!burger || !drawer || !drover) return;

  const open = () => {
    drawer.classList.add('open');
    drover.classList.add('on');
    drawer.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', 'true');
    burger.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const shut = () => {
    drawer.classList.remove('open');
    drover.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.classList.remove('open');
    document.body.style.overflow = '';
  };

  burger.addEventListener('click', () => drawer.classList.contains('open') ? shut() : open());
  drover.addEventListener('click', shut);
  closeBtn?.addEventListener('click', shut);
  drawer.querySelectorAll('.d-link').forEach(l => l.addEventListener('click', shut));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) shut();
  });
}

/* ── Floating CTA visibility ─────────────────────────────────── */
function initFloatBtn() {
  const btn  = document.getElementById('fbtn');
  const hero = document.querySelector('.hero');
  if (!btn || !hero) return;
  new IntersectionObserver(
    ([e]) => btn.classList.toggle('on', !e.isIntersecting),
    { threshold: 0.1 }
  ).observe(hero);
}

/* ── Scroll reveal ───────────────────────────────────────────── */
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

/* ── Custom date + time pickers ──────────────────────────────── */
function initCustomPickers() {
  /* Date picker */
  const grid   = document.getElementById('cdp-grid');
  const label  = document.getElementById('cdp-month');
  const prev   = document.getElementById('cdp-prev');
  const next   = document.getElementById('cdp-next');
  const fdate  = document.getElementById('fdate');
  if (!grid || !fdate) return;

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  const now      = new Date(); now.setHours(0,0,0,0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate  = new Date(now); maxDate.setDate(maxDate.getDate() + 90);

  let view    = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
  let selDate = null;

  function fmt(d) {
    const dy = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${dy[d.getDay()]}, ${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}`;
  }

  function render() {
    const y = view.getFullYear(), m = view.getMonth();
    label.textContent = `${MONTHS[m]} ${y}`;

    const minY = tomorrow.getFullYear(), minM = tomorrow.getMonth();
    if (prev) prev.disabled = y === minY && m <= minM;
    if (next) {
      const mY = maxDate.getFullYear(), mM = maxDate.getMonth();
      next.disabled = y > mY || (y === mY && m >= mM);
    }

    grid.innerHTML = '';
    const first = new Date(y, m, 1).getDay();
    const days  = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      const s = document.createElement('span');
      s.className = 'cdp-day cdp-other'; s.setAttribute('aria-hidden','true');
      grid.appendChild(s);
    }
    for (let d = 1; d <= days; d++) {
      const dt   = new Date(y, m, d);
      const btn  = document.createElement('button');
      btn.type   = 'button';
      btn.className = 'cdp-day'
        + (dt.getTime() === now.getTime() ? ' cdp-today' : '')
        + (selDate && dt.getTime() === selDate.getTime() ? ' cdp-sel' : '');
      btn.textContent = String(d);
      btn.setAttribute('aria-label', fmt(dt));
      if (dt.getDay() === 0 || dt < tomorrow || dt > maxDate) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          selDate = dt; fdate.value = fmt(dt); render();
        });
      }
      grid.appendChild(btn);
    }
  }

  prev?.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  next?.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
  render();

  /* Time slot picker */
  const GROUPS = [
    { id: 'ctp-am',  slots: ['10:00 AM','10:30 AM','11:00 AM','11:30 AM'] },
    { id: 'ctp-pm',  slots: ['12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'] },
    { id: 'ctp-eve', slots: ['4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM'] },
  ];
  const ftime = document.getElementById('ftime');
  if (!ftime) return;

  const allSlots = [];
  GROUPS.forEach(({ id, slots }) => {
    const c = document.getElementById(id);
    if (!c) return;
    slots.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ctp-slot'; b.textContent = t;
      b.addEventListener('click', () => {
        allSlots.forEach(s => s.classList.remove('ctp-sel'));
        b.classList.add('ctp-sel');
        ftime.value = t;
      });
      c.appendChild(b);
      allSlots.push(b);
    });
  });
}

/* ── Gallery + Lightbox ──────────────────────────────────────── */
function initGallery() {
  const gal   = document.getElementById('gal');
  const lbox  = document.getElementById('lbox');
  const limg  = document.getElementById('lb-img');
  const lp    = document.getElementById('lb-p');
  const ln    = document.getElementById('lb-n');
  const lx    = document.getElementById('lb-x');
  const dotsEl= document.getElementById('lb-dots');
  if (!gal || !lbox || !limg) return;

  const items = Array.from(gal.querySelectorAll('button.g-item[data-i]'));
  const srcs  = items.map(el => ({ src: el.querySelector('img')?.src || '', alt: el.querySelector('img')?.alt || '' }));
  if (!srcs.length) return;

  let cur = 0, tx = 0;

  if (dotsEl) {
    dotsEl.innerHTML = '';
    srcs.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'lb-dot' + (i === 0 ? ' act' : '');
      d.setAttribute('aria-hidden', 'true');
      dotsEl.appendChild(d);
    });
  }

  function dots() {
    dotsEl?.querySelectorAll('.lb-dot').forEach((d, i) => d.classList.toggle('act', i === cur));
  }
  function show(i) {
    cur = ((i % srcs.length) + srcs.length) % srcs.length;
    limg.src = srcs[cur].src; limg.alt = srcs[cur].alt;
    dots();
    lbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    lx?.focus();
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
    if (e.key === 'Escape')     { e.preventDefault(); hide(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(cur - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });

  lbox.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lbox.addEventListener('touchend',   e => {
    const dx = tx - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 45) show(cur + (dx > 0 ? 1 : -1));
  }, { passive: true });
}

/* ── Booking form (multi-step) ───────────────────────────────── */
function initForm() {
  const form      = document.getElementById('bform');
  const statusEl  = document.getElementById('fstatus');
  const sbtn      = document.getElementById('sbtn');
  const successEl = document.getElementById('fsuccess');
  const summaryEl = document.getElementById('fsc-summary');
  const againBtn  = document.getElementById('fsc-again');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.f-step'));
  const sdots = Array.from(document.querySelectorAll('.step-dot'));
  let   cur   = 0;

  /* Helpers */
  const val = id => (form.querySelector('#' + id)?.value || '').trim();

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = { ok:'#22863a', err:'#c0392b', info:'var(--muted)' }[type] || 'var(--muted)';
    if (type === 'ok' || type === 'err') statusEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  function clrStatus() { if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; } }

  function shake(el) {
    if (!el) return;
    el.classList.remove('shake-field'); void el.offsetWidth;
    el.classList.add('shake-field');
    el.addEventListener('animationend', () => el.classList.remove('shake-field'), { once: true });
  }
  function setLoading(on) {
    if (!sbtn) return;
    sbtn.disabled = on;
    sbtn.textContent = on ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }

  /* Step navigation */
  function goTo(n, back = false) {
    if (n < 0 || n >= steps.length) return;
    steps[cur].classList.remove('act', 'back-anim');
    sdots[cur]?.classList.remove('act');
    cur = n;
    steps[cur].classList.add('act');
    if (back) steps[cur].classList.add('back-anim');
    sdots[cur]?.classList.add('act');
    clrStatus();
    form.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(i) {
    if (i === 0) {
      const n = val('from_name'), p = val('phone');
      if (!n || n.length < 2) { shake(form.querySelector('#from_name')); setStatus('Please enter your name 💕', 'err'); return false; }
      if (!p || !/^[\d\s\+\-\(\)]{7,20}$/.test(p)) { shake(form.querySelector('#phone')); setStatus('Please enter a valid phone number 💕', 'err'); return false; }
    }
    if (i === 1) {
      if (!val('fdate')) { setStatus('Please pick a date 📅', 'err'); return false; }
      if (!val('ftime')) { setStatus('Please pick a time ⏰', 'err'); return false; }
    }
    return true;
  }

  form.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(cur)) goTo(+(btn.dataset.next ?? cur + 1));
    });
  });
  form.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => goTo(+(btn.dataset.back ?? cur - 1), true));
  });

  /* Success screen */
  function showSuccess(data) {
    form.style.display = 'none';
    if (successEl) {
      successEl.removeAttribute('hidden');
      if (summaryEl) {
        summaryEl.innerHTML = [
          ['👤', data.name],
          ['📅', data.date],
          ['⏰', data.time],
          ['💎', data.service],
        ].map(([icon, txt]) =>
          `<div class="fsc-row"><span>${icon}</span><span>${txt}</span></div>`
        ).join('');
      }
    }
  }

  function resetForm() {
    form.reset();
    form.style.display = '';
    steps.forEach((s, i) => { s.classList.toggle('act', i === 0); s.classList.remove('back-anim'); });
    sdots.forEach((d, i) => d.classList.toggle('act', i === 0));
    cur = 0;
    // Reset time slot chips
    document.querySelectorAll('.ctp-slot').forEach(s => s.classList.remove('ctp-sel'));
    // Reset calendar selection
    document.querySelectorAll('.cdp-sel').forEach(s => s.classList.remove('cdp-sel'));
    if (successEl) successEl.setAttribute('hidden', '');
    clrStatus();
  }

  againBtn?.addEventListener('click', resetForm);

  /* Submit */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Honeypot
    if ((form.querySelector('input[name="_h"]')?.value || '').trim()) return;

    // Timing bot check
    if (Date.now() - LOAD_AT < MIN_FILL_MS) {
      setStatus('Please fill the form carefully 🌸', 'info'); return;
    }

    const name  = val('from_name');
    const phone = val('phone');
    const date  = val('fdate');
    const time  = val('ftime');
    const svc   = form.querySelector('input[name="service"]:checked')?.value || 'Custom Design';
    const msg   = val('msg');

    // Guard all steps
    if (!name || !phone) { goTo(0); setStatus('Please enter your name and phone 💕', 'err'); return; }
    if (!date || !time)  { goTo(1); setStatus('Please pick a date and time 📅', 'err'); return; }

    setLoading(true);
    setStatus('Sending your enquiry… 🌷', 'info');

    let ok = false;
    try {
      const r = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_name: name, phone, date, time, service: svc, message: msg }),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.ok) ok = true;
        if (d.emailErr)  console.warn('[Email]', d.emailErr);
        if (d.tgErr)     console.warn('[Telegram]', d.tgErr);
      }
    } catch (err) { console.error('[fetch]', err); }

    setLoading(false);

    if (ok) {
      clrStatus();
      showSuccess({ name, date, time, service: svc });
    } else {
      setStatus('Could not send — please email us at floralyyn7@gmail.com 🌸', 'err');
    }
  });
}

/* ── Intro preloader ──────────────────────────────────────────── */
function initIntro() {
  const el = document.getElementById('intro');
  if (!el) return;

  // Skip on repeat visits within same session
  if (sessionStorage.getItem('flIntro')) {
    el.style.display = 'none';
    el.remove();
    return;
  }

  // Lock scroll during animation
  document.body.style.overflow = 'hidden';

  const SHOW_MS = 1750; // display time
  const EXIT_MS = 750;  // curtain exit duration

  setTimeout(() => {
    el.classList.add('intro-out');
    setTimeout(() => {
      el.remove();
      document.body.style.overflow = '';
      sessionStorage.setItem('flIntro', '1');
      initCountUp();
    }, EXIT_MS);
  }, SHOW_MS);
}

/* ── Count-up animation for hero stats ───────────────────────── */
function initCountUp() {
  document.querySelectorAll('.hstat-n[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const dur    = 1400;
    const step   = 16;
    const steps  = Math.ceil(dur / step);
    const inc    = target / steps;
    let   cur    = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      el.textContent = Math.round(cur) + '+';
      if (cur >= target) clearInterval(t);
    }, step);
  });
}

/* ── Site Settings (dynamic, admin-controlled) ───────────────── */
async function initSiteSettings() {
  try {
    const res = await fetch('/api/site-settings', { cache: 'no-store' });
    if (!res.ok) return;
    const { settings } = await res.json();
    if (!settings) return;

    // ── Apply offer banner ──────────────────────────────────────
    const b = settings.banner;
    if (b && b.enabled && b.text) {
      const wrap = document.getElementById('offer-banner');
      const t1   = document.getElementById('ob-text-1');
      const t2   = document.getElementById('ob-text-2');
      const t3   = document.getElementById('ob-text-3');
      if (wrap) {
        // Same text 3× so marquee appears seamless
        const txt = String(b.text).slice(0, 200);
        if (t1) t1.textContent = txt;
        if (t2) t2.textContent = txt;
        if (t3) t3.textContent = txt;
        if (b.bg)        wrap.style.background = String(b.bg).slice(0,20);
        if (b.textColor) wrap.style.color      = String(b.textColor).slice(0,20);
        wrap.style.display = '';
        document.body.classList.add('has-banner');
      }
    }

    // ── Apply service display overrides (price, duration, tag) ──
    const sd = settings.services_display;
    if (sd && typeof sd === 'object') {
      document.querySelectorAll('[data-service]').forEach(row => {
        const key  = row.dataset.service;
        const info = sd[key];
        if (!info) return;
        const priceEl = row.querySelector('.svc-price');
        const durEl   = row.querySelector('.svc-dur');
        const tagEl   = row.querySelector('.svc-tag');
        const descEl  = row.querySelector('.svc-desc');
        if (priceEl && info.price) priceEl.textContent = String(info.price).slice(0,40);
        if (durEl   && info.duration) durEl.textContent = String(info.duration).slice(0,20);
        if (tagEl   && info.tag !== undefined) tagEl.textContent = String(info.tag).slice(0,30);
        if (descEl  && info.description) descEl.textContent = String(info.description).slice(0,300);
      });
    }

    // ── Apply hero overrides ────────────────────────────────────
    const h = settings.hero;
    if (h && typeof h === 'object') {
      const subEl    = document.querySelector('.hero-sub');
      const kickerEl = document.querySelector('.hero-kicker');
      if (subEl    && h.subtext) subEl.textContent = String(h.subtext).slice(0,200);
      if (kickerEl && h.kicker)  {
        // preserve the pulsing dot, only update text
        const dot = kickerEl.querySelector('.kicker-dot');
        kickerEl.textContent = ' ' + String(h.kicker).slice(0,100);
        if (dot) kickerEl.prepend(dot);
      }
    }

  } catch (_) { /* fail silently — static HTML is fallback */ }
}
