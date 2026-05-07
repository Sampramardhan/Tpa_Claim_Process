-- ============================================================
-- Block 3: Policy Management Tables
-- ============================================================

-- Carrier entity table
CREATE TABLE IF NOT EXISTS carrier_schema.carriers (
    id UUID PRIMARY KEY,
    carrier_name VARCHAR(150) NOT NULL,
    carrier_code VARCHAR(10) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS carriers_code_unique_idx
    ON carrier_schema.carriers (UPPER(carrier_code));
CREATE UNIQUE INDEX IF NOT EXISTS carriers_name_unique_idx
    ON carrier_schema.carriers (LOWER(carrier_name));

COMMENT ON TABLE carrier_schema.carriers IS 'Insurance carrier / provider identity table.';

-- Insurance policies catalog
CREATE TABLE IF NOT EXISTS carrier_schema.insurance_policies (
    id UUID PRIMARY KEY,
    carrier_id UUID NOT NULL REFERENCES carrier_schema.carriers (id),
    policy_name VARCHAR(200) NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    description TEXT,
    coverage_amount DECIMAL(15, 2) NOT NULL,
    premium_amount DECIMAL(15, 2) NOT NULL,
    waiting_period_days INTEGER NOT NULL DEFAULT 0,
    policy_duration_months INTEGER NOT NULL DEFAULT 12,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

COMMENT ON TABLE carrier_schema.insurance_policies IS 'Master catalog of insurance policies offered by carriers.';

-- Customer-owned policies (in client_schema for verification domain)
CREATE TABLE IF NOT EXISTS client_schema.customer_policies (
    id UUID PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES carrier_schema.insurance_policies (id),
    customer_id UUID NOT NULL REFERENCES client_schema.customers (id),
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    unique_policy_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_policies_number_unique_idx
    ON client_schema.customer_policies (unique_policy_number);

-- Prevent duplicate active purchases of the same policy by the same customer
CREATE UNIQUE INDEX IF NOT EXISTS customer_policies_active_unique_idx
    ON client_schema.customer_policies (customer_id, policy_id) WHERE active = TRUE;

COMMENT ON TABLE client_schema.customer_policies IS 'Customer policy ownership records used for claim verification.';

-- Sequence for unique policy number generation
CREATE SEQUENCE IF NOT EXISTS carrier_schema.policy_number_seq
    START WITH 1 INCREMENT BY 1;
