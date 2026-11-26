// api/health.js — minimal health check endpoint (no configuration/stack disclosure)
'use strict';
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
  });
};
