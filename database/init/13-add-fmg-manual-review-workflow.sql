-- ============================================================
-- Block 6D: FMG Manual Review Workflow
-- ============================================================

CREATE TABLE IF NOT EXISTS claim_schema.fmg_manual_reviews (
    id                    UUID PRIMARY KEY,
    claim_id              UUID         NOT NULL UNIQUE REFERENCES claim_schema.claims (id) ON DELETE CASCADE,
    decision_id           UUID         REFERENCES claim_schema.fmg_claim_decisions (id) ON DELETE SET NULL,
    reviewer_notes        TEXT,
    manual_decision       VARCHAR(30),
    status_after_decision VARCHAR(50),
    stage_after_decision  VARCHAR(50),
    reviewed_at           TIMESTAMP,
    reviewed_by           VARCHAR(255),
    created_at            TIMESTAMP    NOT NULL,
    updated_at            TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS fmg_manual_reviews_claim_idx
    ON claim_schema.fmg_manual_reviews (claim_id);

CREATE INDEX IF NOT EXISTS fmg_manual_reviews_decision_idx
    ON claim_schema.fmg_manual_reviews (manual_decision);

CREATE INDEX IF NOT EXISTS fmg_manual_reviews_reviewed_at_idx
    ON claim_schema.fmg_manual_reviews (reviewed_at);
