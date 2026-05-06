CREATE TABLE IF NOT EXISTS auth_schema.users (
    id UUID PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

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
COMMENT ON TABLE claim_schema.claims IS 'Foundational claim table prepared for future claim workflow implementation.';
COMMENT ON TABLE claim_schema.claim_timeline IS 'Foundational timeline table prepared for future claim tracking events.';
