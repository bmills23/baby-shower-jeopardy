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

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Bail early if secrets aren't configured
    if (!env.METERED_APP || !env.METERED_KEY) {
      return new Response(JSON.stringify({
        error: 'Missing secrets',
        hasApp: !!env.METERED_APP,
        hasKey: !!env.METERED_KEY,
      }), { status: 500, headers });
    }

    try {
      const url = `https://${env.METERED_APP}.metered.live/api/v1/turn/credentials?apiKey=${env.METERED_KEY}`;
      const resp = await fetch(url);
      const body = await resp.text();

      if (!resp.ok) {
        return new Response(JSON.stringify({
          error: 'Metered API error',
          status: resp.status,
          body: body.substring(0, 200),
        }), { status: 502, headers });
      }

      return new Response(body, { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502, headers,
      });
    }
  },
};
