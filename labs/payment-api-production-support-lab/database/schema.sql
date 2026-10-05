CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    external_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    merchant_reference VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
    id BIGSERIAL PRIMARY KEY,
    payment_id VARCHAR(36) NOT NULL REFERENCES payments(id),
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(40) NOT NULL,
    external_event_id VARCHAR(100) UNIQUE,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(36) PRIMARY KEY,
    payment_id VARCHAR(36) NOT NULL REFERENCES payments(id),
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payments_customer_created ON payments(customer_id, created_at);
CREATE INDEX IF NOT EXISTS ix_payments_status_created ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS ix_events_payment_created ON payment_events(payment_id, created_at);
