-- ============================================================
-- Block 6A: FMG Rule Engine Core
-- ============================================================

ALTER TABLE claim_schema.extracted_claim_data
    ADD COLUMN IF NOT EXISTS claim_form_policy_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS claim_form_customer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS claim_form_patient_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS claim_form_carrier_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS claim_form_policy_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS claim_form_hospital_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS claim_form_admission_date DATE,
    ADD COLUMN IF NOT EXISTS claim_form_discharge_date DATE,
    ADD COLUMN IF NOT EXISTS claim_form_claimed_amount DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS claim_form_claim_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS claim_form_diagnosis VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS claim_form_bill_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS claim_form_bill_date DATE,
    ADD COLUMN IF NOT EXISTS claim_form_total_bill_amount DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS hospital_document_policy_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hospital_document_customer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS hospital_document_patient_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS hospital_document_carrier_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS hospital_document_policy_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS hospital_document_hospital_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS hospital_document_admission_date DATE,
    ADD COLUMN IF NOT EXISTS hospital_document_discharge_date DATE,
    ADD COLUMN IF NOT EXISTS hospital_document_claimed_amount DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS hospital_document_claim_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS hospital_document_diagnosis VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS hospital_document_bill_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS hospital_document_bill_date DATE,
    ADD COLUMN IF NOT EXISTS hospital_document_total_bill_amount DECIMAL(15, 2);

UPDATE claim_schema.extracted_claim_data
SET claim_form_policy_number = COALESCE(claim_form_policy_number, policy_number),
    claim_form_customer_name = COALESCE(claim_form_customer_name, customer_name),
    claim_form_patient_name = COALESCE(claim_form_patient_name, patient_name),
    claim_form_carrier_name = COALESCE(claim_form_carrier_name, carrier_name),
    claim_form_policy_name = COALESCE(claim_form_policy_name, policy_name),
    claim_form_hospital_name = COALESCE(claim_form_hospital_name, hospital_name),
    claim_form_admission_date = COALESCE(claim_form_admission_date, admission_date),
    claim_form_discharge_date = COALESCE(claim_form_discharge_date, discharge_date),
    claim_form_claimed_amount = COALESCE(claim_form_claimed_amount, claimed_amount),
    claim_form_claim_type = COALESCE(claim_form_claim_type, claim_type),
    claim_form_diagnosis = COALESCE(claim_form_diagnosis, diagnosis),
    claim_form_bill_number = COALESCE(claim_form_bill_number, bill_number),
    claim_form_bill_date = COALESCE(claim_form_bill_date, bill_date),
    claim_form_total_bill_amount = COALESCE(claim_form_total_bill_amount, total_bill_amount),
    hospital_document_policy_number = COALESCE(hospital_document_policy_number, policy_number),
    hospital_document_customer_name = COALESCE(hospital_document_customer_name, customer_name),
    hospital_document_patient_name = COALESCE(hospital_document_patient_name, patient_name),
    hospital_document_carrier_name = COALESCE(hospital_document_carrier_name, carrier_name),
    hospital_document_policy_name = COALESCE(hospital_document_policy_name, policy_name),
    hospital_document_hospital_name = COALESCE(hospital_document_hospital_name, hospital_name),
    hospital_document_admission_date = COALESCE(hospital_document_admission_date, admission_date),
    hospital_document_discharge_date = COALESCE(hospital_document_discharge_date, discharge_date),
    hospital_document_claimed_amount = COALESCE(hospital_document_claimed_amount, claimed_amount),
    hospital_document_claim_type = COALESCE(hospital_document_claim_type, claim_type),
    hospital_document_diagnosis = COALESCE(hospital_document_diagnosis, diagnosis),
    hospital_document_bill_number = COALESCE(hospital_document_bill_number, bill_number),
    hospital_document_bill_date = COALESCE(hospital_document_bill_date, bill_date),
    hospital_document_total_bill_amount = COALESCE(hospital_document_total_bill_amount, total_bill_amount);

CREATE TABLE IF NOT EXISTS claim_schema.fmg_claim_decisions (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL UNIQUE REFERENCES claim_schema.claims (id) ON DELETE CASCADE,
    decision VARCHAR(30) NOT NULL,
    status_after_decision VARCHAR(50) NOT NULL,
    stage_after_decision VARCHAR(50) NOT NULL,
    decided_at TIMESTAMP NOT NULL,
    decided_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS fmg_claim_decisions_decision_idx
    ON claim_schema.fmg_claim_decisions (decision);

CREATE INDEX IF NOT EXISTS fmg_claim_decisions_decided_at_idx
    ON claim_schema.fmg_claim_decisions (decided_at);

CREATE TABLE IF NOT EXISTS claim_schema.fmg_claim_decision_rules (
    id UUID PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES claim_schema.fmg_claim_decisions (id) ON DELETE CASCADE,
    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    rule_order INTEGER NOT NULL,
    rule_outcome VARCHAR(30) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS fmg_claim_decision_rules_decision_idx
    ON claim_schema.fmg_claim_decision_rules (decision_id);

CREATE INDEX IF NOT EXISTS fmg_claim_decision_rules_code_idx
    ON claim_schema.fmg_claim_decision_rules (rule_code);
