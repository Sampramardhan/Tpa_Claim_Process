-- ============================================================
-- Block 4C: OCR Extraction Fields and Status Tracking
-- ============================================================

ALTER TABLE claim_schema.extracted_claim_data
    ADD COLUMN IF NOT EXISTS ocr_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ocr_failure_reason VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS ocr_raw_response TEXT,
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS policy_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS claim_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bill_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bill_date DATE;

UPDATE claim_schema.extracted_claim_data
SET ocr_status = COALESCE(
    ocr_status,
    CASE
        WHEN policy_number IS NOT NULL
          OR patient_name IS NOT NULL
          OR hospital_name IS NOT NULL
          OR diagnosis IS NOT NULL
          OR total_bill_amount IS NOT NULL
          OR claimed_amount IS NOT NULL
        THEN 'COMPLETED'
        ELSE 'PENDING'
    END
)
WHERE ocr_status IS NULL;

ALTER TABLE claim_schema.extracted_claim_data
    ALTER COLUMN ocr_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS extracted_claim_data_ocr_status_idx
    ON claim_schema.extracted_claim_data (ocr_status);
