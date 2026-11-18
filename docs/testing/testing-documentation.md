# V. Testing Documentation — LawScan

**Document basis:** frontend and backend source code on branch `fix/contract-template` (merged with `dev`), reviewed on 18 November 2026, together with the testing-documentation example supplied by the project team. The function-level inventory is [lawscan-function-test-inventory.tsv](lawscan-function-test-inventory.tsv) (121 functions).

**Scope boundary:** this document describes the testing scope based on the current frontend and backend implementation. Backend API availability and frontend UI integration are identified separately where they differ. It is not a complete product requirements specification and does not certify that every function has passed testing. The final SRS/use-case list has not been supplied for a requirements-to-test coverage audit.

An implemented function is a candidate for testing, not automatically a passed test. The tables below describe expected checks. Actual results require a test run, an environment, a build identifier and recorded evidence.

## 1. Scope of Testing

### 1.1 Implemented functional scope

| Feature | Function | Description / expected verification | Primary actor |
| --- | --- | --- | --- |
| Authentication | Register and verify email | Verify registration starts email verification, OTP delivery, valid/invalid/expired code, the five-attempt limit, resend cooldown/hourly limit, duplicate email and account activation. OTP challenges are stored in Redis. Password must be at least 12 characters and no more than 72 UTF-8 bytes. | Guest |
| Authentication | Login | Verify valid credentials, incorrect password, inactive accounts, the unverified-account verification flow, validation feedback and role-appropriate navigation. | Registered user |
| Authentication | Google sign-in | Verify valid/invalid Google credentials, nonce validation, account linking, inactive/unverified accounts and invitation token handling. | Guest / registered user |
| Authentication | Forgot and reset password | Verify the same public response for known, unknown and inactive emails, OTP delivery, resend cooldown/hourly limit, wrong/expired codes, the five-attempt lock, password rules checked before the code is consumed, and that earlier sessions stop working after a reset. | Registered user |
| Authentication | Remember and refresh session | Verify session persistence follows the remember-me selection, access-token renewal, rejected invalid/expired tokens and that a token issued before a permission change is rejected. | Signed-in user |
| Authentication | Logout | Verify the frontend clears authentication cookies and cached private data and redirects to sign-in. There is no backend logout route; tokens are invalidated by password change/reset or permission changes. | Signed-in user |
| Authentication | Access control | Verify protected pages and API calls reject missing credentials and disallowed roles; the effective role is recomputed from memberships on every request, and a forged display cookie must not bypass backend authorization. | All roles |
| Account profile | View and update profile | Verify name/phone updates with trimming and validation, and that email, role, organization and active status cannot be changed through the profile. | Signed-in user |
| Account profile | Change password | Verify the current password is required and old access/refresh tokens are revoked. | Signed-in user with a password |
| Account profile | Avatar | Verify upload limits, rejection of SVG and of files whose content does not match the image type, replacement and removal. | Signed-in user |
| Onboarding | Select workspace | Verify continuing with a personal workspace or creating an organization and navigating to the appropriate workspace; owners and staff can switch to their personal workspace. | Signed-in user |
| Organization | Create organization | Verify required business data (name, tax code, industry, province/ward and address line), that the creator becomes Owner, that a user can belong to one organization only, and that a new organization receives a one-time 7-day trial (once per owner). | Personal user |
| Organization | View organization | Verify displayed information belongs to the caller's organization and cannot be read through another organization's identifier. | Organization member |
| Organization | Update organization | Verify editing name, tax code, industry and structured address, required-field validation, trimming, pending/error feedback and refreshed information. | Owner |
| Organization | Delete organization | Verify explicit confirmation; rejection while contracts or other members remain; pending invitations are revoked and the former owner continues as a personal account. | Owner |
| Members and invitations | View members | Verify the owner can view paginated members and that other organizations' members are inaccessible. | Owner |
| Members and invitations | Remove member | Verify confirmation, that the owner cannot remove themself, that removed accounts lose organization access but keep their personal data and subscription, and that the freed seat becomes available. | Owner |
| Members and invitations | Invite member | Verify inviting a valid email as Staff (the only invitation role); reject duplicates, invalid emails, capacity violations (pending invitations reserve seats) and unauthorized requests; handle email-delivery errors. | Owner |
| Members and invitations | View and revoke invitations | Verify pagination and pending, accepted, revoked, expired, declined and delivery-failed states; revocation refreshes lists and capacity. | Owner |
| Members and invitations | Preview, accept and decline | Verify the email link preview, accepting from the link or from the dashboard inbox, declining, recipient matching, capacity rules and session refresh into the assigned workspace. | Invitation recipient |
| Contract management | View contract list | Verify scope-isolated listings, search, status/risk filters, pagination, loading, empty and error states. | Owner, Staff, User |
| Contract management | Upload contract | Verify supported PDF, DOCX, PNG and JPEG uploads up to 20 MB, duplicate detection by file hash, and rejection of unsupported files and roles. | Owner, Staff, User |
| Contract management | Classification and confirmation | Verify AI classification of type and parties, unsupported types, user confirmation of type/own party and the personal/business review policy. | Owner, Staff, User |
| Contract management | Versions | Verify uploading a new version (type/party kept), duplicate-version detection, blocking while a review runs, attaching a separate upload as a version and detaching it. | Owner, Staff, User |
| Contract management | View metadata, file and text | Verify the correct contract/version is loaded, private file access is authorized and failures do not expose another account's documents. | Contract owner scope |
| Contract management | Delete contract | Verify confirmation, double-submit prevention, cache cleanup, page adjustment, and that deletion is blocked during a checkout or while a paid review is unused. | Owner, Staff, User |
| Document privacy | Redacted preview | Verify sensitive text is masked, redacted and full-text caches are separate, and a redaction failure never falls back to the original document. | Contract owner scope |
| Document privacy | Original-document consent | Verify explicit confirmation before revealing full text or the original file, version selection, clause navigation and returning to the masked view. | Contract owner scope |
| AI review | Start review | Verify the page-based cost quote (1 unit per 5 pages), confirmation of a changed quote, role/type policies and that a persisted idempotency key prevents duplicate jobs. | Owner, Staff, User |
| AI review | Quota and paid reviews | Verify plan units, purchased top-up units, per-contract paid reviews (only the shortfall is paid; an unused purchase moves to a newer version) and the error codes when units are exhausted. | Owner, Staff, User |
| AI review | Track, cancel and retry | Verify queued/running/completed/failed states, SSE updates with polling fallback, cancellation with refund, explicit retry, and that reopening a failed run never starts AI automatically. | Owner, Staff, User |
| Review results | Summary, findings and clauses | Verify summary, severity counts, ordering/filtering, clause locations, missing-result states and that incomplete analysis never implies a safe contract. Findings rejected by an expert are hidden. | Contract owner scope |
| Review results | Key terms and proposed revisions | Verify key terms per version and editing/removing proposed revision text without rerunning AI. | Owner, Staff, User |
| Contract chat | Ask about a contract | Verify streamed and regular answers, quota errors with a top-up action, included chat questions of a paid review spent before the plan quota, interrupted streams and history per version. | Owner, Staff, User |
| Share summary | Preview, edit and copy | Verify the redacted summary uses the latest completed review, local editing, restoring, copying and clipboard-denial feedback. Email delivery is not implemented. | Contract owner scope |
| Expert verification | Request and track | Verify requesting verification of a completed review, blocking a second request and re-reviewing during verification, and status tracking for the requester. | Owner, Staff, User |
| Expert verification | Expert workspace | Verify the queue, taking a request, confirming/editing/rejecting AI findings, adding/removing findings, approving or returning with a reason, and the expert's work history and reports. | Expert |
| Expert consultation | Chat with the expert | Verify that only the requester and the assigned expert can read and send messages and that participant names are shown. | Requester, Expert |
| Contract drafting | Drafts and studio | Verify the template catalog per workspace, creating/editing drafts with revision checks, AI generation and studio assistant proposals (one drafting unit per successful result), applying/dismissing proposals, approval, DOCX export and transfer of business drafts to the contract repository. | Owner, Staff, User |
| Template management | Managed templates | Verify cloning base templates, validation, private unpublished edits, immutable published versions used only by new drafts, retiring and deleting. | Manager |
| Legal source management | Sources and ingestion | Verify listing/filtering, preview before saving, creating sources, appending parts, resuming ingestion, editing metadata with history, re-parsing and content replacement after preview, and deletion. | Manager |
| Subscription | Plan catalog | Verify API-derived names, prices and quotas, personal/business switching and loading/error states on the homepage and catalog. | Guest / signed-in user |
| Subscription | Current subscription | Verify the current plan, period, remaining quotas (including purchased units), member capacity, renewal state and trial state. | Owner / personal User |
| Subscription | Checkout and payment | Verify the server-decided action and amount (purchase, renewal, upgrade with credit for unused paid time), payOS checkout, webhook/sync settlement, cancellation, payment history, partial payments, and that an abandoned unpaid order is replaced while a paid one is settled. | Owner / personal User |
| Subscription | Renewal and downgrade | Verify renewal only in the last 7 days or the 3-day grace period and one period ahead, scheduling a lower plan for the next period, paying it as the renewal, cancelling the schedule, and the in-app renewal reminder. | Owner / personal User |
| Subscription | Top-up units | Verify packs are sold only to active paid plans, units are credited once, spent after plan units, and moved to the new period on upgrade. | Owner / personal User |
| Dashboard and reports | Overviews and reports | Verify role-scoped overviews, period statistics, export, and that sparse periods show a summary instead of misleading charts. Personal accounts read their figures on the overview (no report page); Administrator and Owner have operational reports, Manager and Expert have their own report pages. | All dashboard roles |
| Administration | User management | Verify listing/filtering, creating User/Administrator/Manager/Expert accounts, updating, deleting, and that organization Staff cannot be promoted to a system role. | Administrator |
| Administration | Service health | Verify administrator-only access and service-health feedback. | Administrator |
| Public website | Homepage and sample content | Verify navigation, the contract-clause example, sample-report links, FAQ, sign-in/registration links and plan selection; label demonstration content as illustrative. | Guest / signed-in user |
| Public website | Responsive layout and motion | Verify Vietnamese text, mobile navigation, usable buttons, no horizontal overflow, focus handling and reduced motion at the supported viewport sizes. | All visitors |

