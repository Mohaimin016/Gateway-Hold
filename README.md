# FedEx Dashboard — Neon API

This backend keeps only shipment-level records in Neon. KPI values are calculated by the dashboard from the returned shipment rows.

## 1. Create the Neon table

Run `sql/schema.sql` in the Neon SQL Editor.

## 2. Deploy to Vercel

Create a new Vercel project from this folder and set these environment variables:

- `DATABASE_URL` = your Neon pooled connection string
- `ALLOWED_ORIGIN` = your GitHub Pages dashboard origin, for example `https://mohaimin016.github.io`
- `API_KEY` = a strong random upload key (recommended)

Do not put `DATABASE_URL` in the HTML.

## 3. API endpoints

- `GET /api/shipments`
- `GET /api/shipments?gateway=DWC`
- `GET /api/shipments?flight=BG584`
- `GET /api/shipments?from=2026-09-23&to=2026-09-25`
- `GET /api/shipments?awb=877558889421`
- `POST /api/shipments` with `{ "shipments": [...] }`

The current dashboard expects `/shipments` and `/shipments/bulk-upsert`. In Vercel, add rewrites if desired, or point the dashboard API base at the `/api` directory and adjust the two paths.

## Security note

If `API_KEY` is configured, POST requests require `X-API-Key`. A browser cannot keep a secret completely secret, so this is protection against accidental/public writes rather than a full authentication system. For a private operational dashboard, add proper user authentication before exposing write access broadly.
