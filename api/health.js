// api/health.js — diagnostic endpoint (safe — no secrets revealed)
'use strict';
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok:          true,
    resend:      !!process.env.RESEND_API_KEY,
    supabase:    !!process.env.SUPABASE_URL,
    telegram:    !!process.env.TELEGRAM_BOT_TOKEN,
    admin_auth:  !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD),
    ts:          new Date().toISOString(),
  });
};
