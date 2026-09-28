// api/send-whatsapp.js
// Vercel Serverless Function
// Validates → saves appointment to Supabase → sends WhatsApp via Twilio
// Replaces: netlify/functions/send-whatsapp.js

'use strict';

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// ─── Rate Limiting (in-memory per function instance) ────────────────────────
// For a small business site this is appropriate. Per Vercel instance isolation,
// in the worst case a bot gets RATE_LIMIT_MAX * N requests where N is the number
// of active instances — still a meaningful throttle without any external service.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5; // 5 submissions per IP per window

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    // Prune stale entries every 500 entries to prevent memory growth
    if (rateLimitMap.size > 500) {
      for (const [k, v] of rateLimitMap) {
        if (now - v.firstRequest > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(k);
      }
    }
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) return true;
  record.count++;
  return false;
}

// ─── Input helpers ────────────────────────────────────────────────────────────
const ALLOWED_SERVICES = new Set([
  'Simple Manicure',
  'Gel Nails',
  'Custom Design',
  'Bridal / Special Occasion',
]);

/**
 * Trims, removes null bytes, and enforces max length.
 * Returns empty string if input is not a string.
 */
function sanitize(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return val.replace(/\x00/g, '').trim().slice(0, maxLen);
}

/**
 * Returns true if dateStr is YYYY-MM-DD format and not in the past.
 * Uses UTC midnight to avoid timezone edge cases at boundary.
 */
function isValidFutureDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  return d >= todayUTC;
}

// ─── CORS helper ──────────────────────────────────────────────────────────────
function setCORSHeaders(res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // ── Rate limiting ───────────────────────────────────────────────────────
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ip = rawIp.split(',')[0].trim();

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Invalid request format.' });
  }

  // ── Honeypot — silent bot rejection ─────────────────────────────────────
  if (typeof body._gotcha === 'string' && body._gotcha.trim() !== '') {
    console.log('[Honeypot] Bot submission caught from IP:', ip);
    return res.status(200).json({ success: true }); // Deceive the bot
  }

  // ── Extract and validate ─────────────────────────────────────────────────
  const from_name = sanitize(body.from_name, 100);
  const phone     = sanitize(body.phone, 30);
  const instagram = sanitize(body.instagram, 60);
  const email     = sanitize(body.email, 200);
  const date      = sanitize(body.date, 20);
  const time      = sanitize(body.time, 20);
  const service   = sanitize(body.service, 100);
  const message   = sanitize(body.message, 1000);

  const errors = [];

  if (!from_name || from_name.length < 2)    errors.push('A valid name is required.');
  if (!phone || phone.length < 7)            errors.push('A valid phone number is required.');
  if (!date)                                 errors.push('A preferred date is required.');
  else if (!isValidFutureDate(date))         errors.push('Date must be today or a future date.');
  if (!time)                                 errors.push('A preferred time is required.');
  if (!service)                              errors.push('Please select a service.');
  else if (!ALLOWED_SERVICES.has(service))   errors.push('Invalid service selected.');

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  let appointmentId = null;

  // ── Persist to Supabase ──────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data, error: dbError } = await supabase
        .from('appointments')
        .insert({
          name:           from_name,
          phone,
          instagram:      instagram || null,
          email:          email || null,
          preferred_date: date,
          preferred_time: time,
          service,
          message:        message || null,
          status:         'PENDING',
        })
        .select('id')
        .single();

      if (dbError) {
        // Log detail server-side, never expose to client
        console.error('[Supabase] Insert error:', dbError.code, dbError.message);
      } else {
        appointmentId = data?.id;
        console.log('[Supabase] Appointment saved:', appointmentId);
      }
    } catch (err) {
      console.error('[Supabase] Unexpected error:', err.message);
    }
  } else {
    console.warn('[Supabase] Not configured — skipping DB save.');
  }

  // ── Send WhatsApp via Twilio ─────────────────────────────────────────────
  let whatsappSent = false;

  const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const waFrom      = process.env.TWILIO_WHATSAPP_FROM;
  const waTo        = process.env.DEST_WHATSAPP_TO;

  if (twilioSid && twilioToken && waFrom && waTo) {
    try {
      const client = twilio(twilioSid, twilioToken);

      const lines = [
        '💅 *New Appointment — Floralyn*',
        '',
        `👤 *Name:* ${from_name}`,
        `📞 *Phone:* ${phone}`,
      ];
      if (instagram) lines.push(`📸 *Instagram:* ${instagram}`);
      if (email)     lines.push(`📧 *Email:* ${email}`);
      lines.push('');
      lines.push(`📅 *Date:* ${date}`);
      lines.push(`⏰ *Time:* ${time}`);
      lines.push(`💖 *Service:* ${service}`);
      if (message)        lines.push(`📝 *Note:* ${message}`);
      if (appointmentId)  lines.push(`\n🔑 *Ref:* ${appointmentId.slice(0, 8).toUpperCase()}`);

      await client.messages.create({
        from: `whatsapp:${waFrom}`,
        to:   `whatsapp:${waTo}`,
        body: lines.join('\n'),
      });

      whatsappSent = true;
      console.log('[Twilio] WhatsApp sent successfully.');
    } catch (err) {
      // WhatsApp failure does NOT fail the appointment — it is already saved to DB
      console.error('[Twilio] WhatsApp error:', err.message);
    }
  } else {
    console.warn('[Twilio] Not configured — skipping WhatsApp notification.');
  }

  // ── Respond — no internal data exposed ──────────────────────────────────
  return res.status(200).json({
    success: true,
    saved:    !!appointmentId,
    notified: whatsappSent,
  });
};
