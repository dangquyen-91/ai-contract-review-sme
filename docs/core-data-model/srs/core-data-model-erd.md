---
type: srs-erd
feature: core-data-model
updated: 2026-10-23
---

# core-data-model — Entity Relationship Diagram

> Scope: full data model of AI Contract Review — 31 entities (22 implemented, 9 planned), 6 business groups

## Diagram

```mermaid
erDiagram
    ROLE ||--o{ USER : ""
    ORGANIZATION |o--o{ USER : ""
    ORGANIZATION ||--o{ ORG_INVITATION : ""
    USER ||--o{ ORG_INVITATION : ""
    USER |o--o{ ORG_INVITATION : ""
    USER |o--o{ EMAIL_VERIFY : ""
    ORGANIZATION ||--o| ORG_SUB : ""
    PLAN |o--o{ ORG_SUB : ""
    ORGANIZATION ||--o{ SUB_PERIOD : ""
    PLAN ||--o{ SUB_PERIOD : ""
    ORGANIZATION ||--o{ PAYMENT : ""
    USER ||--o{ PAYMENT : ""
    PLAN ||--o{ PAYMENT : ""
    PAYMENT |o--o| SUB_PERIOD : ""
    SUB_PERIOD ||--o{ USAGE_RUN : ""
    ORGANIZATION ||--o{ USAGE_RUN : ""
    USER ||--o{ USAGE_RUN : ""
    CONTRACT ||--o{ USAGE_RUN : ""
    ORGANIZATION ||--o{ CONTRACT : ""
    USER ||--o{ CONTRACT : ""
    CT_PROFILE ||--o{ CONTRACT : ""
    INDUSTRY |o--o{ CONTRACT : ""
    CONTRACT ||--o{ CONTRACT_VER : ""
    USER ||--o{ CONTRACT_VER : ""
    CONTRACT_VER ||--o{ CLAUSE : ""
    CLAUSE_TYPE ||--o{ CLAUSE : ""
    CONTRACT_VER ||--o{ RISK_FINDING : ""
    CLAUSE |o--o{ RISK_FINDING : ""
    CLAUSE_TYPE |o--o{ RISK_FINDING : ""
    CONTRACT ||--o{ REVIEW : ""
    CONTRACT_VER ||--o{ REVIEW : ""
    USER ||--o{ REVIEW : ""
    USAGE_RUN ||--o| REVIEW : ""
    CONTRACT_VER ||--o{ CHAT_MESSAGE : ""
    USER ||--o{ CHAT_MESSAGE : ""
    CT_PROFILE }o--o{ CLAUSE_TYPE : ""
    CT_PROFILE }o--o{ INDUSTRY : ""
    CT_PROFILE }o--o{ LEGAL_SOURCE : ""
    LEGAL_SOURCE ||--o{ LEGAL_CHUNK : ""
    RISK_FINDING ||--o{ RISK_CITATION : ""
    LEGAL_CHUNK ||--o{ RISK_CITATION : ""
    RISK_FINDING }o--o{ LEGAL_CHUNK : ""
    ORGANIZATION ||--o{ AUDIT_LOG : ""
    USER |o--o{ AUDIT_LOG : ""
    USER ||--o{ NOTIFICATION : ""
    REVIEW ||--o| EXPERT_REVIEW : ""
    USER ||--o{ EXPERT_REVIEW : ""
    EXPERT_REVIEW ||--o{ EXPERT_ACTION : ""
    RISK_FINDING ||--o{ EXPERT_ACTION : ""
    EXPERT_REVIEW ||--o{ COMMENT : ""
    USER ||--o{ COMMENT : ""
    CLAUSE |o--o{ COMMENT : ""
    RISK_FINDING |o--o{ COMMENT : ""
    REVIEW ||--o{ REPORT : ""
    USER ||--o{ REPORT : ""
    CT_PROFILE ||--o{ STD_TEMPLATE : ""
    STD_TEMPLATE ||--|{ STD_CLAUSE : ""
    CLAUSE_TYPE ||--o{ STD_CLAUSE : ""
    CONTRACT ||--o{ REVIEW_PACKAGE : ""
    PAYMENT |o--o| REVIEW_PACKAGE : ""
    REVIEW_PACKAGE |o--o{ USAGE_RUN : ""

    ORGANIZATION {
        ObjectId _id PK
        String name
        String taxCode
        String address
        Boolean isPersonal
        String industry
    }

    USER {
        ObjectId _id PK
        ObjectId orgId FK
        ObjectId roleId FK
        String name
        String email UK
        Boolean isActive
        Date deletedAt
        Boolean hasCompletedOnboarding
        Number permissionsVersion
        Date emailVerifiedAt
        String googleSubject UK
    }

    ROLE {
        ObjectId _id PK
        String code UK
        String name
        String description
        Boolean isSystemRole
    }

    ORG_INVITATION {
        ObjectId _id PK
        ObjectId orgId FK
        String email
        String role
        ObjectId invitedBy FK
        String status
        Date expiresAt
        ObjectId acceptedBy FK
        Date acceptedAt
    }

    EMAIL_VERIFY {
        ObjectId _id PK
        String email UK
        String name
        ObjectId userId FK
        Boolean remember
        Date expiresAt
        Date lastSentAt
        Date windowStartedAt
        Number sentCount
        Number attempts
        Boolean ready
        Boolean consumed
        Date purgeAt
    }

    PLAN {
        ObjectId _id PK
        String code UK
        String name
        String audience
        Number price
        String currency
        Number analysisLimit
        Number chatLimit
        Number memberLimit
    }

    ORG_SUB {
        ObjectId _id PK
        ObjectId orgId FK, UK
        ScheduledDowngrade scheduledDowngrade FK "embedded: planCode, effectiveAt"
    }

    SUB_PERIOD {
        ObjectId _id PK
        ObjectId orgId FK
        String key UK
        PlanSnapshot plan FK "embedded copy of PLAN"
        Date startsAt
        Date endsAt
        Date cancelledAt
        String paymentReference UK
        String paymentAction
        Number analysisUsed
        Number analysisReserved
        Number chatUsed
        Number chatReserved
    }

    USAGE_RUN {
        ObjectId _id PK
        ObjectId orgId FK
        ObjectId userId FK
        ObjectId contractId FK
        ObjectId periodId FK
        ObjectId packageId FK "planned"
        String kind
        String idempotencyKey
        String fingerprint
        String status
        Date leaseExpiresAt
        String error
    }

    PAYMENT {
        ObjectId _id PK
        Number orderCode UK
        ObjectId orgId FK
        ObjectId createdBy FK
        String idempotencyKey
        String planCode FK
        String action
        Number amount
        String currency
        String status
        Boolean isOpen
        String paymentLinkId
        String checkoutUrl
        String qrCode
        Date expiresAt
        Date paidAt
        Date fulfilledAt
        ObjectId subscriptionPeriodId FK
        String fulfillmentError
        String providerError
    }

    CONTRACT {
        ObjectId _id PK
        ObjectId orgId FK
        ObjectId uploadedBy FK
        String title
        String type FK
        String ourParty
        String industry FK
        String status
        Classification classification "embedded"
    }

    CONTRACT_VER {
        ObjectId _id PK
        ObjectId contractId FK
        Number versionNumber
        ObjectId createdBy FK
        String fileName
        String mimeType
        String fileFormat
        String fileKey
        String fileResourceType
        String fileDeliveryType
        String extractedText
        String extractionStatus
        String extractionError
        Date extractionStartedAt
        ExtractionProgress extractionProgress "embedded"
        ExtractionQuality extractionQuality "embedded"
        RedactionSummary redactionSummary "embedded"
        String segmentationStatus
        String segmentationError
        Date segmentationStartedAt
        String riskDetectionStatus
        String riskDetectionError
        Date riskDetectionStartedAt
        String summaryStatus
        String summaryError
        Date summaryStartedAt
        String overallRiskLevel
        String[] overallAssessment
        String[] summaryPoints
        KeyTerm[] keyTerms "embedded"
        Date keyTermsExtractedAt
        String analysisFocus
    }

    CLAUSE {
        ObjectId _id PK
        ObjectId contractVersionId FK
        ObjectId orgId FK
        Number index
        String title
        String text
        Number startOffset
        Number endOffset
        ObjectId clauseTypeId FK
        String summary
    }

    CLAUSE_TYPE {
        ObjectId _id PK
        String code UK
        String name
        String description
    }

    CT_PROFILE {
        ObjectId _id PK
        String code UK
        String[] aliases
        String name
        String promptLabel
        String segment
        Party[] parties "embedded"
        String[] governingLaws
        String[] legalSourceCodes FK
        String[] clauseCategories FK
        String[] mandatoryClauses FK
        IndustryRule[] industryRules FK "embedded"
        String[] redactionPolicy
    }

    INDUSTRY {
        ObjectId _id PK
        String code UK
        String name
    }

    RISK_FINDING {
        ObjectId _id PK
        ObjectId contractVersionId FK
        ObjectId orgId FK
        ObjectId clauseId FK
        ObjectId expectedClauseTypeId FK
        String findingType
        String severity
        String title
        String[] problem
        String[] consequences
        LegalBasis[] legalBasis "embedded"
        String[] recommendations
        ProposedRevision proposedRevision "embedded"
        String status
        String detectedBy
        String ruleCode
        Number ruleVersion
    }

    REVIEW {
        ObjectId _id PK
        ObjectId contractId FK
        ObjectId versionId FK
        ObjectId orgId FK
        ObjectId requestedBy FK
        String idempotencyKey
        ObjectId usageRunId FK
        String status
        Boolean activeLock
        String currentStage
        String stageDetail
        StageStatus stages "embedded"
        String analysisFocus
        String error
        String errorCode
        Boolean cancelRequested
        Date startedAt
        Date finishedAt
        ReviewResult result "embedded"
    }

    CHAT_MESSAGE {
        ObjectId _id PK
        ObjectId contractVersionId FK
        ObjectId orgId FK
        ObjectId userId FK
        String role
        String content
    }

    LEGAL_SOURCE {
        ObjectId _id PK
        String code UK
        String title
        String documentNumber
        String sourceType
        String status
        String issuingBody
        String citationLabel
        Date issuedDate
        Date effectiveDate
        Date expiryDate
        LegalCoverage coverage "embedded"
        LegalIngestion ingestion "embedded"
        LegalSourcePart[] parts "embedded"
    }

    LEGAL_CHUNK {
        ObjectId _id PK
        ObjectId legalSourceId FK
        Number order
        String chunkText
        String articleRef
        Number articleNumber
        String articleKey
        String articleTitle
        Number clauseFrom
        Number clauseTo
        LegalHeading[] hierarchy "embedded"
    }

    RISK_CITATION {
        ObjectId _id PK
        ObjectId riskFindingId FK
        ObjectId legalKnowledgeChunkId FK
        Number relevanceScore
    }

    EXPERT_REVIEW {
        ObjectId _id PK "planned"
        ObjectId reviewId FK
        ObjectId orgId FK
        ObjectId reviewerId FK
        String status
        String decisionNote
        Date assignedAt
        Date startedAt
        Date completedAt
    }

    EXPERT_ACTION {
        ObjectId _id PK "planned"
        ObjectId expertReviewId FK
        ObjectId riskFindingId FK
        String action
        String reason
        Mixed before
        Mixed after
    }

    COMMENT {
        ObjectId _id PK "planned"
        ObjectId expertReviewId FK
        ObjectId authorId FK
        ObjectId clauseId FK
        ObjectId riskFindingId FK
        String content
    }

    REPORT {
        ObjectId _id PK "planned"
        ObjectId orgId FK
        ObjectId reviewId FK
        String format
        Boolean masked
        Boolean expertVerified
        String fileKey
        ObjectId createdBy FK
    }

    REVIEW_PACKAGE {
        ObjectId _id PK "planned"
        ObjectId orgId FK
        ObjectId contractId FK
        ObjectId paymentId FK
        String source
        Number reviewsGranted
        Number reviewsUsed
        String status
    }

    STD_TEMPLATE {
        ObjectId _id PK "planned"
        String contractType FK
        String name
        Number version
        String fileKey
        ObjectId createdBy FK
        String status
        Date publishedAt
    }

    STD_CLAUSE {
        ObjectId _id PK "planned"
        ObjectId templateId FK
        Number order
        ObjectId clauseTypeId FK
        String title
        String text
    }

    AUDIT_LOG {
        ObjectId _id PK "planned"
        ObjectId orgId FK
        ObjectId userId FK
        String action
        String targetType
        ObjectId targetId
        String result
        String ipAddress
        String userAgent
        Mixed metadata
    }

    NOTIFICATION {
        ObjectId _id PK "planned"
        ObjectId userId FK
        ObjectId orgId FK
        String type
        String title
        String body
        String link
        Date readAt
    }
```