*Table 5.1: Scope of Testing for currently implemented LawScan functions.*

Role notes:

- Roles are `Administrator`, `Manager` and `Expert` (LawScan staff, never members of an organization), `Owner` and `Staff` (organization members) and `User` (personal account). Owners and staff can also act in their personal workspace as `User`.
- Data and billing are scoped by account: an organization, or the user's own ID for a personal account. Cross-scope identifiers return "not found".
- Legal sources and managed templates belong to Manager; user management and operational reports belong to Administrator.

### 1.2 Not implemented or outside the completed scope

The following must not be reported as implemented and passed simply because they appear in the sample report or in a navigation menu.

| Function | Current boundary |
| --- | --- |
| Facebook login | No corresponding provider-login endpoint. |
| Backend logout / token revocation endpoint | The frontend clears its session; there is no logout route. |
| Admin "AI monitoring" and "Audit log" sections | These pages display fixed sample rows, not data from the backend. |
| Global organization management for Administrator | Organizations are listed for Manager; there is no administrator organization-management API. |
| Member role changes | Only Staff can be invited; there is no endpoint to change a member's role. |
| Automatic recurring billing and refunds | payOS payments are one-off; renewal is manual with an in-app reminder. There is no refund flow. |
| Admin editing of plans and top-up packs | Prices and limits are seeded and configured in the database; there is no editing UI or API. |
| Emailing the share summary | The implemented summary flow supports preview, editing and copying only. |

