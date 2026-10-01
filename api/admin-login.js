// api/admin-login.js — Vercel Serverless Function
// Secure server-side admin authentication for Floralyn Admin Panel

'use strict';

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // CORS
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || 'https://floralyn-nails.vercel.app';
  const isAllowed = !origin
    || origin === allowed
    || /^https:\/\/floralyn-nails(-[a-z0-9]+)?\.vercel\.app$/.test(origin)
    || origin === 'http://localhost:3000'
    || origin === 'http://localhost:5500';

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  // Parse body safely
  let body;
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      const raw = await new Promise((resolve, reject) => {
        let s = '';
        req.on('data', c => { s += c; if (s.length > 16384) reject(new Error('Too large')); });
        req.on('end', () => resolve(s));
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const expectedUser = (process.env.ADMIN_USERNAME || 'Nishita@1311').trim().toLowerCase();
  const expectedPass = process.env.ADMIN_PASSWORD || 'Floralyn@1311';

  const inputUser = String(username).trim().toLowerCase();
  const inputPass = String(password);

  // Validate credentials
  if (inputUser !== expectedUser || inputPass !== expectedPass) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://znycuzuveqhybqgevjvj.supabase.co';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueWN1enV2ZXFoeWJxZ2V2anZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTcyMTQsImV4cCI6MjEwNjE5MzIxNH0.cPYdpp6peTFX4e88K4yb8f1tbaV96ifqoy7TrCyEAxQ';

  const adminEmail = 'nishita@1311.com';

  // 1. If service role key is present, guarantee the admin user is confirmed in Supabase
  if (serviceKey && serviceKey !== 'YOUR_SERVICE_ROLE_KEY_HERE') {
    try {
      const sbAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: usersData, error: listErr } = await sbAdmin.auth.admin.listUsers();
      if (!listErr && usersData?.users) {
        const existing = usersData.users.find(u => u.email && u.email.toLowerCase() === adminEmail);
        if (existing) {
          await sbAdmin.auth.admin.updateUserById(existing.id, {
            password: expectedPass,
            email_confirm: true,
            user_metadata: { username: 'Nishita@1311' }
          });
        } else {
          await sbAdmin.auth.admin.createUser({
            email: adminEmail,
            password: expectedPass,
            email_confirm: true,
            user_metadata: { username: 'Nishita@1311' }
          });
        }
      }
    } catch (adminErr) {
      console.error('[Admin setup in Supabase error]:', adminErr.message);
    }
  }

  // 2. Sign in to Supabase to obtain full authenticated JWT session
  try {
    const sbAuth = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authErr } = await sbAuth.auth.signInWithPassword({
      email: adminEmail,
      password: expectedPass
    });

    if (authErr) {
      console.error('[Supabase signIn error]:', authErr.message);
      return res.status(401).json({ error: 'Authentication failed. Please verify credentials.' });
    }

    return res.status(200).json({
      ok: true,
      session: authData.session
    });
  } catch (err) {
    console.error('[Auth handler error]:', err.message);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
};
