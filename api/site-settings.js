// api/site-settings.js
// Public endpoint — returns safe, non-sensitive site settings + visible gallery
// Uses service_role server-side because the `settings` table RLS is admin-only,
// and strictly whitelists only public-safe keys.
'use strict';

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!sbUrl || !sbKey) {
      return res.status(200).json({ ok: false, settings: {}, gallery: [] });
    }

    const sb = createClient(sbUrl, sbKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch only the public-safe settings keys + visible gallery photos
    const [settingsRes, galleryRes] = await Promise.all([
      sb.from('settings')
        .select('key, value')
        .in('key', ['banner', 'services_display', 'hero']),
      sb.from('gallery')
        .select('public_url, alt_text, title')
        .eq('visible', true)
        .order('sort_order', { ascending: true })
        .limit(24),
    ]);

    if (settingsRes.error) throw settingsRes.error;

    const out = {};
    (settingsRes.data || []).forEach(row => { out[row.key] = row.value; });

    const gallery = (!galleryRes.error && Array.isArray(galleryRes.data))
      ? galleryRes.data.filter(g => typeof g.public_url === 'string' && g.public_url.startsWith('https://'))
      : [];

    return res.status(200).json({ ok: true, settings: out, gallery });
  } catch (e) {
    // Always succeed — frontend degrades gracefully
    console.error('[site-settings]', e.message);
    return res.status(200).json({ ok: false, settings: {}, gallery: [] });
  }
};