These functions can be listed as planned or deferred only after confirmation against the approved project requirements. An absent feature is not automatically a requirement of LawScan.

## 2. Test Strategy

### 2.1 Testing Types

The completion criteria below are proposed acceptance criteria, not claims that testing has already achieved them.

| Objective | Technique | Proposed completion criteria |
| --- | --- | --- |
| Validate isolated validators, access policies, quota/period/pricing calculations, query-cache updates and review recovery logic. | Unit / component testing | Cases for the agreed critical rules and boundary conditions pass. Coverage percentages are reported only from an actual coverage run. |
| Verify communication between frontend proxies, backend services, database, file storage, queue, payment and email providers. | Integration testing | Data formats, authorization, scope isolation, errors and state transitions match the expected contract on the recorded environment. Tests with fixtures or mocks are identified separately from real-service tests. |
| Validate complete user journeys. | End-to-End testing | Agreed journeys pass against a running FE/BE and configured dependencies: onboarding; invitations; upload and review; paid review and checkout (payOS sandbox); expert verification; drafting; source ingestion; subscription changes. |
| Verify AI outputs on representative contracts. | AI-output evaluation | A documented, versioned evaluation set is reviewed for expected findings, clause/citation correspondence, missing-clause behavior and unsupported claims. Acceptance thresholds require agreement and expert review; ordinary UI tests do not measure AI accuracy. |
| Assess responsiveness and stability of core operations. | Performance / load testing | Measured response times, queue delays, stream behavior and error rates meet approved targets at the specified concurrency. No load-test result is claimed before execution. |
| Verify authentication, role enforcement, payment integrity and private-document handling. | Security testing | Agreed tests for missing/expired/stale tokens, forged cookies, cross-scope IDs, file access, input validation, quota enforcement, webhook signatures and server-side pricing pass. Unresolved findings are recorded with severity and release decisions. |
| Verify readability, interaction and accessibility. | Usability / accessibility testing | Target workflows can be completed with clear feedback; keyboard/focus checks, Vietnamese text, responsive layout and reduced motion are verified. A full accessibility-compliance claim requires a separate audit. |
| Detect changes that break existing workflows. | Regression testing | Automated suites, static checks, production build and relevant browser checks pass on the release candidate; any exclusions are recorded. |

*Table 5.2: Testing Types and proposed completion criteria.*

