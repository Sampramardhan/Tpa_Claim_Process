CREATE TABLE IF NOT EXISTS auth_schema.users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    date_of_birth DATE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON auth_schema.users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_unique_idx ON auth_schema.users (mobile) WHERE mobile IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_schema.customers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth_schema.users (id),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON client_schema.customers (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS customers_mobile_unique_idx ON client_schema.customers (mobile);

CREATE TABLE IF NOT EXISTS claim_schema.claims (
    id UUID PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    policy_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS claim_schema.claim_timeline (
    id UUID PRIMARY KEY,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE auth_schema.users IS 'Foundational user identity table prepared for future authentication and role workflows.';
COMMENT ON TABLE client_schema.customers IS 'Foundational customer profile table linked to authentication users.';
COMMENT ON TABLE claim_schema.claims IS 'Foundational claim table prepared for future claim workflow implementation.';
COMMENT ON TABLE claim_schema.claim_timeline IS 'Foundational timeline table prepared for future claim tracking events.';
