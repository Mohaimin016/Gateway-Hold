import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Cache-Control': 'no-store'
};

function json(res, status, body) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(body);
}

function clean(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || ['-', 'N/A', 'NA', 'NULL', 'null'].includes(s)) return null;
    return s;
  }
  return v;
}

function bool(v) {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined || v === '') return false;
  return ['true','1','yes','y'].includes(String(v).trim().toLowerCase());
}

function normalize(row) {
  return {
    awb: clean(row.awb ?? row.AWB),
    flight_name: clean(row.flight_name ?? row['Flight Name'] ?? row.flight),
    customer_name: clean(row.customer_name ?? row['Customer Name'] ?? row.customer),
    wsc: clean(row.wsc ?? row.WSC),
    wt: clean(row.wt ?? row.weight ?? row.Weight),
    shipper_type: clean(row.shipper_type ?? row['Shipper Type']),
    ship_type: clean(row.ship_type ?? row['Ship Type'] ?? row.shipment_type),
    pickup_date: clean(row.pickup_date ?? row['Pickup Date'] ?? row.pickup),
    stat_77: clean(row.stat_77 ?? row['STAT-77(HUB out)'] ?? row.stat77 ?? row.hub_out),
    gateway_in: clean(row.gateway_in ?? row['Gateway In']),
    gateway_out: clean(row.gateway_out ?? row['Gateway out']),
    delivered: clean(row.delivered ?? row.Delivered ?? row.pod),
    genesis_ok: bool(row.genesis_ok ?? row['Genesis OK']),
    genesis_status: clean(row.genesis_status ?? row['Genesis Status']),
    gateway: clean(row.gateway ?? row.Gateway ?? row.gateway_code)?.toUpperCase() || null
  };
}

function checkWriteKey(req) {
  const expected = process.env.API_KEY;
  if (!expected) return true;
  return req.headers['x-api-key'] === expected;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const {
        gateway, flight, from, to, awb,
        limit = '10000', offset = '0'
      } = req.query || {};

      const lim = Math.min(Math.max(parseInt(limit, 10) || 10000, 1), 20000);
      const off = Math.max(parseInt(offset, 10) || 0, 0);

      const rows = await sql`
        SELECT
          awb, flight_name, customer_name, wsc, wt, shipper_type, ship_type,
          pickup_date, stat_77, gateway_in, gateway_out, delivered,
          genesis_ok, genesis_status, gateway
        FROM shipments
        WHERE (${gateway || null}::text IS NULL OR gateway = ${gateway || null})
          AND (${flight || null}::text IS NULL OR flight_name = ${flight || null})
          AND (${awb || null}::text IS NULL OR awb = ${awb || null})
          AND (${from || null}::date IS NULL OR pickup_date >= ${from || null}::date)
          AND (${to || null}::date IS NULL OR pickup_date < (${to || null}::date + INTERVAL '1 day'))
        ORDER BY pickup_date NULLS LAST, awb
        LIMIT ${lim} OFFSET ${off}
      `;

      return json(res, 200, { shipments: rows, count: rows.length, limit: lim, offset: off });
    }

    if (req.method === 'POST') {
      if (!checkWriteKey(req)) return json(res, 401, { error: 'Invalid or missing API key.' });

      const incoming = Array.isArray(req.body) ? req.body : req.body?.shipments;
      if (!Array.isArray(incoming)) return json(res, 400, { error: 'Expected {"shipments":[...]}.' });
      if (incoming.length > 5000) return json(res, 413, { error: 'Maximum 5,000 shipments per request.' });

      const rows = incoming.map(normalize).filter(r => r.awb);
      if (!rows.length) return json(res, 400, { error: 'No valid shipment rows with AWB were supplied.' });

      let upserted = 0;
      for (const r of rows) {
        await sql`
          INSERT INTO shipments (
            awb, flight_name, customer_name, wsc, wt, shipper_type, ship_type,
            pickup_date, stat_77, gateway_in, gateway_out, delivered,
            genesis_ok, genesis_status, gateway, updated_at
          ) VALUES (
            ${r.awb}, ${r.flight_name}, ${r.customer_name}, ${r.wsc}, ${r.wt},
            ${r.shipper_type}, ${r.ship_type}, ${r.pickup_date}, ${r.stat_77},
            ${r.gateway_in}, ${r.gateway_out}, ${r.delivered}, ${r.genesis_ok},
            ${r.genesis_status}, ${r.gateway}, CURRENT_TIMESTAMP
          )
          ON CONFLICT (awb) DO UPDATE SET
            flight_name = EXCLUDED.flight_name,
            customer_name = EXCLUDED.customer_name,
            wsc = EXCLUDED.wsc,
            wt = EXCLUDED.wt,
            shipper_type = EXCLUDED.shipper_type,
            ship_type = EXCLUDED.ship_type,
            pickup_date = EXCLUDED.pickup_date,
            stat_77 = EXCLUDED.stat_77,
            gateway_in = EXCLUDED.gateway_in,
            gateway_out = EXCLUDED.gateway_out,
            delivered = EXCLUDED.delivered,
            genesis_ok = EXCLUDED.genesis_ok,
            genesis_status = EXCLUDED.genesis_status,
            gateway = EXCLUDED.gateway,
            updated_at = CURRENT_TIMESTAMP
        `;
        upserted++;
      }

      return json(res, 200, { ok: true, upserted });
    }

    return json(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Server error', detail: process.env.NODE_ENV === 'development' ? String(err.message || err) : undefined });
  }
}