### 2.2 Test design

- Use equivalence classes and boundaries for strings, file size/type, page counts (5-page units), pagination, quota, member limits and renewal windows (7 days before, 3 days after expiry).
- Cover valid, invalid, empty, unauthorized, loading, retry and double-submit cases.
- Use accounts for all six roles, at least two organizations and two personal accounts to test isolation.
- Exercise queued/running/completed/failed states, stale data, interrupted SSE, refresh and navigation while work continues.
- For payments, cover paid, cancelled, expired, partially paid, duplicated webhook and late-settled orders using the payOS sandbox or recorded fixtures.
- Distinguish illustrative homepage data, mocked API responses, backend fixtures and external AI/payment provider responses.
- Create controlled test contracts and legal documents; never delete production organizations or contracts during testing.

## 3. Test Environment and Evidence

Record actual values for every execution:

| Item | Required information |
| --- | --- |
| Build | Commit hash, branch, any uncommitted changes and execution time. |
| Frontend | Next.js build, configured API URL and browser version. |
| Backend | Running API and worker version, environment configuration and enabled integrations. |
| Dependencies | Test MongoDB, Redis/queue, file storage, email, AI and payment provider availability; identify every mocked dependency. |
| Accounts and fixtures | Role, organization membership, subscription/quota/trial state and test document identifiers. |
| Viewports | Browser checks exercise 320, 390, 820, 1024 and 1440 px. This does not establish coverage of all browsers/devices. |
| Results | Test ID, expected/actual results, pass/fail/blocked/not-run status, evidence link and defect reference. |

### 3.1 Existing verification entry points

Frontend commands, run from `frontend`:

```sh
npm run lint
node --test scripts/*.test.mjs
npm run build
node scripts/admin-smoke.cjs
node scripts/subscription-browser-check.mjs
node scripts/payment-browser-check.mjs
```

Further browser checks exist for the dashboard, profile, legal sources, contract drafts, expert workspace and expert consultation (`scripts/*-browser-check.mjs`). Logic tests transpile single modules and run them with stubbed dependencies; browser and smoke scripts run against isolated backend fixtures. Neither establishes that a workflow succeeds with a real database, queue, AI provider or payment provider.

Backend commands, run from `backend`:

```sh
npm run build
npm run lint
npm test
```

Backend tests run against the compiled `dist/` output with an in-memory MongoDB replica set and mocked external providers (payOS, Gemini, email, Cloudinary). `tests/setup/redis.js` replaces Redis with an in-memory double so tests never use a shared Redis server.

Last recorded run on this branch (18 November 2026): backend 37 suites / 389 tests passed; frontend lint clean, 302 logic tests passed and production build succeeded. This is a record of automated checks only; it is not evidence for end-to-end or provider-integrated testing.

Related workflow guides:

- [Review recovery guide](../../frontend/scripts/review-recovery-test-guide.md)
- [Redacted document guide](../../frontend/scripts/redacted-document-test-guide.md)
- [Frontend API integration status](api-integration-status.md)
- [Plan lifecycle rules](../subscription/plan-lifecycle.md)

## 4. Test Case and Result Template

| Field | Required content |
| --- | --- |
| Test Case ID | A stable identifier, for example `AUTH-REG-001`. |
| Requirement / Use Case ID | Identifier from the approved SRS; use `TBD` until mapped. |
| Feature / Function | Function from Table 5.1 or the function inventory. |
| Preconditions | Role, workspace, quota, document state and required services. |
| Test data | Inputs and relevant fixtures. |
| Steps | Numbered, reproducible actions. |
| Expected result | Observable result and relevant state changes. |
| Actual result | Observations from the execution; leave blank until run. |
| Status | Not run / Passed / Failed / Blocked. |
| Evidence | Screenshot/log/test-output reference, build and environment. |

Do not prefill Actual Result with Expected Result or mark every case Passed merely because the function exists.

## 5. Completeness Assessment

This document consolidates the implemented testing scope as of 18 November 2026, including password recovery, profiles, contract versions, expert verification and consultation, contract drafting, managed templates, payments, renewals, top-ups, trials and role-specific reports. It also records workflows that are unavailable or shown with sample data only.

**It does not establish complete coverage of the intended final system.** To assess that, the team must provide the approved SRS/use-case inventory, map each requirement to a test case and maintain a requirements traceability matrix:

| Requirement ID | Approved function | Implementation status | Test Case IDs | Execution status | Evidence / defect |
| --- | --- | --- | --- | --- | --- |
| TBD | Map from approved SRS | Implemented / Partial / Planned | TBD | Not run until executed | TBD |

Until this mapping and execution evidence are completed, report the document as **“Testing scope based on the current implementation”**, not **“All system functions implemented and fully tested.”**
