// api/send-whatsapp.js
// Channels: Supabase (DB) → Resend (email) → Telegram (instant push)
// Twilio removed — Email + Telegram is faster, free forever, zero spam.

'use strict';

const { createClient } = require('@supabase/supabase-js');
let Resend;
try { Resend = require('resend').Resend; } catch (_) {}

// ── Rate limiting (in-memory per function instance) ───────────
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now  = Date.now();
  const hits = (rateLimitMap.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (hits.length >= 5) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  if (rateLimitMap.size > 500) rateLimitMap.delete(rateLimitMap.keys().next().value);
  return false;
}

// ── Sanitise ──────────────────────────────────────────────────
function san(v, max = 2000) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
}

// ── Allowed services ──────────────────────────────────────────
const SERVICES = new Set(['Simple Manicure','Gel Nails','Custom Design','Bridal / Special Occasion']);

// ── Email HTML ────────────────────────────────────────────────
function buildEmail(d) {
  const row = (label, val) => !val ? '' : `
    <tr>
      <td style="padding:9px 14px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8F5D87;width:100px;vertical-align:top;">${label}</td>
      <td style="padding:9px 14px;font-size:14px;color:#3D1A47;font-weight:500;">${val}</td>
    </tr>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:20px 8px;background:#fff7fb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(110,58,117,.12);">
    <div style="background:linear-gradient(135deg,#A47DC4,#E890C0);padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);">Floralyn Nail Art Studio</p>
      <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">💅 New Booking Request</h1>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #F2D6F3;border-radius:12px;overflow:hidden;">
        ${row('Name', d.from_name)}
        ${row('Phone', d.phone)}
        ${row('Date', d.date)}
        ${row('Time', d.time)}
        ${row('Service', d.service)}
        ${row('Note', d.message)}
      </table>
      <div style="margin-top:20px;padding:14px 18px;background:#fff7fb;border-radius:12px;border-left:3px solid #A47DC4;">
        <p style="margin:0;font-size:13px;color:#6E3A75;font-weight:600;">Action Required</p>
        <p style="margin:4px 0 0;font-size:12px;color:#8F5D87;line-height:1.5;">Contact ${d.from_name} at ${d.phone} to confirm their slot.</p>
      </div>
    </div>
    <div style="padding:12px 28px 16px;border-top:1px solid #F2D6F3;">
      <p style="margin:0;font-size:11px;color:#8F5D87;">Floralyn booking system · floralyn-nails.vercel.app</p>
    </div>
  </div>
</body></html>`;
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  const origin  = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || 'https://floralyn-nails.vercel.app';
  const ok = !origin || origin === allowed
    || /^https:\/\/floralyn-nails(-[a-z0-9]+)?\.vercel\.app$/.test(origin)
    || origin === 'http://localhost:3000' || origin === 'http://localhost:5500';
  if (ok && origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed.' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Try again in 10 minutes.' });

  // Parse body
  let body;
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      const raw = await new Promise((res, rej) => {
        let s = '';
        req.on('data', c => { s += c; if (s.length > 16384) rej(new Error('Too large')); });
        req.on('end', () => res(s));
        req.on('error', rej);
      });
      body = JSON.parse(raw);
    }
  } catch { return res.status(400).json({ error: 'Invalid request body.' }); }

  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body.' });

  // Honeypot
  if (body._h) return res.status(200).json({ ok: true });

  // Validate
  const from_name = san(body.from_name, 120);
  const phone     = san(body.phone, 24);
  const date      = san(body.date, 60);
  const time      = san(body.time, 30);
  const service   = san(body.service || '', 60);
  const message   = san(body.message || '', 800);

  if (!from_name) return res.status(400).json({ error: 'Name is required.' });
  if (!phone)     return res.status(400).json({ error: 'Phone is required.' });
  if (!date)      return res.status(400).json({ error: 'Date is required.' });
  if (!time)      return res.status(400).json({ error: 'Time is required.' });

  const normSvc = [...SERVICES].find(s => s.toLowerCase() === service.toLowerCase()) || 'Custom Design';
  if (!SERVICES.has(normSvc)) return res.status(400).json({ error: 'Invalid service.' });

  const data = { from_name, phone, date, time, service: normSvc, message };
  const out  = { ok: true, saved: false, email: false, emailErr: null, telegram: false, tgErr: null };

  // ── 1. Supabase ───────────────────────────────────────────────
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const sb = createClient(sbUrl, sbKey);
      const { error: e } = await sb.from('appointments').insert({
        name: from_name, phone, preferred_time: time,
        preferred_date: null, service: normSvc,
        message: message || null, status: 'PENDING',
      });
      if (!e) out.saved = true;
      else console.error('[Supabase]', e.message);
    } catch (e) { console.error('[Supabase]', e.message); }
  }

  // ── 2. Resend Email ───────────────────────────────────────────
  const rKey  = process.env.RESEND_API_KEY;
  const rTo   = process.env.OWNER_EMAIL || 'prathamclg7@gmail.com';
  if (Resend && rKey) {
    try {
      const resend = new Resend(rKey);
      const r = await resend.emails.send({
        from:    'Floralyn Bookings <onboarding@resend.dev>',
        to:      [rTo],
        subject: `New Booking: ${from_name} — ${normSvc} · ${date}`,
        html:    buildEmail(data),
      });
      if (r.error) { out.emailErr = r.error.message; console.error('[Resend]', r.error); }
      else out.email = true;
    } catch (e) { out.emailErr = e.message; console.error('[Resend]', e.message); }
  }

  // ── 3. Telegram (multi-recipient, comma-separated chat IDs) ───
  const tgToken   = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatIds = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  if (tgToken && tgChatIds.length) {
    const tgMsg =
      `💅 *New Floralyn Booking!*\n\n` +
      `👤 *Name:* ${from_name}\n` +
      `📞 *Phone:* \`${phone}\`\n` +
      `📅 *Date:* ${date}\n` +
      `⏰ *Time:* ${time}\n` +
      `💎 *Service:* ${normSvc}` +
      (message ? `\n💬 *Note:* ${message}` : '') +
      `\n\n_Contact client to confirm 🌸_`;

    const sends = tgChatIds.map(chatId =>
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: chatId, text: tgMsg, parse_mode: 'Markdown' }),
      })
      .then(r => r.json().catch(() => ({})))
      .then(d => { if (!d.ok) console.error(`[Telegram:${chatId}]`, d.description); return d.ok; })
      .catch(e => { console.error(`[Telegram:${chatId}]`, e.message); return false; })
    );
    const sent = await Promise.all(sends);
    out.telegram = sent.some(Boolean);
    if (!out.telegram) out.tgErr = 'All recipients failed';
  }

  return res.status(200).json(out);
};
