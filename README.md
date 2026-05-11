# Enterprise TPA Insurance Claim Processing System
### Combined High-Level Design (HLD) & Low-Level Design (LLD) Blueprint

This document serves as the comprehensive architecture blueprint, HLD, and LLD guide for the **Third-Party Administrator (TPA) Insurance Claim Processing System**. This system is an enterprise-grade platform designed to streamline, automate, and audits the end-to-end lifecycle of medical insurance claims between Customers, Client Administrators, Fraud Management Groups (FMG), and Carrier Underwriters.

---

## 📖 Table of Contents
1. [System Overview & Business Domain](#1-system-overview--business-domain)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Design (HLD) Architecture](#3-high-level-design-hld-architecture)
   - [Unified Flow & HLD Diagram](#unified-flow--hld-diagram)
   - [Database Schemas & Multi-Tenant Separation](#database-schemas--multi-tenant-separation)
4. [Low-Level Design (LLD) Module Specifications](#4-low-level-design-lld-module-specifications)
   - [Auth & Security Module](#auth--security-module)
   - [OCR & Data Extraction Module](#ocr--data-extraction-module)
   - [Client Validation Module](#client-validation-module)
   - [FMG Rule Engine Core](#fmg-rule-engine-core)
   - [FMG Manual Review Module](#fmg-manual-review-module)
   - [Carrier Settlement Module](#carrier-settlement-module)
   - [PDF Generator & Reporter Module](#pdf-generator--reporter-module)
5. [Claim State Machine Flow Diagram](#5-claim-state-machine-flow-diagram)
6. [Database Architecture & Entity Relationships (ERD)](#6-database-architecture--entity-relationships-erd)
7. [Local Deployment & Execution Guide](#7-local-deployment--execution-guide)

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
    Customer["👤 Customer\n(Uploads & Drafts)"] --> Client["💼 Client Admin\n(Pre-Validation)"]
    Client --> FMG["🛡️ FMG Group\n(Rule Engine & Audit)"]
    FMG --> Carrier["🏦 Carrier Bank\n(Final Settlement)"]

    style Customer fill:#eff6ff,stroke:#1d4ed8,stroke-width:1px
    style Client fill:#fef3c7,stroke:#d97706,stroke-width:1px
    style FMG fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px
    style Carrier fill:#ecfdf5,stroke:#059669,stroke-width:1px
```

---

## 2. Technology Stack

This system is built using modern, enterprise-ready technologies designed for high performance, maintainability, and security.

### Backend ⚙️
- **Java 17 (JDK 17)**: Core language.
- **Spring Boot 3.3**: Framework for REST APIs, dependency injection, and auto-configuration.
- **Spring Security**: Role-Based Access Control (RBAC) and Stateless JWT authentication.
- **Spring Data JPA & Hibernate**: ORM for relational database interaction.
- **OpenPDF**: High-fidelity PDF generation engine for settlement reports.
- **Google Cloud AI Studio Client (Gemini)**: API integration for OCR and document data extraction.

### Frontend 💻
- **React 18**: Core UI library.
- **Vite**: Ultra-fast frontend build tooling.
- **Tailwind CSS**: Utility-first CSS framework for custom styling and responsive design.
- **Lucide React**: Crisp, modern icon set.

### Database & Infrastructure 🐘
- **PostgreSQL 15**: Relational database with multi-schema architecture for robust data isolation.
- **Docker & Docker Compose**: Full-stack containerization for reproducible environments and easy deployment.
- **Alpine Linux**: Minimal OS base images to reduce container footprint and improve security.

---

## 3. High-Level Design (HLD) Architecture

The application is built upon a **highly scalable, decoupled multi-tier architecture** containerized with Docker.

```mermaid
graph TD
    UI["💻 React Frontend\n(Vite, Tailwind, Lucide React)"]
    
    subgraph Spring Boot Backend ["⚙️ Spring Boot REST Services Engine (JDK 17)"]
        Sec["🔐 Spring Security Context\n(Stateless JWT, RBAC)"]
        Ctrl["📱 REST Controllers\n(Customer, Client, FMG, Carrier)"]
        Srv["🧠 Core Service Layer\n(Ocr, Rules, Decisions, Timelines)"]
        Repo["📊 Spring Data JPA Layer\n(Hibernate ORM)"]
        
        Sec --> Ctrl --> Srv --> Repo
    end
    
    DB[("🐘 PostgreSQL 15\n(Relational Schema Separations)")]

    UI -->|HTTP REST / JSON| Sec
    Repo -->|JDBC / Connection Pool| DB

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

## 4. Low-Level Design (LLD) Module Specifications

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

## 5. Claim State Machine Flow Diagram

This flow diagram illustrates the dynamic state and stage transitions a claim goes through from creation to final settlement:

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> DRAFT : Customer Creates Draft & Uploads Documents
    DRAFT --> DRAFT : Async OCR Extraction Runs
    
    state "CLIENT_REVIEW Stage" as CR
    DRAFT --> CR : Customer Submits Claim
    
    CR --> REJECTED : Client Pre-Validation Fails
    
    state "FMG_REVIEW Stage" as FR
    CR --> FR : Client Pre-Validation Passes
    
    state "FMG_MANUAL_REVIEW Stage" as FMR
    FR --> FMR : Rule Engine Requires Manual Check
    
    FR --> REJECTED : Rule Engine Auto-Rejects
    
    state "CARRIER_REVIEW Stage" as CAR
    FR --> CAR : Rule Engine Auto-Approves
    FMR --> CAR : FMG Reviewer Approves
    FMR --> REJECTED : FMG Reviewer Rejects
    
    state "COMPLETED Stage" as COMPLETED {
        PAID
        REJECTED
    }
    
    CAR --> PAID : Carrier Approves Payment
    CAR --> REJECTED : Carrier Declines
    
    PAID --> [*] : PDF Report Generated
    REJECTED --> [*] : PDF Report Generated
```

---

## 6. Database Architecture & Entity Relationships (ERD)

This entity relationship diagram displays the core database architecture with high-fidelity detail, showing data types, primary/foreign keys, and cross-schema connections:

```mermaid
erDiagram
    %% ==========================================
    %% 🔐 AUTH & SECURITY SCHEMA
    %% ==========================================
    "auth_schema.users" ||--o| "customer_schema.customers" : "identifies"
    
    "auth_schema.users" {
        varchar id PK
        varchar email UK
        varchar password_hash
        varchar role
        boolean active
        datetime created_at
    }

    %% ==========================================
    %% 👤 CUSTOMER SCHEMA
    %% ==========================================
    "customer_schema.customers" ||--o{ "customer_schema.customer_policies" : "holds"
    "customer_schema.customers" ||--o{ "claim_schema.claims" : "registers"
    "customer_schema.customer_policies" ||--o{ "claim_schema.claims" : "insures"
    
    "customer_schema.customers" {
        varchar id PK
        varchar user_id FK
        varchar first_name
        varchar last_name
        varchar phone_number
        datetime created_at
    }
    
    "customer_schema.customer_policies" {
        varchar id PK
        varchar customer_id FK
        varchar policy_id FK
        varchar unique_policy_number UK
        date start_date
        date end_date
        boolean active
    }

    %% ==========================================
    %% 🏦 CARRIER SCHEMA
    %% ==========================================
    "carrier_schema.carriers" ||--o{ "carrier_schema.insurance_policies" : "underwrites"
    "carrier_schema.insurance_policies" ||--o{ "customer_schema.customer_policies" : "extends"
    
    "carrier_schema.carriers" {
        varchar id PK
        varchar carrier_name
        varchar carrier_code UK
        boolean active
    }

    "carrier_schema.insurance_policies" {
        varchar id PK
        varchar carrier_id FK
        varchar policy_name
        varchar policy_type
        boolean active
    }

    %% ==========================================
    %% 📋 CLAIM SCHEMA (Core Transactions)
    %% ==========================================
    "claim_schema.claims" ||--o{ "claim_schema.claim_documents" : "stores"
    "claim_schema.claims" ||--o| "claim_schema.extracted_claim_data" : "has"
    "claim_schema.claims" ||--o| "claim_schema.fmg_claim_decisions" : "receives"
    "claim_schema.claims" ||--o{ "claim_schema.timeline_entries" : "tracks"
    "claim_schema.fmg_claim_decisions" ||--o{ "claim_schema.fmg_claim_decision_rules" : "evaluated_by"

    "claim_schema.claims" {
        varchar id PK
        varchar customer_id FK
        varchar customer_policy_id FK
        varchar claim_number UK
        varchar status
        datetime created_at
        datetime processed_at
        text decision_reason
        decimal settlement_amount
        text carrier_remarks
        text ai_explanation
        int approval_chance_percentage
        json extracted_data_snapshot
    }
    
    "claim_schema.claim_documents" {
        varchar id PK
        varchar claim_id FK
        varchar document_type
        varchar file_path
        datetime uploaded_at
    }

    "claim_schema.extracted_claim_data" {
        varchar id PK
        varchar claim_id FK
        varchar policy_number
        varchar policy_id
        varchar customer_name
        varchar carrier_name
        varchar policy_name
        varchar claim_form_patient_name
        varchar claim_form_hospital_name
        date claim_form_admission_date
        date claim_form_discharge_date
        decimal claimed_amount
        varchar claim_type
        varchar diagnosis
        varchar bill_number
        date bill_date
        varchar ocr_status
    }
    
    "claim_schema.fmg_claim_decisions" {
        varchar id PK
        varchar claim_id FK
        varchar decided_by
        varchar role
        varchar decision
        decimal settlement_amount
        text remarks
        datetime timestamp
    }

    "claim_schema.fmg_claim_decision_rules" {
        varchar id PK
        varchar decision_id FK
        varchar rule_code
        varchar rule_name
        boolean triggered
        text description
    }
    
    "claim_schema.timeline_entries" {
        varchar id PK
        varchar claim_id FK
        varchar action
        varchar performed_by
        varchar role
        text comments
        datetime timestamp
    }
```

---

## 7. Local Deployment & Execution Guide

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
