// api/health.js — diagnostic endpoint (safe — reveals no secrets)
'use strict';
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    twilio_sid:    !!process.env.TWILIO_ACCOUNT_SID,
    twilio_auth:   !!process.env.TWILIO_AUTH_TOKEN,
    twilio_from:   process.env.TWILIO_WHATSAPP_FROM || 'NOT SET',
    twilio_to:     process.env.DEST_WHATSAPP_TO     || 'NOT SET',
    resend:        !!process.env.RESEND_API_KEY,
    supabase_url:  !!process.env.SUPABASE_URL,
    supabase_key:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    owner_email:   process.env.OWNER_EMAIL || 'NOT SET',
  });
};
