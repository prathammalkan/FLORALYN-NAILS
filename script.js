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
  initForm();
  initGalleryLightbox();
  initSmoothScroll();
});

// ── EmailJS ───────────────────────────────────────────────────
function initEmailJS() {
  if (window.emailjs) emailjs.init(EMAILJS_PUB_KEY);
}

// ── Theme Toggle ──────────────────────────────────────────────
function initTheme() {
  const sw = document.getElementById('theme-switch');
  if (!sw) return;

  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;

  if (isDark) { document.body.classList.add('dark-mode'); sw.checked = true; }

  sw.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', sw.checked);
    localStorage.setItem('theme', sw.checked ? 'dark' : 'light');
  });
}

// ── Sticky Header ─────────────────────────────────────────────
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Mobile Nav ────────────────────────────────────────────────
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('mobile-nav');
  const overlay   = document.getElementById('mobile-nav-overlay');
  const closeBtn  = document.getElementById('mobile-nav-close');
  if (!hamburger || !nav) return;

  function openNav() {
    nav.classList.add('open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    nav.removeAttribute('aria-hidden');
  }

  function closeNav() {
    nav.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');
  }

  hamburger.addEventListener('click', function () {
    nav.classList.contains('open') ? closeNav() : openNav();
  });

  overlay?.addEventListener('click', closeNav);
  closeBtn?.addEventListener('click', closeNav);

  // Close nav when a link is tapped
  nav.querySelectorAll('.mobile-nav-link').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
  });
}

// ── Floating CTA ──────────────────────────────────────────────
function initFloatingCTA() {
  const cta  = document.getElementById('floating-cta');
  const hero = document.querySelector('.hero-section');
  if (!cta || !hero) return;

  const observer = new IntersectionObserver(
    function (entries) {
      // Show CTA only once hero is out of view
      cta.classList.toggle('visible', !entries[0].isIntersecting);
    },
    { threshold: 0.1 }
  );
  observer.observe(hero);
}

// ── Scroll Reveal ─────────────────────────────────────────────
function initScrollReveal() {
  const sections = document.querySelectorAll('.reveal-section');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  sections.forEach(function (s) { observer.observe(s); });
}

// ── Flatpickr Date & Time ─────────────────────────────────────
function initPickers() {
  if (typeof flatpickr === 'undefined') {
    // Retry after a tick in case script hasn't loaded yet
    setTimeout(initPickers, 300);
    return;
  }

  const today  = new Date();
  const minDay = new Date(today);
  minDay.setDate(minDay.getDate() + 1);

  const maxDay = new Date(today);
  maxDay.setDate(maxDay.getDate() + 90);

  const dateInput = document.getElementById('date');
  if (dateInput) {
    flatpickr(dateInput, {
      minDate:    minDay,
      maxDate:    maxDay,
      dateFormat: 'D, d M Y',
      disableMobile: false,
      disable: [
        function (date) { return date.getDay() === 0; } // no Sundays
      ],
    });
  }

  const timeInput = document.getElementById('time');
  if (timeInput) {
    flatpickr(timeInput, {
      enableTime:   true,
      noCalendar:   true,
      dateFormat:   'h:i K',
      minTime:      '10:00',
      maxTime:      '19:00',
      minuteIncrement: 30,
      disableMobile: false,
    });
  }
}

// ── Gallery Lightbox ──────────────────────────────────────────
function initGalleryLightbox() {
  const lightbox    = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn    = document.getElementById('lightbox-close');
  const prevBtn     = document.getElementById('lightbox-prev');
  const nextBtn     = document.getElementById('lightbox-next');
  const grid        = document.getElementById('gallery-bento');

  if (!lightbox || !lightboxImg || !grid) return;

  const items   = Array.from(grid.querySelectorAll('.gb-item img'));
  let   current = 0;

  function openAt(index) {
    current = (index + items.length) % items.length;
    lightboxImg.src = items[current].src;
    lightboxImg.alt = items[current].alt;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  items.forEach(function (img, i) {
    img.parentElement.addEventListener('click', function () { openAt(i); });
  });

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', function () { openAt(current - 1); });
  nextBtn?.addEventListener('click', function () { openAt(current + 1); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (lightbox.style.display === 'none') return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   openAt(current - 1);
    if (e.key === 'ArrowRight')  openAt(current + 1);
  });
}

// ── Smooth Scroll for anchor links ────────────────────────────
function initSmoothScroll() {
  const HEADER_OFFSET = 76;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ── Booking Form ──────────────────────────────────────────────
function initForm() {
  const form      = document.getElementById('booking-form');
  const statusEl  = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Bot checks
    const honeypot = form.querySelector('input[name="_gotcha"]');
    if (honeypot?.value) return; // silent bot rejection

    if (Date.now() - PAGE_LOAD_TIME < MIN_FILL_MS) {
      showStatus('Please take a moment to fill the form carefully. 🌸', 'info');
      return;
    }

    // Basic required-field check
    const name  = form.querySelector('#from_name')?.value.trim();
    const phone = form.querySelector('#phone')?.value.trim();
    const date  = form.querySelector('#date')?.value.trim();
    const time  = form.querySelector('#time')?.value.trim();

    if (!name || !phone || !date || !time) {
      showStatus('Please fill in your name, phone, date, and preferred time. 💕', 'error');
      return;
    }

    setLoading(true);

    // Build payload for API
    const payload = {
      from_name: name,
      phone:     phone,
      instagram: form.querySelector('#instagram')?.value.trim() || '',
      email:     form.querySelector('#email')?.value.trim()     || '',
      date,
      time,
      service:   form.querySelector('#service')?.value         || 'Gel Nails',
      message:   form.querySelector('#message')?.value.trim()  || '',
    };

    let apiSuccess = false;

    // 1. Try the Vercel API route (WhatsApp + Resend email + Supabase save)
    try {
      const res = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (res.ok) apiSuccess = true;
    } catch (_) { /* continue to EmailJS fallback */ }

    // 2. EmailJS as backup (browser-side)
    if (!apiSuccess && window.emailjs) {
      try {
        await emailjs.send(EMAILJS_SVC_ID, EMAILJS_TPL_ID, payload);
        apiSuccess = true;
      } catch (err) {
        console.error('[EmailJS]', err);
      }
    }

    setLoading(false);

    if (apiSuccess) {
      form.reset();
      showStatus('Enquiry sent! 💖 We\'ll confirm your appointment within 24 hours.', 'success');
    } else {
      showStatus(
        'Something went wrong. Please WhatsApp us directly or email floralyyn7@gmail.com 🌸',
        'error'
      );
    }
  });

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Sending… 🌷' : 'Send Enquiry 💌';
  }

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color =
      type === 'success' ? '#22863a' :
      type === 'error'   ? '#c0392b' : 'var(--muted)';
  }
}
