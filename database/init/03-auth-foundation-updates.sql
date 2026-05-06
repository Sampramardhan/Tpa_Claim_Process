ALTER TABLE auth_schema.users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mobile VARCHAR(20),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

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

COMMENT ON TABLE client_schema.customers IS 'Foundational customer profile table linked to authentication users.';
