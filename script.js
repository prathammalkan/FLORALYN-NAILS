'use strict';

// ── Boot time (bot protection) ────────────────────────────────
const PAGE_LOAD_TIME  = Date.now();
const MIN_FILL_MS     = 3000;
const EMAILJS_PUB_KEY = 'snAKDj3jg8ZKWcxY_';
const EMAILJS_SVC_ID  = 'service_bm9h6wp';
const EMAILJS_TPL_ID  = 'template_v5hjt9o';

document.addEventListener('DOMContentLoaded', function () {
  initEmailJS();
  initTheme();
  initStickyHeader();
  initMobileNav();
  initFloatingCTA();
  initScrollReveal();
  initPickers();
  initGalleryLightbox();
  initForm();
});

// ── EmailJS ───────────────────────────────────────────────────
function initEmailJS() {
  if (window.emailjs) emailjs.init(EMAILJS_PUB_KEY);
}

// ── Theme ─────────────────────────────────────────────────────
function initTheme() {
  const sw = document.getElementById('theme-switch');
  if (!sw) return;

  const stored     = localStorage.getItem('theme');
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark     = stored ? stored === 'dark' : preferDark;

  if (isDark) { document.body.classList.add('dark-mode'); sw.checked = true; }

  sw.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', sw.checked);
    localStorage.setItem('theme', sw.checked ? 'dark' : 'light');
  });
}

// ── Sticky Header ─────────────────────────────────────────────
function initStickyHeader() {
  const h = document.getElementById('site-header');
  if (!h) return;
  const update = () => h.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Mobile Nav ────────────────────────────────────────────────
function initMobileNav() {
  const btn     = document.getElementById('hamburger');
  const nav     = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mob-overlay');
  const closeB  = document.getElementById('mobile-nav-close');
  if (!btn || !nav) return;

  function open() {
    nav.classList.add('open');
    nav.removeAttribute('aria-hidden');
    overlay.classList.add('visible');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close navigation menu');
  }

  function close() {
    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open navigation menu');
  }

  btn.addEventListener('click',     () => nav.classList.contains('open') ? close() : open());
  overlay.addEventListener('click', close);
  closeB?.addEventListener('click', close);
  nav.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ── Floating CTA ──────────────────────────────────────────────
function initFloatingCTA() {
  const cta  = document.getElementById('floating-cta');
  const hero = document.querySelector('.hero');
  if (!cta || !hero) return;

  new IntersectionObserver(
    entries => cta.classList.toggle('visible', !entries[0].isIntersecting),
    { threshold: 0.1 }
  ).observe(hero);
}

// ── Scroll Reveal ─────────────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.1 }
  );

  els.forEach(el => obs.observe(el));
}

// ── Flatpickr ─────────────────────────────────────────────────
function initPickers() {
  if (typeof flatpickr === 'undefined') { setTimeout(initPickers, 250); return; }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  const dateEl = document.getElementById('date');
  if (dateEl) {
    flatpickr(dateEl, {
      minDate: tomorrow,
      maxDate,
      dateFormat: 'D, d M Y',
      disableMobile: false,
      disable: [d => d.getDay() === 0], // no Sundays
    });
  }

  const timeEl = document.getElementById('time');
  if (timeEl) {
    flatpickr(timeEl, {
      enableTime:      true,
      noCalendar:      true,
      dateFormat:      'h:i K',
      minTime:         '10:00',
      maxTime:         '19:00',
      minuteIncrement: 30,
      disableMobile:   false,
    });
  }
}

// ── Gallery Lightbox ──────────────────────────────────────────
function initGalleryLightbox() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const grid  = document.getElementById('gallery-grid');
  if (!lb || !lbImg || !grid) return;

  const imgs = Array.from(grid.querySelectorAll('.gb-item img'));
  let cur = 0;

  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    lbImg.src = imgs[cur].src;
    lbImg.alt = imgs[cur].alt;
    lb.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('lb-close')?.focus();
  }

  function hide() {
    lb.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Open on image click
  imgs.forEach((img, i) => {
    img.parentElement.addEventListener('click', () => show(i));
    img.parentElement.setAttribute('tabindex', '0');
    img.parentElement.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
    });
  });

  document.getElementById('lb-close')?.addEventListener('click', hide);
  document.getElementById('lb-prev')?.addEventListener('click', () => show(cur - 1));
  document.getElementById('lb-next')?.addEventListener('click', () => show(cur + 1));

  lb.addEventListener('click', e => { if (e.target === lb) hide(); });

  document.addEventListener('keydown', e => {
    if (lb.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     hide();
    if (e.key === 'ArrowLeft')  show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
}

// ── Booking Form ──────────────────────────────────────────────
function initForm() {
  const form     = document.getElementById('booking-form');
  const statusEl = document.getElementById('form-status');
  const submitEl = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Honeypot
    if (form.querySelector('input[name="_gotcha"]')?.value) return;

    // Fill-time bot check
    if (Date.now() - PAGE_LOAD_TIME < MIN_FILL_MS) {
      setStatus('Please take a moment to fill the form carefully 🌸', 'info');
      return;
    }

    // Required field validation
    const name  = v('from_name');
    const phone = v('phone');
    const date  = v('date');
    const time  = v('time');

    if (!name || !phone || !date || !time) {
      setStatus('Please fill in your name, phone, date, and time 💕', 'error');
      return;
    }

    setLoading(true);

    const payload = {
      from_name: name,
      phone,
      instagram: v('instagram'),
      email:     v('email'),
      date,
      time,
      service:   v('service') || 'Custom Design',
      message:   v('message'),
    };

    let ok = false;

    // 1. Vercel API (WhatsApp + Email + Supabase)
    try {
      const r = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (r.ok) ok = true;
    } catch (_) { /* fall through */ }

    // 2. EmailJS fallback
    if (!ok && window.emailjs) {
      try {
        await emailjs.send(EMAILJS_SVC_ID, EMAILJS_TPL_ID, payload);
        ok = true;
      } catch (err) {
        console.error('[EmailJS]', err);
      }
    }

    setLoading(false);

    if (ok) {
      form.reset();
      setStatus('Enquiry sent! 💖 We\'ll confirm your appointment within 24 hours.', 'success');
    } else {
      setStatus(
        'Something went wrong. Please email floralyyn7@gmail.com or reach us on Instagram 🌸',
        'error'
      );
    }
  });

  function v(id) { return (form.querySelector('#' + id)?.value || '').trim(); }

  function setLoading(on) {
    if (!submitEl) return;
    submitEl.disabled    = on;
    submitEl.textContent = on ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color =
      type === 'success' ? '#2d7a3a' :
      type === 'error'   ? '#c0392b' : 'var(--muted)';
  }
}
