import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

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

    // Read the user and bcrypt/pgcrypto hash from Neon. Password verification
    // is performed in Node so login does not depend on PostgreSQL crypt().
    const rows = await sql`
      SELECT id, user_id, password_hash, active
      FROM dashboard_users
      WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(${userId}))
      LIMIT 1
    `;

    if (!rows.length || rows[0].active !== true || !rows[0].password_hash) {
      return json(res, 401, { ok: false, error: 'Invalid User ID or password.' });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
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
