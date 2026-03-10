/**
 * Cloudflare Worker — TURN credential proxy
 *
 * Fetches temporary TURN relay credentials from Metered.ca
 * without exposing the API key in client-side code.
 *
 * Environment secrets (set in Cloudflare dashboard):
 *   METERED_APP  — your Metered app name (e.g. "baby-jeopardy")
 *   METERED_KEY  — your Metered API key
 */

const ALLOWED_ORIGINS = [
  'https://bmills23.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = ALLOWED_ORIGINS.find(a => origin.startsWith(a)) || ALLOWED_ORIGINS[0];

    const headers = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers,
      });
    }

    try {
      const url = `https://${env.METERED_APP}.metered.live/api/v1/turn/credentials?apiKey=${env.METERED_KEY}`;
      const resp = await fetch(url, {
        cf: { cacheTtl: 300 }, // cache at edge for 5 min to limit Metered API calls
      });
      if (!resp.ok) throw new Error(`Metered returned ${resp.status}`);
      const creds = await resp.json();

      return new Response(JSON.stringify(creds), { headers });
    } catch (e) {
      // Return empty array so the game falls back to STUN-only
      return new Response(JSON.stringify([]), {
        status: 502, headers,
      });
    }
  },
};
