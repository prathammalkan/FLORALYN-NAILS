// 🌸 Floralyn — script.js
// Production-hardened: single DOMContentLoaded, bot protection,
// correct error handling, Vercel API endpoint

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ─── EmailJS ─────────────────────────────────────────────── */
  // Public key is safe for browser use by EmailJS design.
  // IMPORTANT: Enable domain restrictions in your EmailJS dashboard
  // to prevent quota abuse from other domains.
  const EMAILJS_SERVICE_ID  = 'service_bm9h6wp';
  const EMAILJS_TEMPLATE_ID = 'template_v5hjt9o';
  const EMAILJS_PUBLIC_KEY  = 'snAKDj3jg8ZKWcxY_';

  if (window.emailjs) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  /* ─── Elements ────────────────────────────────────────────── */
  const form       = document.getElementById('booking-form');
  const statusEl   = document.getElementById('form-status');
  const submitBtn  = document.getElementById('submit-btn');

  if (!form || !statusEl || !submitBtn) return;

  /* ─── Bot protection: record page load time ───────────────── */
  // If a form is submitted in under 3 seconds, it is almost certainly a bot.
  const pageLoadTime = Date.now();
  const MIN_FILL_TIME_MS = 3000;

  /* ─── Status helpers ──────────────────────────────────────── */
  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError
      ? '#c0392b'
      : 'rgba(110, 58, 117, 0.9)';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Sending… 💅' : 'Send Enquiry';
  }

  /* ─── Form submission ─────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // ── Minimum fill-time check (bot protection) ──────────────
    if (Date.now() - pageLoadTime < MIN_FILL_TIME_MS) {
      // Silently ignore — do not inform the bot
      return;
    }

    // ── Honeypot check ────────────────────────────────────────
    const honeypot = form.querySelector('input[name="_gotcha"]');
    if (honeypot && honeypot.value.trim() !== '') {
      // Silent rejection
      form.reset();
      return;
    }

    // ── Collect data ──────────────────────────────────────────
    const formData = new FormData(form);
    const dataObj  = {};
    formData.forEach((v, k) => { dataObj[k] = v; });

    setLoading(true);
    setStatus('Sending… 💅', false);

    /* ── 1. Send via EmailJS ───────────────────────────────── */
    let emailSuccess = false;

    if (window.emailjs) {
      try {
        await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);
        emailSuccess = true;
      } catch (err) {
        console.error('[EmailJS] Send error:', err);
      }
    }

    /* ── 2. Send to Vercel API (save + WhatsApp) ───────────── */
    let apiSuccess = false;

    try {
      const res = await fetch('/api/send-whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dataObj),
      });

      if (res.ok) {
        apiSuccess = true;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error('[API] Error response:', res.status, errBody.error);
      }
    } catch (err) {
      console.error('[API] Network error:', err);
    }

    /* ── 3. Update status message ──────────────────────────── */
    if (emailSuccess || apiSuccess) {
      setStatus('💖 Done! We\'ll be in touch within 24 hours.', false);
      form.reset();
    } else {
      // Both channels failed — offer email fallback
      setStatus('⚠️ Something went wrong. Please email us directly at floralyyn7@gmail.com', true);
    }

    setLoading(false);
  });

  /* ─── Flatpickr — Date Picker ─────────────────────────────── */
  // Using a short delay to ensure the deferred flatpickr script has loaded.
  function initPickers() {
    if (typeof flatpickr === 'undefined') {
      // Retry once after a short wait (handles defer load timing)
      setTimeout(initPickers, 200);
      return;
    }

    flatpickr('#date', {
      dateFormat:    'Y-m-d',
      minDate:       'today',
      maxDate:       new Date().fp_incr(90), // Max 90 days ahead
      disableMobile: false,
    });

    flatpickr('#time', {
      enableTime:      true,
      noCalendar:      true,
      dateFormat:      'h:i K',
      time_24hr:       false,
      minuteIncrement: 15,
      minTime:         '10:00',
      maxTime:         '19:00',
    });
  }

  initPickers();

  /* ─── Theme Toggle ────────────────────────────────────────── */
  const themeSwitch = document.getElementById('theme-switch');
  if (!themeSwitch) return;

  // Restore saved preference
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeSwitch.checked = true;
  }

  themeSwitch.addEventListener('change', () => {
    const isDark = themeSwitch.checked;
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

});
