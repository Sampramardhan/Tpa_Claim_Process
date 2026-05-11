# Enterprise TPA Insurance Claim Processing System
### Combined High-Level Design (HLD) & Low-Level Design (LLD) Blueprint

This document serves as the comprehensive architecture blueprint, HLD, and LLD guide for the **Third-Party Administrator (TPA) Insurance Claim Processing System**. This system is an enterprise-grade platform designed to streamline, automate, and audits the end-to-end lifecycle of medical insurance claims between Customers, Client Administrators, Fraud Management Groups (FMG), and Carrier Underwriters.

---

## 📖 Table of Contents
1. [System Overview & Business Domain](#1-system-overview--business-domain)
2. [High-Level Design (HLD) Architecture](#2-high-level-design-hld-architecture)
   - [Unified Flow & HLD Diagram](#unified-flow--hld-diagram)
   - [Database Schemas & Multi-Tenant Separation](#database-schemas--multi-tenant-separation)
3. [Low-Level Design (LLD) Module Specifications](#3-low-level-design-lld-module-specifications)
   - [Auth & Security Module](#auth--security-module)
   - [OCR & Data Extraction Module](#ocr--data-extraction-module)
   - [Client Validation Module](#client-validation-module)
   - [FMG Rule Engine Core](#fmg-rule-engine-core)
   - [FMG Manual Review Module](#fmg-manual-review-module)
   - [Carrier Settlement Module](#carrier-settlement-module)
   - [PDF Generator & Reporter Module](#pdf-generator--reporter-module)
4. [Claim State Machine & Sequence Diagrams](#4-claim-state-machine--sequence-diagrams)
5. [Database Architecture & Entity Relationships (ERD)](#5-database-architecture--entity-relationships-erd)
6. [Local Deployment & Execution Guide](#6-local-deployment--execution-guide)

---

## 1. System Overview & Business Domain

TPAs act as critical intermediaries in the insurance ecosystem. They process healthcare claims on behalf of insurance carriers or self-insured employers, ensuring claims are valid, within policy boundaries, fraud-free, and paid accurately.

### The Four Core Personas

We define four distinct actors within the TPA ecosystem, each playing a vital role in completing a claim's lifecycle:

| Persona | Responsibility | Main UI Features |
| :--- | :--- | :--- |
| **👤 Customer** | Registers medical drafts, uploads documents, verifies extracted OCR data, and monitors claim progress. | Claim Submission, OCR Review Panel, PDF Report Download |
| **💼 Client Admin** | Represents the primary employer/insurer. Pre-validates basic credentials and policy boundaries. | Active Pre-Validation Queue, Policy Verification Grid |
| **🛡️ FMG (Fraud Group)** | Fraud Management Group. Performs automated audit rule analysis and manual checklists. | Auto-Trigger Diagnostics, Rule Engine Catalog, Checklists |
| **🏦 Carrier Underwriter** | The insurance carrier/bank. Audits the finalized file and releases the cash disbursement. | Settlement Console, Disbursement History |

```mermaid
flowchart LR
    Customer["👤 Customer\n(Uploads & Drafts)"] ──> Client["💼 Client Admin\n(Pre-Validation)"]
    Client ──> FMG["🛡️ FMG Group\n(Rule Engine & Audit)"]
    FMG ──> Carrier["🏦 Carrier Bank\n(Final Settlement)"]

    style Customer fill:#eff6ff,stroke:#1d4ed8,stroke-width:1px
    style Client fill:#fef3c7,stroke:#d97706,stroke-width:1px
    style FMG fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px
    style Carrier fill:#ecfdf5,stroke:#059669,stroke-width:1px
```

---

## 2. High-Level Design (HLD) Architecture

The application is built upon a **highly scalable, decoupled multi-tier architecture** containerized with Docker.

```mermaid
graph TD
    UI["💻 React Frontend\n(Vite, Tailwind, Lucide React)"]
    
    subgraph Spring Boot Backend ["⚙️ Spring Boot REST Services Engine (JDK 17)"]
        Sec["🔐 Spring Security Context\n(Stateless JWT, RBAC)"]
        Ctrl["📱 REST Controllers\n(Customer, Client, FMG, Carrier)"]
        Srv["🧠 Core Service Layer\n(Ocr, Rules, Decisions, Timelines)"]
        Repo["📊 Spring Data JPA Layer\n(Hibernate ORM)"]
        
        Sec ──> Ctrl ──> Srv ──> Repo
    end
    
    DB[("🐘 PostgreSQL 15\n(Relational Schema Separations)")]

    UI ── "HTTP REST / JSON" ──> Sec
    Repo ── "JDBC / Connection Pool" ──> DB

    style UI fill:#eff6ff,stroke:#2563eb,stroke-width:2px
    style Spring Boot Backend fill:#f8fafc,stroke:#64748b,stroke-width:2px,stroke-dasharray: 5 5
    style DB fill:#ecfdf5,stroke:#059669,stroke-width:2px
```

### Unified Flow & HLD Diagram

This flow diagram illustrates how claims transition dynamically through systems and state machines:

```mermaid
flowchart TD
    subgraph Customer Portal
        A[Create Claim Draft] -->|Upload Form & Bill| B[OCR Extraction]
        B -->|Draft Status| C[Review Extracted Details]
        C -->|Submit Claim| D[Client Validation Stage]
    end

    subgraph Client Review Queue
        D -->|Validation Checks| E{Passes Pre-Validation?}
        E -->|No| F[State: REJECTED]
        E -->|Yes| G[Stage: FMG Review]
    end

    subgraph Fraud Management Group
        G -->|Run 10 Rules Engine| H{Recommended Decision}
        H -->|Auto APPROVED| I[Stage: Carrier Review]
        H -->|Auto REJECTED| J[State: REJECTED]
        H -->|MANUAL REVIEW| K[Stage: FMG Manual Review]
        
        K -->|Reviewer Checklist & Notes| L{Manual Decision}
        L -->|Approve| I
        L -->|Reject| J
    end

    subgraph Carrier Portal
        I -->|Carrier Audit| M{Final Decision}
        M -->|Approve Payment| N[State: PAID / COMPLETED]
        M -->|Reject| J
    end

    subgraph Document Services
        N & J -->|Generate PDF Report| O[Downloadable Settlement PDF]
    end

    classDef stage fill:#f8fafc,stroke:#cbd5e1,stroke-width:1px;
    classDef success fill:#f0fdf4,stroke:#86efac,stroke-width:1px;
    classDef danger fill:#fef2f2,stroke:#fca5a5,stroke-width:1px;
    class A,B,C,D,G,K,I stage;
    class N,O success;
    class F,J danger;
```

### Database Schemas & Multi-Tenant Separation

PostgreSQL uses modular schema groups to separate operational units securely:

| Schema Name | Responsibility | Key Tables Included |
| :--- | :--- | :--- |
| **`auth_schema`** | Stores access control registry and credentials. | `users`, `roles_mapping` |
| **`claim_schema`** | Manages high-frequency transactional data and audit chains. | `claims`, `claim_documents`, `extracted_claim_data`, `client_claim_validations`, `fmg_claim_decisions`, `fmg_manual_reviews`, `timeline_entries` |
| **`carrier_schema`** | Holds master policy structures and insurance parameters. | `carriers`, `insurance_policies` |
| **`customer_schema`** | Maintains personal profiles, identifiers and coverage bindings. | `customers`, `customer_policies` |

---

## 3. Low-Level Design (LLD) Module Specifications

### Auth & Security Module
- **Technology**: Spring Security, JWT (Stateless authentication tokens).
- **Core Classes**: 
  - `JwtAuthenticationFilter`: Extracts JWTs from incoming requests, validates them, and registers authentication states into Spring's Security Context.
  - `TpaUserPrincipal`: Stores user identities, roles, and mapping parameters (e.g., Customer profiles).
- **Endpoint Protection Pattern**: Role-Based Access Control (RBAC) configured globally in `SecurityConfig.java`:
  - `/customer/**` ── Restricted to users with `ROLE_CUSTOMER`.
  - `/client/**` ── Restricted to users with `ROLE_CLIENT`.
  - `/fmg/**` ── Restricted to users with `ROLE_FMG`.
  - `/carrier/**` ── Restricted to users with `ROLE_CARRIER`.

---

### OCR & Data Extraction Module
- **Core Service**: `ClaimOcrProcessingService`
- **Design Pattern**: Event-driven asynchronous execution. When a customer uploads claim documents, a `ClaimOcrRequestedEvent` is dispatched. 
- **OCR Engine**: Orchestrates file analysis via Gemini AI Studio Client or fallbacks. It parses text models of claim forms and medical bills, extracting structural parameters:
  - Policy numbers, Patient and Customer Names, Diagnoses, Hospital Registries, Total Bill & Claimed Amounts.
- **Result Schema**: Saves results in the `claim_schema.extracted_claim_data` entity linked to the Claim, with an `ocr_status` status tag (`PENDING` -> `COMPLETED`/`FAILED`).

---

### Client Validation Module
- **Core Service**: `ClientClaimReviewService`
- **Validation Engine**: Performs cross-referencing between the policy data stored in database and raw parameters parsed by the OCR engine.
- **Rules Verified**:
  - Customer name match, Policy number match, Active status validation.
- **Outcome Database Entity**: `ClientClaimValidation` (stores the JSON validation array and `validation_status`). If validation succeeds, the claim is promoted to the `FMG_REVIEW` stage.

---

### FMG Rule Engine Core
- **Core Service**: `FmgRuleEngineService` & `FmgRuleContextFactory`
- **Design Pattern**: Open-Closed Principle (OCP) Catalog. Individual rule implementations inherit from a base `FmgEvaluationRule` class:

```mermaid
classDiagram
    class FmgEvaluationRule {
        <<interface>>
        +getRuleCode() String
        +getRuleName() String
        +getRuleOrder() int
        +evaluate(FmgRuleContext context) FmgRuleOutcome
    }
    class Rule_01_HospitalNetworkCheck
    class Rule_02_TreatmentDiagnosisConsistencyCheck
    class Rule_03_MaxPolicyLimitCheck
    class Rule_04_AdmissionDurationCheck
    class Rule_05_NonPayableItemsCheck
    
    FmgEvaluationRule <|.. Rule_01_HospitalNetworkCheck
    FmgEvaluationRule <|.. Rule_02_TreatmentDiagnosisConsistencyCheck
    FmgEvaluationRule <|.. Rule_03_MaxPolicyLimitCheck
    FmgEvaluationRule <|.. Rule_04_AdmissionDurationCheck
    FmgEvaluationRule <|.. Rule_05_NonPayableItemsCheck
```

#### Rule Catalogue (10 Evaluation Criteria)
1. **Hospital Network Status Check**: Flags if the hospital is out-of-network.
2. **Treatment-Diagnosis Consistency**: Flags mismatches between the primary medical diagnosis and treatments/procedures billed.
3. **Maximum Limit Verification**: Flags claims where the requested amount exceeds policy ceilings.
4. **Admission Length Check**: Verifies if the hospital admission length matches normal durations for the diagnosis.
5. **Non-Payable Item Audit**: Detects non-covered expenses (consumables, hygiene products) hidden in bills.
6. **Timeline Overlap Check**: Verifies the patient does not have other overlapping active claims.
7. **Age-Policy Verification**: Validates the patient's age meets policy provisions.
8. **Duplicate Bill Check**: Flags bills with duplicate invoice numbers or dates.
9. **Waiting Period Check**: Flags claim diagnoses falling under exclusion waiting periods.
10. **Pre-Existing Conditions check**: Flags conditions excluded under policy criteria.

- **Auto-Confirm Flow**: If rules evaluate successfully to a clear recommendation (`APPROVED` / `REJECTED`), the frontend automatically executes the final FMG decision confirmation payload, skipping manual steps and expediting the claim.

---

### FMG Manual Review Module
- **Core Classes**: `FmgManualReview`, `FmgManualReviewPanel`
- **Workflow Exception Handlers**: If rules trigger a `MANUAL_REVIEW` recommendation (e.g. out-of-network hospital with an emergency condition), the claim is routed to the `FMG_MANUAL_REVIEW` queue.
- **Reviewer Layout**: Shows FMG reviewers an interactive, rule-by-rule status checklist (pass/fail states) and requires manual confirmation with reviewer justification notes.

---

### Carrier Settlement Module
- **Core Service**: `CarrierClaimReviewService`
- **Disbursement Release**: Final stage interface for the Insurance Carrier. The Underwriter reviews the audited ledger, the client validation logs, and the FMG checklist, then triggers either:
  - `PAID` (which completes the claim lifecycle).
  - `REJECTED` (which issues a carrier decline).

---

### PDF Generator & Reporter Module
- **Core Service**: `ClaimReportPdfService`
- **Aesthetic Engine**: **OpenPDF (LibrePDF)** with a highly polished design.
- **Styling Architecture**: Includes a custom corporate header, color-coded outcome boxes (green for payment, red for decline), and structured timeline grids.
- **Deep-Diagnostics Extraction**: If a claim is in `REJECTED` status, the generator runs a deep search across upstream entities to output the **precise primary cause** inside a clean PDF panel:
  - **Automated Rule Engine Failures**: Identifies the specific rule code, rule name, and system explanations.
  - **Manual FMG Overrules**: Outputs the exact manual notes, author, and timestamp.
  - **Client Validation Mismatches**: Outputs pre-validation failures and review metrics.
  - **Carrier Declines**: Explains bank/underwriter settlement decisions.

---

## 4. Claim State Machine & Sequence Diagrams

Here is the sequential flow of asynchronous and synchronous actions triggered when a claim is processed:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 Customer
    participant API as ⚙️ Spring API
    participant DB as 💾 Database (PostgreSQL)
    participant OCR as 🤖 OCR Engine (Asynchronous)
    actor Client as 💼 Client Admin
    actor FMG as 🛡️ FMG Group
    actor Carrier as 🏦 Carrier Bank

    Customer->>API: 1. POST /customer/claims (Upload Draft)
    API->>DB: Save Claim (Draft) & Documents
    API-->>Customer: Return Draft Confirmation
    API->>OCR: Trigger Async OCR Event
    OCR->>DB: Write Extracted OCR Data (Completed)
    
    Customer->>API: 2. POST /customer/claims/{id}/submit
    API->>DB: Set Stage = CLIENT_REVIEW
    
    Client->>API: 3. POST /client/claims/{id}/validate (Verify Data)
    API->>DB: Set Stage = FMG_REVIEW
    
    FMG->>API: 4. POST /fmg/claims/{id}/evaluate (Rule Run)
    API->>DB: Trigger Automated Decisions & Rule Checklist Logs
    alt Rule engine recommends MANUAL_REVIEW
        FMG->>API: Confirm Manual Evaluation Decisions & Notes
    end
    API->>DB: Set Stage = CARRIER_REVIEW
    
    Carrier->>API: 5. POST /carrier/claims/{id}/approve (Or Reject)
    API->>DB: Update State to PAID / REJECTED (Stage = COMPLETED)
    
    Customer->>API: 6. GET /customer/claims/{id}/report
    API->>DB: Query Extracted Data, Rules Engine & Manual Overrule Notes
    API-->>Customer: Stream Branded PDF Settlement Report
```

---

## 5. Database Architecture & Entity Relationships (ERD)

This entity relationship diagram displays the core database schema design, showing how the transaction models connect:

```mermaid
erDiagram
    users ||--o| customers : "identifies"
    customers ||--o{ customer_policies : "holds"
    carriers ||--o{ insurance_policies : "underwrites"
    insurance_policies ||--o{ customer_policies : "extends"
    customers ||--o{ claims : "registers"
    customer_policies ||--o{ claims : "insures"
    
    claims ||--o{ claim_documents : "contains"
    claims ||--o| extracted_claim_data : "stores"
    claims ||--o| client_claim_validations : "logs"
    claims ||--o| fmg_claim_decisions : "evaluates"
    claims ||--o{ timeline_entries : "audits"
    
    fmg_claim_decisions ||--o{ fmg_claim_decision_rules : "triggers"
    claims ||--o| fmg_manual_reviews : "manual-logs"

    users {
        uuid id PK
        string email
        string password_hash
        string role
    }
    claims {
        uuid id PK
        string claim_number UK
        string status
        string stage
        timestamp submission_date
    }
    extracted_claim_data {
        uuid id PK
        string hospital_name
        string patient_name
        string diagnosis
        numeric claimed_amount
    }
    fmg_claim_decision_rules {
        uuid id PK
        string rule_code
        string rule_name
        string rule_outcome
        string message
    }
    fmg_manual_reviews {
        uuid id PK
        string manual_decision
        string reviewer_notes
        timestamp reviewed_at
        string reviewed_by
    }
```

---

## 6. Local Deployment & Execution Guide

The environment runs fully containerized.

### 1. Prerequisites
- **Docker & Docker Compose**
- **Git**

### 2. Configuration (`.env`)
Create a `.env` file from the example:
```bash
cp .env.example .env
```

### 3. Execution Commands

To build and spin up the complete, secure environment:
```bash
# Spin up all Postgres, Backend and React Frontend instances
docker compose up --build -d
```

To stop all active services and maintain the volume maps:
```bash
docker compose down
```

To review system execution metrics or analyze Spring boot start threads:
```bash
docker compose logs -f backend
```

---
> **Corporate Notice**: This architecture is confidential and designed for the Third-Party Administrator Insurance System. All schema mappings, rules metrics, and database structural assets are protected.
