-- ============================================================
-- Block 6B: FMG APIs and Decision Workflow
-- ============================================================

ALTER TABLE claim_schema.fmg_claim_decisions
    ADD COLUMN IF NOT EXISTS final_decision VARCHAR(30),
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS fmg_claim_decisions_final_decision_idx
    ON claim_schema.fmg_claim_decisions (final_decision);

UPDATE claim_schema.fmg_claim_decisions
SET final_decision = COALESCE(final_decision, decision),
    confirmed_at = COALESCE(confirmed_at, decided_at),
    confirmed_by = COALESCE(confirmed_by, decided_by)
WHERE decision IS NOT NULL;
