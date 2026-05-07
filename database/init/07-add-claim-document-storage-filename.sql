-- ============================================================
-- Block 4B: Claim File Upload Storage Metadata
-- ============================================================

ALTER TABLE claim_schema.claim_documents
    ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255);

UPDATE claim_schema.claim_documents
SET stored_file_name = COALESCE(
    stored_file_name,
    regexp_replace(stored_file_path, '^.*/', '')
)
WHERE stored_file_name IS NULL;

ALTER TABLE claim_schema.claim_documents
    ALTER COLUMN stored_file_name SET NOT NULL;
