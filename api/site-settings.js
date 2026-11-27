// api/site-settings.js
// Public endpoint — returns safe, public-ready CMS configuration,
// enabled services, and visible gallery photos from Supabase.
'use strict';

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_KEYS = [
  'banner',
  'services_display',
  'hero',
  'business',
  'booking',
  'timeslots',
  'polish_bar',
  'faq',
  'gallery_meta',
];

const SERVICE_DEFAULTS = {
  'Simple Manicure': {
    price: 'from ₹300', duration: '~45 min', tag: '', icon: '🌸', featured: false,
    includes: ['Cuticle Ritual', 'Shaping', 'Classic Gloss'],
  },
  'Gel Nails': {
    price: 'from ₹700', duration: '~60 min', tag: '', icon: '✨', featured: false,
    includes: ['Natural Builder', '2–4 Wk Wear', 'Glaze / Ombre'],
  },
  'Custom Design': {
    price: 'from ₹1,200', duration: '~90 min', tag: 'Signature Atelier', icon: '🎨', featured: true,
    includes: ['100% Freehand', '3D / Velvet Art', 'Mood Consultation'],
  },
  'Bridal / Special Occasion': {
    price: 'from ₹2,000', duration: '~2 hrs', tag: '', icon: '💍', featured: false,
    includes: ['Outfit Matching', 'Micro-Pearls & Foil', 'Private Prep'],
  },
};

function sanitizeBusiness(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {
    name:        typeof raw.name === 'string' ? raw.name.slice(0, 80) : undefined,
    email:       typeof raw.email === 'string' ? raw.email.slice(0, 120) : undefined,
    instagram:   typeof raw.instagram === 'string' && /^https:\/\//i.test(raw.instagram)
                   ? raw.instagram.slice(0, 200) : undefined,
    location:    typeof raw.location === 'string' ? raw.location.slice(0, 120) : undefined,
    hours_text:  typeof raw.hours_text === 'string' ? raw.hours_text.slice(0, 120) : undefined,
    closed_note: typeof raw.closed_note === 'string' ? raw.closed_note.slice(0, 120) : undefined,
    show_phone:  Boolean(raw.show_phone),
  };
  // Only expose studio phone publicly if the owner explicitly enabled it
  if (out.show_phone && typeof raw.phone === 'string') {
    out.phone = raw.phone.slice(0, 30);
  }
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!sbUrl || !sbKey) {
      return res.status(200).json({ ok: false, settings: {}, services: [], gallery: [] });
    }

    const sb = createClient(sbUrl, sbKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [settingsRes, servicesRes, galleryRes] = await Promise.all([
      sb.from('settings')
        .select('key, value')
        .in('key', ALLOWED_KEYS),
      sb.from('services')
        .select('id, name, description, enabled, sort_order')
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
        .limit(40),
      sb.from('gallery')
        .select('id, public_url, alt_text, title, sort_order')
        .eq('visible', true)
        .order('sort_order', { ascending: true })
        .limit(36),
    ]);

    if (settingsRes.error) throw settingsRes.error;

    const out = {};
    (settingsRes.data || []).forEach(row => {
      if (row.key === 'business') {
        const clean = sanitizeBusiness(row.value);
        if (clean) out.business = clean;
      } else if (row.key !== 'gallery_meta') {
        out[row.key] = row.value;
      }
    });

    const galleryMeta = (settingsRes.data || []).find(r => r.key === 'gallery_meta')?.value || {};
    const svcDisplay  = out.services_display || {};

    const services = (!servicesRes.error && Array.isArray(servicesRes.data))
      ? servicesRes.data.map(s => {
          const def  = SERVICE_DEFAULTS[s.name] || {};
          const meta = svcDisplay[s.id] || svcDisplay[s.name] || {};
          return {
            id:          s.id,
            name:        s.name,
            description: meta.description || s.description || '',
            price:       meta.price !== undefined && meta.price !== '' ? meta.price : (def.price || ''),
            duration:    meta.duration !== undefined && meta.duration !== '' ? meta.duration : (def.duration || ''),
            tag:         meta.tag !== undefined ? meta.tag : (def.tag || ''),
            icon:        meta.icon || def.icon || '💅',
            includes:    Array.isArray(meta.includes) && meta.includes.length ? meta.includes : (def.includes || []),
            featured:    meta.featured !== undefined ? Boolean(meta.featured) : Boolean(def.featured),
            sort_order:  s.sort_order,
          };
        })
      : [];

    const gallery = (!galleryRes.error && Array.isArray(galleryRes.data))
      ? galleryRes.data
          .filter(g => typeof g.public_url === 'string' && g.public_url.startsWith('https://'))
          .map(g => {
            const gm = galleryMeta[g.id] || {};
            return {
              id:         g.id,
              public_url: g.public_url,
              alt_text:   g.alt_text,
              title:      g.title,
              category:   gm.category || 'studio',
              tech:       gm.tech || '',
            };
          })
      : [];

    return res.status(200).json({ ok: true, settings: out, services, gallery });
  } catch (e) {
    console.error('[site-settings]', e.message);
    return res.status(200).json({ ok: false, settings: {}, services: [], gallery: [] });
  }
};
