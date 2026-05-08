-- ============================================================
-- Block 5: Client validation workflow
-- ============================================================

ALTER TABLE claim_schema.claim_timeline
    ADD COLUMN IF NOT EXISTS claim_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'claim_timeline_claim_fk'
          AND connamespace = 'claim_schema'::regnamespace
    ) THEN
        ALTER TABLE claim_schema.claim_timeline
            ADD CONSTRAINT claim_timeline_claim_fk
            FOREIGN KEY (claim_id)
            REFERENCES claim_schema.claims (id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS claim_timeline_claim_idx
    ON claim_schema.claim_timeline (claim_id);

CREATE TABLE IF NOT EXISTS claim_schema.client_claim_validations (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL UNIQUE REFERENCES claim_schema.claims (id) ON DELETE CASCADE,
    validation_status VARCHAR(30) NOT NULL,
    review_decision VARCHAR(30) NOT NULL,
    validated_at TIMESTAMP,
    validated_by VARCHAR(255),
    rejection_reason VARCHAR(2000),
    validation_result_json TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS client_claim_validations_status_idx
    ON claim_schema.client_claim_validations (validation_status);

CREATE INDEX IF NOT EXISTS client_claim_validations_decision_idx
    ON claim_schema.client_claim_validations (review_decision);

UPDATE claim_schema.claims
SET stage = 'CLIENT_REVIEW'
WHERE stage = 'CUSTOMER_SUBMITTED'
  AND status = 'SUBMITTED';
