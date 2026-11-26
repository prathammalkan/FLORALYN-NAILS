// api/health.js — diagnostic endpoint (safe — no secrets revealed)
'use strict';
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok:          true,
    version:     '3.1',
    resend:      !!process.env.RESEND_API_KEY,
    supabase:    !!process.env.SUPABASE_URL,
    supabase_anon: !!process.env.SUPABASE_ANON_KEY,
    telegram:    !!process.env.TELEGRAM_BOT_TOKEN,
    allowed_origin: process.env.ALLOWED_ORIGIN || '(not set)',
    ts:          new Date().toISOString(),
  });
};