## Entity Reference

| Entity | Source model | Group | Status | Purpose |
|--------|--------------|-------|--------|---------|
| ORGANIZATION | Organization | Organization & Accounts | Implemented | A business, or a personal organization for an individual user |
| USER | User | Organization & Accounts | Implemented | Login account (email/password or Google) |
| ROLE | Role | Organization & Accounts | Implemented | System role catalog |
| ORG_INVITATION | OrganizationInvitation | Organization & Accounts | Implemented | Email invitation to join an organization |
| EMAIL_VERIFY | EmailVerification | Organization & Accounts | Implemented | OTP email verification session for sign-up / accepting an invitation |
| PLAN | Plan | Plans & Payments | Implemented | Service plan catalog with limits |
| ORG_SUB | OrganizationSubscription | Plans & Payments | Implemented | Organization subscription state, with scheduled downgrade |
| SUB_PERIOD | SubscriptionPeriod | Plans & Payments | Implemented | A usage period with limits and usage counters |
| USAGE_RUN | UsageRun | Plans & Payments | Implemented | One reservation/charge of an analysis or chat credit |
| PAYMENT | Payment | Plans & Payments | Implemented | Payment order via PayOS |
| REVIEW_PACKAGE | — | Plans & Payments | Planned | Per-contract review credits: 5 included, more purchased from the 6th review |
| CONTRACT | Contract | Contracts & Analysis | Implemented | Contract uploaded by a user |
| CONTRACT_VER | ContractVersion | Contracts & Analysis | Implemented | One version of a contract file and its processing results |
| CLAUSE | Clause | Contracts & Analysis | Implemented | Clause segmented from the contract text |
| CLAUSE_TYPE | ClauseTypeTaxonomy | Contracts & Analysis | Implemented | Catalog of 30 clause types |
| CT_PROFILE | ContractProfile | Contracts & Analysis | Implemented | Contract type configuration: applicable laws, mandatory clauses, industry rules, redaction policy |
| INDUSTRY | Industry | Contracts & Analysis | Implemented | Industry catalog |
| RISK_FINDING | RiskFinding | Contracts & Analysis | Implemented | Risk detected in a contract version |
| REVIEW | Review | Contracts & Analysis | Implemented | One AI review run and its result snapshot |
| CHAT_MESSAGE | ChatMessage | Contracts & Analysis | Implemented | Q&A message about a contract version |
| LEGAL_SOURCE | LegalSource | Legal Knowledge | Implemented | Legal document / standard template |
| LEGAL_CHUNK | LegalKnowledgeChunk | Legal Knowledge | Implemented | Legal text chunk (by article/clause) used to look up legal basis |
| RISK_CITATION | RiskCitation | Legal Knowledge | Implemented | Link between a risk finding and a cited legal chunk, with relevance score |
| EXPERT_REVIEW | — | Expert Review & Reporting | Planned | Lawyer verification session for one AI review (approve or return) |
| EXPERT_ACTION | — | Expert Review & Reporting | Planned | One lawyer decision on a finding, with before/after snapshot |
| COMMENT | — | Expert Review & Reporting | Planned | Lawyer comment on a clause or finding during expert review |
| REPORT | — | Expert Review & Reporting | Planned | Exported PDF/DOCX review report |
| STD_TEMPLATE | — | Templates & Audit | Planned | Standard contract template per contract type, for clause-by-clause comparison |
| STD_CLAUSE | — | Templates & Audit | Planned | Standard clause inside a template, typed by clause type |
| AUDIT_LOG | — | Templates & Audit | Planned | Record of who did what to which record, and the outcome |
| NOTIFICATION | — | Templates & Audit | Planned | In-app notification to a user |

