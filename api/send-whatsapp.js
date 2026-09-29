// api/send-whatsapp.js — Vercel API Route
// Handles: rate limiting → validation → Supabase save → WhatsApp (Twilio) → Email (Resend)

'use strict';

const twilio   = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// Resend — conditional require so deploy doesn't break if not installed yet
let Resend;
try { Resend = require('resend').Resend; } catch (_) {}

// ── In-memory rate limit (per Vercel function instance) ───────
const rateLimitMap = new Map();
const RATE_LIMIT   = 5;
const WINDOW_MS    = 10 * 60 * 1000; // 10 minutes

function isRateLimited(ip) {
  const now  = Date.now();
  const hits  = rateLimitMap.get(ip) || [];
  const fresh = hits.filter(t => now - t < WINDOW_MS);
  if (fresh.length >= RATE_LIMIT) return true;
  fresh.push(now);
  rateLimitMap.set(ip, fresh);
  // Prune map to prevent memory growth
  if (rateLimitMap.size > 500) {
    const oldestKey = rateLimitMap.keys().next().value;
    rateLimitMap.delete(oldestKey);
  }
  return false;
}

// ── Sanitise ──────────────────────────────────────────────────
function sanitise(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/\0/g, '').trim().slice(0, 2000);
}

// ── Allowed services ──────────────────────────────────────────
const ALLOWED_SERVICES = new Set([
  'Simple Manicure',
  'Gel Nails',
  'Custom Design',
  'Bridal / Special Occasion',
]);

// ── Email HTML template ───────────────────────────────────────
function buildEmailHtml(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff7fb; color: #6E3A75; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 520px; margin: 0 auto; box-shadow: 0 4px 20px rgba(110,58,117,0.1); }
    h1 { font-size: 22px; margin: 0 0 4px; color: #6E3A75; }
    .sub { font-size: 14px; color: #8F5D87; margin: 0 0 24px; }
    .row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .field { flex: 1; min-width: 180px; background: #fff7fb; border-radius: 10px; padding: 12px 16px; }
    .label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #8F5D87; margin-bottom: 4px; }
    .value { font-size: 15px; font-weight: 500; color: #6E3A75; }
    .badge { display: inline-block; background: linear-gradient(135deg, #A47DC4, #E890C0); color: #fff; font-size: 13px; font-weight: 600; padding: 5px 16px; border-radius: 50px; margin: 20px 0; }
    .footer { font-size: 12px; color: #8F5D87; margin-top: 24px; border-top: 1px solid #F2D6F3; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>💅 New Booking Enquiry</h1>
    <p class="sub">Floralyn Nail Art Studio</p>

    <div class="row">
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${data.from_name}</div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${data.phone}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="label">Date</div>
        <div class="value">${data.date}</div>
      </div>
      <div class="field">
        <div class="label">Time</div>
        <div class="value">${data.time}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="label">Service</div>
        <div class="value">${data.service}</div>
      </div>
      ${data.instagram ? `<div class="field"><div class="label">Instagram</div><div class="value">${data.instagram}</div></div>` : ''}
    </div>

    ${data.email ? `<div class="row"><div class="field"><div class="label">Email</div><div class="value">${data.email}</div></div></div>` : ''}

    ${data.message ? `<div class="row"><div class="field" style="flex:1 1 100%"><div class="label">Special Request</div><div class="value">${data.message}</div></div></div>` : ''}

    <span class="badge">Action Required — Confirm or decline this appointment</span>

    <div class="footer">
      This notification was sent automatically by the Floralyn booking system.
    </div>
  </div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  const origin = req.headers.origin || '';
  if (allowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Parse body
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid request body.' }); }

  // Honeypot
  if (body._gotcha) return res.status(200).json({ ok: true }); // silent

  // Validate required fields
  const from_name = sanitise(body.from_name);
  const phone     = sanitise(body.phone);
  const date      = sanitise(body.date);
  const time      = sanitise(body.time);
  const service   = sanitise(body.service || 'Gel Nails');
  const instagram = sanitise(body.instagram || '');
  const email     = sanitise(body.email || '');
  const message   = sanitise(body.message || '');

  if (!from_name) return res.status(400).json({ error: 'Name is required.' });
  if (!phone)     return res.status(400).json({ error: 'Phone number is required.' });
  if (!date)      return res.status(400).json({ error: 'Date is required.' });
  if (!time)      return res.status(400).json({ error: 'Time is required.' });
  if (from_name.length > 120) return res.status(400).json({ error: 'Name too long.' });
  if (phone.length > 24)      return res.status(400).json({ error: 'Phone too long.' });
  if (!ALLOWED_SERVICES.has(service)) return res.status(400).json({ error: 'Invalid service.' });

  const data = { from_name, phone, date, time, service, instagram, email, message };

  // ── 1. Save to Supabase (non-fatal) ──────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let   dbSaved     = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { error: dbErr } = await sb.from('appointments').insert({
        name:           from_name,
        phone,
        instagram:      instagram || null,
        email:          email || null,
        preferred_date: null,   // date is a formatted string here, parse as needed
        preferred_time: time,
        service,
        message:        message || null,
        status:         'PENDING',
      });
      if (!dbErr) dbSaved = true;
    } catch (err) {
      console.error('[Supabase] Save error:', err.message);
    }
  }

  // ── 2. Twilio WhatsApp (non-fatal) ────────────────────────────
  const twilioSid  = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const fromWa     = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+17372508034';
  const toWa       = process.env.DEST_WHATSAPP_TO;
  let   waSent     = false;

  if (twilioSid && twilioAuth && toWa) {
    try {
      const client = twilio(twilioSid, twilioAuth);
      const waMsg  =
        `💅 *New Booking — Floralyn*\n\n` +
        `👤 *Name:* ${from_name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `📅 *Date:* ${date}\n` +
        `⏰ *Time:* ${time}\n` +
        `💎 *Service:* ${service}\n` +
        (instagram ? `📷 *Instagram:* ${instagram}\n` : '') +
        (email     ? `📧 *Email:* ${email}\n`         : '') +
        (message   ? `\n💬 *Note:* ${message}\n`      : '') +
        `\n_Sent via Floralyn booking form_`;

      await client.messages.create({
        from: fromWa.startsWith('whatsapp:') ? fromWa : `whatsapp:${fromWa}`,
        to:   toWa.startsWith('whatsapp:')   ? toWa   : `whatsapp:${toWa}`,
        body: waMsg,
      });
      waSent = true;
    } catch (err) {
      console.error('[Twilio] WhatsApp error:', err.message);
    }
  }

  // ── 3. Resend email (non-fatal) ───────────────────────────────
  const resendKey  = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL || 'floralyyn7@gmail.com';
  let   emailSent  = false;

  if (Resend && resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    'Floralyn Bookings <onboarding@resend.dev>',
        to:      ownerEmail,
        subject: `💅 New Appointment: ${from_name} — ${service}`,
        html:    buildEmailHtml(data),
      });
      emailSent = true;
    } catch (err) {
      console.error('[Resend] Email error:', err.message);
    }
  }

  // ── Respond ───────────────────────────────────────────────────
  return res.status(200).json({
    ok:         true,
    saved:      dbSaved,
    whatsapp:   waSent,
    email:      emailSent,
  });
};
