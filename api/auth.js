import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

function json(res, status, body) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const userId = String(req.body?.userId || '').trim();
    const password = String(req.body?.password || '');

    if (!userId || !password) {
      return json(res, 400, { ok: false, error: 'User ID and password are required.' });
    }

    // pgcrypto must already be enabled because dashboard_users.password_hash
    // is created with crypt(). Do not run CREATE EXTENSION during login.
    const rows = await sql`
      SELECT id, user_id
      FROM dashboard_users
      WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(${userId}))
        AND COALESCE(active, TRUE) = TRUE
        AND password_hash IS NOT NULL
        AND password_hash <> ''
        AND password_hash = crypt(${password}, password_hash)
      LIMIT 1
    `;

    if (!rows.length) {
      return json(res, 401, { ok: false, error: 'Invalid User ID or password.' });
    }

    return json(res, 200, {
      ok: true,
      user: { id: rows[0].id, userId: rows[0].user_id }
    });
  } catch (err) {
    console.error('Dashboard authentication error:', err);
    return json(res, 500, {
      ok: false,
      error: 'Authentication service is unavailable.'
    });
  }
}
