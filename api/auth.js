import { neon } from '@neondatabase/serverless';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

function json(res, status, body) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(status).json(body);
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not configured for this Vercel deployment.');
    error.code = 'DATABASE_URL_MISSING';
    throw error;
  }
  return neon(process.env.DATABASE_URL);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  try {
    const sql = getSql();

    // Safe, read-only health check so deployment/database issues can be
    // diagnosed without exposing credentials or any user records.
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT
          TRUE AS database_connected,
          (to_regclass('public.dashboard_users') IS NOT NULL) AS users_table_ready,
          (to_regprocedure('crypt(text,text)') IS NOT NULL) AS password_crypto_ready
      `;
      const status = rows[0] || {};
      const ready = Boolean(status.database_connected && status.users_table_ready && status.password_crypto_ready);
      return json(res, ready ? 200 : 503, {
        ok: ready,
        service: 'dashboard-auth',
        databaseConnected: Boolean(status.database_connected),
        usersTableReady: Boolean(status.users_table_ready),
        passwordCryptoReady: Boolean(status.password_crypto_ready),
        ...(ready ? {} : { error: 'Auth database setup is incomplete. Check the missing readiness item above.' })
      });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    const userId = String(req.body?.userId || '').trim();
    const password = String(req.body?.password || '');

    if (!userId || !password) {
      return json(res, 400, { ok: false, error: 'User ID and password are required.' });
    }

    const rows = await sql`
      SELECT id, user_id
      FROM public.dashboard_users
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
    const diagnostic = err?.code === 'DATABASE_URL_MISSING'
      ? 'DATABASE_URL_MISSING'
      : (typeof err?.code === 'string' ? err.code : 'AUTH_DATABASE_ERROR');
    return json(res, 500, {
      ok: false,
      error: 'Authentication service is unavailable.',
      diagnostic
    });
  }
}
