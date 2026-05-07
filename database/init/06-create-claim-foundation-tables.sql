-- ============================================================
-- Block 4A: Claim Foundation Entities and Database Structure
-- ============================================================

-- Yearly counter used for database-safe claim number generation.
CREATE TABLE IF NOT EXISTS claim_schema.claim_number_counters (
    claim_year INTEGER PRIMARY KEY,
    last_sequence BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE claim_schema.claim_number_counters IS
    'Stores the latest claim sequence per year for reusable claim number generation.';

-- Ensure the foundational claims table exists even on fresh environments.
CREATE TABLE IF NOT EXISTS claim_schema.claims (
    id UUID PRIMARY KEY,
    claim_number VARCHAR(25) NOT NULL,
    customer_id UUID NOT NULL,
    customer_policy_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    submission_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

ALTER TABLE claim_schema.claims
    ADD COLUMN IF NOT EXISTS claim_number VARCHAR(25),
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS customer_policy_id UUID,
    ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

UPDATE claim_schema.claims
SET submission_date = COALESCE(submission_date, created_at, CURRENT_TIMESTAMP)
WHERE submission_date IS NULL;

ALTER TABLE claim_schema.claims
    DROP COLUMN IF EXISTS policy_type;

ALTER TABLE claim_schema.claims
    ALTER COLUMN claim_number SET NOT NULL,
    ALTER COLUMN customer_id SET NOT NULL,
    ALTER COLUMN customer_policy_id SET NOT NULL,
    ALTER COLUMN submission_date SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'claims_customer_fk'
          AND connamespace = 'claim_schema'::regnamespace
    ) THEN
        ALTER TABLE claim_schema.claims
            ADD CONSTRAINT claims_customer_fk
            FOREIGN KEY (customer_id)
            REFERENCES client_schema.customers (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'claims_customer_policy_fk'
          AND connamespace = 'claim_schema'::regnamespace
    ) THEN
        ALTER TABLE claim_schema.claims
            ADD CONSTRAINT claims_customer_policy_fk
            FOREIGN KEY (customer_policy_id)
            REFERENCES client_schema.customer_policies (id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS claims_number_unique_idx
    ON claim_schema.claims (claim_number);
CREATE INDEX IF NOT EXISTS claims_customer_idx
    ON claim_schema.claims (customer_id);
CREATE INDEX IF NOT EXISTS claims_customer_policy_idx
    ON claim_schema.claims (customer_policy_id);
CREATE INDEX IF NOT EXISTS claims_status_idx
    ON claim_schema.claims (status);
CREATE INDEX IF NOT EXISTS claims_stage_idx
    ON claim_schema.claims (stage);
CREATE INDEX IF NOT EXISTS claims_submission_date_idx
    ON claim_schema.claims (submission_date);

COMMENT ON TABLE claim_schema.claims IS
    'Core claim record linked to a customer and customer policy, prepared for future OCR and workflow stages.';

CREATE TABLE IF NOT EXISTS claim_schema.claim_documents (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claim_schema.claims (id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS claim_documents_claim_idx
    ON claim_schema.claim_documents (claim_id);
CREATE INDEX IF NOT EXISTS claim_documents_type_idx
    ON claim_schema.claim_documents (document_type);

COMMENT ON TABLE claim_schema.claim_documents IS
    'Document metadata records attached to a claim. File ingestion is intentionally implemented later.';

CREATE TABLE IF NOT EXISTS claim_schema.extracted_claim_data (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL UNIQUE REFERENCES claim_schema.claims (id) ON DELETE CASCADE,
    policy_number VARCHAR(50),
    patient_name VARCHAR(150),
    hospital_name VARCHAR(200),
    admission_date DATE,
    discharge_date DATE,
    diagnosis TEXT,
    total_bill_amount DECIMAL(15, 2),
    claimed_amount DECIMAL(15, 2)
);

CREATE INDEX IF NOT EXISTS extracted_claim_data_policy_number_idx
    ON claim_schema.extracted_claim_data (policy_number);
CREATE INDEX IF NOT EXISTS extracted_claim_data_patient_name_idx
    ON claim_schema.extracted_claim_data (patient_name);

COMMENT ON TABLE claim_schema.extracted_claim_data IS
    'Structured OCR extraction target for claim documents. OCR population is intentionally implemented later.';
