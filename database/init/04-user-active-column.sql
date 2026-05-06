ALTER TABLE auth_schema.users
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN auth_schema.users.active IS 'Whether the user account is active. Inactive accounts cannot authenticate.';
