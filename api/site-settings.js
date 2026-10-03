// api/site-settings.js
// Public endpoint — returns safe, non-sensitive site settings
// Used by the frontend to apply dynamic banner, prices, content
'use strict';

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch only the public-safe settings keys
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['banner', 'services_display', 'hero']);

    if (error) throw error;

    const out = {};
    (data || []).forEach(row => { out[row.key] = row.value; });

    return res.status(200).json({ ok: true, settings: out });
  } catch (e) {
    // Always succeed — frontend degrades gracefully
    console.error('[site-settings]', e.message);
    return res.status(200).json({ ok: false, settings: {} });
  }
};
