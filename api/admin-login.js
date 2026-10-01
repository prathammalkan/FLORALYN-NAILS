// api/admin-login.js
// Secure server-side admin authentication — credentials never touch the browser
'use strict';

const { createClient } = require('@supabase/supabase-js');

// ── In-memory rate limiter (5 attempts / 15 min per IP) ───────
const _rl = new Map();
function rateLimited(ip) {
  const now   = Date.now();
  const WIN   = 15 * 60 * 1000;   // 15 min window
  const LIMIT = 5;
  const hits  = (_rl.get(ip) || []).filter(t => now - t < WIN);
  if (hits.length >= LIMIT) return true;
  hits.push(now);
  _rl.set(ip, hits);
  if (_rl.size > 1000) _rl.delete(_rl.keys().next().value); // evict oldest
  return false;
}

// ── Constant-time string compare (prevent timing attacks) ─────
function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const la = Buffer.from(a.padEnd(128));
  const lb = Buffer.from(b.padEnd(128));
  let diff = la.length ^ lb.length;
  for (let i = 0; i < Math.min(la.length, lb.length); i++) diff |= la[i] ^ lb[i];
  return diff === 0 && a.length === b.length;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Method guard
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed.' });

  // Rate limit by IP
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }

  // Parse body
  let body;
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      const raw = await new Promise((resolve, reject) => {
        let s = '';
        req.on('data', c => { s += c; if (s.length > 4096) reject(new Error('Too large')); });
        req.on('end',  () => resolve(s));
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    }
  } catch { return res.status(400).json({ error: 'Invalid request body.' }); }

  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body.' });

  const { username, password } = body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Read credentials from env — never hardcoded
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    console.error('[admin-login] ADMIN_USERNAME or ADMIN_PASSWORD env vars not set');
    return res.status(503).json({ error: 'Admin authentication is not configured.' });
  }

  // Constant-time comparison to prevent timing attacks
  const userOk = safeEq(username.trim(), expectedUser.trim());
  const passOk = safeEq(password, expectedPass);

  if (!userOk || !passOk) {
    // Add artificial delay to further slow brute-force
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Credentials valid — sign in to Supabase to get a real JWT session
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return res.status(503).json({ error: 'Supabase not configured on server.' });
  }

  const ADMIN_EMAIL = 'floralyn.admin@internal.app'; // internal only, never exposed to users

  // Ensure the admin user exists and is confirmed (idempotent)
  if (serviceKey && serviceKey !== 'YOUR_SERVICE_ROLE_KEY_HERE') {
    try {
      const sbAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data: list } = await sbAdmin.auth.admin.listUsers({ perPage: 200 });
      const existing = (list?.users || []).find(u => u.email === ADMIN_EMAIL);
      if (existing) {
        await sbAdmin.auth.admin.updateUserById(existing.id, {
          password: expectedPass,
          email_confirm: true,
        });
      } else {
        await sbAdmin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: expectedPass,
          email_confirm: true,
        });
      }
    } catch (e) {
      console.error('[admin-login] Supabase admin setup error:', e.message);
      // Non-fatal — attempt sign-in anyway
    }
  }

  // Sign in with Supabase anon client
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
      email:    ADMIN_EMAIL,
      password: expectedPass,
    });

    if (authErr) {
      console.error('[admin-login] Supabase signIn error:', authErr.message);
      return res.status(401).json({ error: 'Authentication failed. Please contact support.' });
    }

    return res.status(200).json({ ok: true, session: authData.session });
  } catch (e) {
    console.error('[admin-login] Fatal error:', e.message);
    return res.status(500).json({ error: 'Internal error. Please try again.' });
  }
};
