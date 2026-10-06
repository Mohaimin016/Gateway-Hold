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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway ON shipments(gateway);
CREATE INDEX IF NOT EXISTS idx_shipments_flight ON shipments(flight_name);
CREATE INDEX IF NOT EXISTS idx_shipments_awb ON shipments(awb);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway_in ON shipments(gateway_in);
CREATE INDEX IF NOT EXISTS idx_shipments_gateway_out ON shipments(gateway_out);