## Notes & Assumptions

- **Types follow the mongoose models:** every entity is a MongoDB collection keyed by `ObjectId _id`; field names are the camelCase names used in code; `Number` covers both integers and decimals (VND amounts are whole numbers); `Mixed` is free-form data. A type marked `"embedded"` (e.g. `LegalBasis[]`, `ReviewResult`) is a sub-document stored inside the parent, not a separate collection.
- **Every entity has `createdAt` / `updatedAt` timestamps** — not repeated in each entity.
- **Links matched by code, not by `ObjectId`:** `CONTRACT.type` matches `CT_PROFILE.code` or one of its aliases; `CONTRACT.industry` and `ORGANIZATION.industry` match `INDUSTRY.code`; `CT_PROFILE` points to `LEGAL_SOURCE`, `CLAUSE_TYPE` and `INDUSTRY` via code lists; `PAYMENT.planCode`, `ORG_SUB.scheduledDowngrade.planCode` and `SUB_PERIOD.plan.code` match `PLAN.code`; `STD_TEMPLATE.contractType` matches `CT_PROFILE.code`. These fields are marked `FK` but hold a `String` code. Changing a code in a catalog entity breaks these links.
- **SUB_PERIOD snapshots the full plan details** (`plan`: code, price, limits) at grant time — changing price/limits on PLAN does not affect running periods.
- **N:N relationships drawn without a junction table:** `CT_PROFILE` with `LEGAL_SOURCE` / `CLAUSE_TYPE` / `INDUSTRY` is stored as code lists inside `CT_PROFILE`; `RISK_FINDING` with `LEGAL_CHUNK` is stored as `legalKnowledgeChunkIds` inside each `RISK_FINDING.legalBasis` item. Only `RISK_CITATION` is a real link entity, with an extra relevance score.
- **Embedded sub-documents:** extraction progress/quality, redaction summary and key terms on `CONTRACT_VER`; automatic classification on `CONTRACT`; legal basis and proposed revision on `RISK_FINDING`; stage statuses and result snapshot on `REVIEW`; coverage, ingestion progress and uploaded parts on `LEGAL_SOURCE`; parent headings on `LEGAL_CHUNK`; parties and industry rules on `CT_PROFILE`; scheduled downgrade on `ORG_SUB`; plan snapshot on `SUB_PERIOD`.
- **`CONTRACT_VER.keyTerms[].clauseId` points to `CLAUSE`** of the same version — not drawn as a separate line to keep the diagram readable.
- **`orgId` is repeated on CLAUSE, RISK_FINDING, REVIEW, CHAT_MESSAGE and USAGE_RUN** to scope data per organization; the diagram only draws the main ownership relationships.
- **Two kinds of risk finding:** `clause_risk` is tied to one `CLAUSE`; `missing_clause` has no `CLAUSE` and points to the missing clause type (`expectedClauseTypeId`).
- **At most 1 running review per contract** (`REVIEW.activeLock`) and at most 1 reserved analysis credit per contract; **at most 1 open payment order per organization** (`PAYMENT.isOpen`); **1 subscription record per organization** (`ORG_SUB.orgId` is unique).
- **Each REVIEW holds exactly 1 USAGE_RUN of kind analysis**; chats also go through USAGE_RUN (kind chat), but CHAT_MESSAGE does not store a link to the charged run.
- **Not included in the ERD:** hashed passwords/OTPs/tokens (`passwordHash`, `otpHash`, `challengeHash`, `invitationHash`, `tokenHash`), the `embedding` vector of legal chunks, and the raw `result` stored on USAGE_RUN.
- **Planned entities** (REVIEW_PACKAGE, EXPERT_REVIEW, EXPERT_ACTION, COMMENT, REPORT, STD_TEMPLATE, STD_CLAUSE, AUDIT_LOG, NOTIFICATION; marked `"planned"` on their `_id`) are not in code yet — their attributes are a proposed design covering audit log, report export, standard template comparison and lawyer verification from the project scope. `USAGE_RUN.packageId` and the `review_package` value of `PAYMENT.action` are planned additions to existing entities.
- **STD_TEMPLATE overlaps with `LEGAL_SOURCE.sourceType = standard_template`:** STD_TEMPLATE is meant for clause-by-clause comparison against a contract; LEGAL_SOURCE stays the source for legal-basis lookup. Decide whether standard templates live in one place or both.
- **Expert-added findings:** when a lawyer adds a missed risk (`EXPERT_ACTION.action = add_missing`), a new RISK_FINDING is created, so `RISK_FINDING.detectedBy` will need an `expert` value.
- **Review package billing:** each contract gets an included package of 5 reviews; from the 6th review the user buys another package (PAYMENT with `review_package` action). A review charges the package through USAGE_RUN.
