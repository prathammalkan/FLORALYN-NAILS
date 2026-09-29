// api/send-whatsapp.js — Vercel Serverless Function
// Pipeline: validate → Supabase → WhatsApp (Twilio) → Email (Resend)

'use strict';

const twilio   = require('twilio');
const { createClient } = require('@supabase/supabase-js');

let Resend;
try { Resend = require('resend').Resend; } catch (_) {}

// ── In-memory rate limit (per function instance) ───────────────
const rateLimitMap = new Map();
const RATE_LIMIT   = 5;
const WINDOW_MS    = 10 * 60 * 1000; // 10 min

function isRateLimited(ip) {
  const now  = Date.now();
  const hits  = (rateLimitMap.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  if (rateLimitMap.size > 500) rateLimitMap.delete(rateLimitMap.keys().next().value);
  return false;
}

// ── Sanitise ──────────────────────────────────────────────────
function san(val, max = 2000) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
}

// ── Allowed services ─────────────────────────────────────────
const ALLOWED_SERVICES = new Set([
  'Simple Manicure',
  'Gel Nails',
  'Custom Design',
  'Bridal / Special Occasion',
]);

// ── Email HTML ────────────────────────────────────────────────
function buildEmailHtml(d) {
  const row = (label, value) => value ? `
    <tr>
      <td style="padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8F5D87;width:110px;">${label}</td>
      <td style="padding:8px 12px;font-size:15px;color:#3D1A47;font-weight:500;">${value}</td>
    </tr>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;background:#fff7fb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(110,58,117,.12);">
    <div style="background:linear-gradient(135deg,#A47DC4,#E890C0);padding:28px 32px;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,.8);letter-spacing:.1em;text-transform:uppercase;">Floralyn Nail Art Studio</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">💅 New Booking Request</h1>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #F2D6F3;border-radius:12px;overflow:hidden;">
        ${row('Name', d.from_name)}
        ${row('Phone', d.phone)}
        ${row('Date', d.date)}
        ${row('Time', d.time)}
        ${row('Service', d.service)}
        ${row('Message', d.message)}
      </table>
      <div style="margin-top:24px;padding:16px 20px;background:#fff7fb;border-radius:12px;border-left:4px solid #A47DC4;">
        <p style="margin:0;font-size:13px;color:#6E3A75;font-weight:600;">Action Required</p>
        <p style="margin:4px 0 0;font-size:13px;color:#8F5D87;">Reply to this customer to confirm their appointment slot.</p>
      </div>
    </div>
    <div style="padding:16px 32px;background:#FDF0FA;border-top:1px solid #F2D6F3;">
      <p style="margin:0;font-size:12px;color:#8F5D87;">Sent by Floralyn booking system · floralyn-nails.vercel.app</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // ── CORS — permissive for Vercel preview URLs ─────────────────
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || 'https://floralyn-nails.vercel.app';
  // Allow exact match OR any *.vercel.app subdomain of the project
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
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed.' });

  // ── Rate limit ────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Try again later.' });

  // ── Parse body ────────────────────────────────────────────────
  let body;
  try {
    if (!req.body) {
      // Vercel doesn't always auto-parse — manually read stream
      const raw = await new Promise((resolve, reject) => {
        let s = '';
        req.on('data', c => { s += c; if (s.length > 16384) reject(new Error('Too large')); });
        req.on('end', () => resolve(s));
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    } else {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body.' });

  // ── Honeypot (field name _h matches HTML) ─────────────────────
  if (body._h) return res.status(200).json({ ok: true }); // silent reject

  // ── Validate & sanitise ───────────────────────────────────────
  const from_name = san(body.from_name, 120);
  const phone     = san(body.phone, 24);
  const date      = san(body.date, 60);
  const time      = san(body.time, 30);
  const service   = san(body.service || '', 60) || 'Custom Design';
  const message   = san(body.message || '', 800);

  if (!from_name) return res.status(400).json({ error: 'Name is required.' });
  if (!phone)     return res.status(400).json({ error: 'Phone is required.' });
  if (!date)      return res.status(400).json({ error: 'Date is required.' });
  if (!time)      return res.status(400).json({ error: 'Time is required.' });

  // Normalise service (handles minor capitalisation differences)
  const normService = [...ALLOWED_SERVICES].find(s => s.toLowerCase() === service.toLowerCase()) || service;
  if (!ALLOWED_SERVICES.has(normService)) return res.status(400).json({ error: 'Invalid service selection.' });

  const data = { from_name, phone, date, time, service: normService, message };

  const results = { ok: true, saved: false, whatsapp: false, waErrCode: null, waErrMsg: null, email: false, emailErr: null };

  // ── 1. Supabase (non-fatal) ───────────────────────────────────
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey);
      const { error: e } = await sb.from('appointments').insert({
        name: from_name, phone, preferred_time: time,
        preferred_date: null, service: normService,
        message: message || null, status: 'PENDING',
      });
      if (!e) results.saved = true;
      else console.error('[Supabase]', e.message);
    } catch (e) { console.error('[Supabase]', e.message); }
  }

  // ── 2. Twilio WhatsApp (non-fatal) ────────────────────────────
  const tSid  = process.env.TWILIO_ACCOUNT_SID;
  const tAuth = process.env.TWILIO_AUTH_TOKEN;
  const tFrom = (process.env.TWILIO_WHATSAPP_FROM || '+17372508034').replace(/^whatsapp:/, '');
  const tTo   = (process.env.DEST_WHATSAPP_TO   || '').replace(/^whatsapp:/, '');

  if (tSid && tAuth && tTo) {
    try {
      const client = twilio(tSid, tAuth);
      const waBody =
        `💅 *New Floralyn Booking*\n\n` +
        `👤 ${from_name}\n` +
        `📞 ${phone}\n` +
        `📅 ${date} at ${time}\n` +
        `💎 ${normService}` +
        (message ? `\n💬 ${message}` : '');

      try {
        // Attempt 1: free-form body (works if recipient has an active session)
        await client.messages.create({
          from: `whatsapp:${tFrom}`,
          to:   `whatsapp:${tTo}`,
          body: waBody,
        });
        results.whatsapp = true;
      } catch (e1) {
        results.waErrCode = e1.code;
        console.error('[Twilio] body failed:', e1.code, e1.message);

        // Attempt 2: ContentSid template (if TWILIO_CONTENT_SID is set)
        const cSid = process.env.TWILIO_CONTENT_SID;
        if (cSid) {
          try {
            await client.messages.create({
              from: `whatsapp:${tFrom}`,
              to:   `whatsapp:${tTo}`,
              contentSid: cSid,
              contentVariables: JSON.stringify({ '1': from_name, '2': date, '3': time, '4': normService, '5': phone }),
            });
            results.whatsapp = true;
            results.waErrCode = null;
          } catch (e2) {
            results.waErrCode = e2.code;
            results.waErrMsg  = e2.message;
            console.error('[Twilio] template failed:', e2.code, e2.message);
          }
        } else {
          results.waErrMsg = e1.message;
        }
      }
    } catch (e) { results.waErrCode = 'INIT'; results.waErrMsg = e.message; console.error('[Twilio]', e.message); }
  }

  // ── 3. Resend Email (non-fatal) ───────────────────────────────
  const rKey  = process.env.RESEND_API_KEY;
  const rTo   = process.env.OWNER_EMAIL || 'prathamclg7@gmail.com';
  if (Resend && rKey) {
    try {
      const resend = new Resend(rKey);
      const r = await resend.emails.send({
        from:    'Floralyn Bookings <onboarding@resend.dev>',
        to:      [rTo],
        subject: `New Booking: ${from_name} — ${normService} on ${date}`,
        html:    buildEmailHtml(data),
      });
      if (r.error) { results.emailErr = r.error.message; console.error('[Resend]', r.error); }
      else results.email = true;
    } catch (e) { results.emailErr = e.message; console.error('[Resend]', e.message); }
  }

  // ── 4. Telegram Bot (non-fatal, instant, no spam) ────────────
  const tgToken  = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  let   tgSent   = false;
  let   tgErr    = null;

  if (tgToken && tgChatId) {
    try {
      const tgMsg =
        `💅 *New Floralyn Booking!*\n\n` +
        `👤 *Name:* ${from_name}\n` +
        `📞 *Phone:* \`${phone}\`\n` +
        `📅 *Date:* ${date}\n` +
        `⏰ *Time:* ${time}\n` +
        `💎 *Service:* ${normService}` +
        (message ? `\n💬 *Note:* ${message}` : '') +
        `\n\n_Reply to this customer to confirm! 🌸_`;

      const tgRes = await fetch(
        `https://api.telegram.org/bot${tgToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: tgMsg,
            parse_mode: 'Markdown',
          }),
        }
      );
      const tgData = await tgRes.json().catch(() => ({}));
      if (tgData.ok) tgSent = true;
      else { tgErr = tgData.description; console.error('[Telegram]', tgData.description); }
    } catch (e) { tgErr = e.message; console.error('[Telegram]', e.message); }
  }

  return res.status(200).json({ ...results, telegram: tgSent, tgErr });
};
