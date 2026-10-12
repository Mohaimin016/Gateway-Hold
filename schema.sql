CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    awb VARCHAR(30) NOT NULL UNIQUE,
    flight_name VARCHAR(30),
    customer_name TEXT,
    wsc VARCHAR(30),
    wt NUMERIC(12,2),
    shipper_type VARCHAR(50),
    ship_type VARCHAR(50),
    pickup_date TIMESTAMP,
    stat_77 TIMESTAMP,
    gateway_in TIMESTAMP,
    gateway_out TIMESTAMP,
    delivered TIMESTAMP,
    genesis_ok BOOLEAN DEFAULT FALSE,
    genesis_status VARCHAR(30),
    gateway VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    country VARCHAR(10),
    stat_14 TEXT,
    bd_hub_hold_reason TEXT,
    gateway_hold_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway ON shipments(gateway);
CREATE INDEX IF NOT EXISTS idx_shipments_flight ON shipments(flight_name);
CREATE INDEX IF NOT EXISTS idx_shipments_awb ON shipments(awb);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway_in ON shipments(gateway_in);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway_out ON shipments(gateway_out);
CREATE INDEX IF NOT EXISTS idx_shipments_country ON shipments(country);


-- Dashboard users (passwords are stored as one-way pgcrypto hashes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dashboard_users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_users_user_id ON dashboard_users(user_id);


-- Add new shipment metadata columns to an existing Neon table without deleting data.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS country VARCHAR(10);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS stat_14 TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bd_hub_hold_reason TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS gateway_hold_reason TEXT;
