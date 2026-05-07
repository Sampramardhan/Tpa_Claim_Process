-- ============================================================
-- Block 4D: Draft claim submission workflow
-- ============================================================

-- Preserve editability for claims created before the explicit final-submit flow.
UPDATE claim_schema.claims
SET status = 'DRAFT',
    stage = 'DRAFT'
WHERE status = 'SUBMITTED'
  AND stage = 'CUSTOMER';
