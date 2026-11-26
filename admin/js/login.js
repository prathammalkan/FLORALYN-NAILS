// admin/js/login.js
// Admin login controller — externalised for strict CSP (no unsafe-inline)
'use strict';

window.FloralynConfig = {
  SUPABASE_URL:      'https://znycuzuveqhybqgevjvj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueWN1enV2ZXFoeWJxZ2V2anZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTcyMTQsImV4cCI6MjEwNjE5MzIxNH0.cPYdpp6peTFX4e88K4yb8f1tbaV96ifqoy7TrCyEAxQ',
};

document.addEventListener('DOMContentLoaded', async function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FloralynConfig || {};

  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !window.supabase) {
    const warn = document.getElementById('config-warning');
    const btn  = document.getElementById('login-btn');
    if (warn) warn.style.display = 'block';
    if (btn)  btn.disabled = true;
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Already signed in — go straight to dashboard
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { window.location.href = '/admin/dashboard.html'; return; }
  } catch (_) {}

  const form  = document.getElementById('login-form');
  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  if (!form || !btn || !errEl) return;

  // Client-side lockout: 3 failures -> 60s cooldown
  let failCount   = 0;
  let lockedUntil = 0;

  function showErr(msg) {
    errEl.textContent   = msg;
    errEl.style.display = 'block';
    btn.disabled        = false;
    btn.textContent     = 'Sign In';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      showErr('Too many failed attempts. Try again in ' + secs + 's.');
      btn.disabled = true;
      return;
    }

    const username = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showErr('Please enter your username and password.');
      return;
    }

    btn.disabled        = true;
    btn.textContent     = 'Signing in...';
    errEl.style.display = 'none';

    try {
      // Authentication goes through secure server-side endpoint ONLY
      const res  = await fetch('/api/admin-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(function () { return {}; });

      if (res.status === 429) {
        lockedUntil = Date.now() + 15 * 60 * 1000;
        showErr('Too many attempts. Locked for 15 minutes.');
        return;
      }

      if (res.ok && data.ok && data.session) {
        failCount = 0;
        await supabase.auth.setSession({
          access_token:  data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        window.location.href = '/admin/dashboard.html';
        return;
      }

      failCount++;
      if (failCount >= 3) {
        lockedUntil = Date.now() + 60 * 1000;
        showErr('Too many failed attempts. Wait 60 seconds and try again.');
      } else {
        showErr((data && data.error) ? data.error : 'Invalid username or password. Please try again.');
      }
    } catch (_) {
      showErr('Connection error. Check your network and try again.');
    }
  });
});
