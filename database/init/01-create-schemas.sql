CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS client_schema;
CREATE SCHEMA IF NOT EXISTS carrier_schema;
CREATE SCHEMA IF NOT EXISTS claim_schema;

COMMENT ON SCHEMA auth_schema IS 'Reserved for future authentication and identity data.';
COMMENT ON SCHEMA client_schema IS 'Reserved for future client and bank data.';
COMMENT ON SCHEMA carrier_schema IS 'Reserved for future insurance carrier data.';
COMMENT ON SCHEMA claim_schema IS 'Reserved for future claim processing data.';
