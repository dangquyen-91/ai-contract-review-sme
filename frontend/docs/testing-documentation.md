# V. Testing Documentation — LawScan

**Document basis:** frontend and backend source code in the current workspace, reviewed on 17 October 2026, together with the testing-documentation example supplied by the project team.

**Scope boundary:** this document describes the testing scope based on the current frontend and backend implementation. Backend API availability and frontend UI integration are identified separately where they differ. It is not a complete product requirements specification and does not certify that every function has passed testing. The final SRS/use-case list has not been supplied for a requirements-to-test coverage audit.

An implemented function is a candidate for testing, not automatically a passed test. The tables below describe expected checks. Actual results require a test run, an environment, a build identifier and recorded evidence.

## 1. Scope of Testing

### 1.1 Implemented functional scope

| Feature | Function | Description / expected verification | Primary actor |
| --- | --- | --- | --- |
| Authentication | Register and verify email | Verify registration starts email verification, OTP delivery, valid/invalid/expired code, the five-attempt limit, resend cooldown/rate limit, duplicate email and successful account activation. Password must be at least 12 characters and no more than 72 UTF-8 bytes. | Guest |
| Authentication | Login | Verify valid credentials, incorrect password, unavailable/inactive accounts, unverified-account verification flow, validation feedback and role-appropriate navigation. | Registered user |
| Authentication | Google sign-in | Verify valid/invalid Google credentials, nonce validation, account linking, inactive/unverified accounts, invitation token handling and remember-me behavior. | Guest / registered user |
| Authentication | Resend verification | Verify valid challenge, resend cooldown, hourly send limit, invalid/expired challenge and invitation-token matching. | Guest / registered user pending verification |
| Authentication | Remember session | Verify session persistence follows the remember-me selection and that expired credentials do not grant access. | Registered user |
| Authentication | Refresh session | Verify refresh-token handling, access-token renewal, rejected invalid/expired tokens and recovery of requests after an expired access token. | Signed-in user |
| Authentication | Logout | Verify the frontend logout flow clears authentication cookies and cached private data and redirects to sign-in. Do not describe this as backend refresh-token revocation: there is no logout route in the current backend auth router. | Signed-in user |
| Authentication | Access control | Verify protected pages and API calls reject missing credentials and disallowed roles; changing the frontend display cookie must not bypass backend authorization. | All roles |
| Onboarding | Select workspace | Verify choosing a personal workspace or creating an organization and navigating to the appropriate workspace after completion. | Signed-in user eligible for onboarding |
| Organization | Create organization | Verify required organization data, organization creation/conversion from an eligible personal workspace, assignment of the owner workflow and prevention of invalid membership transitions. | Eligible signed-in user |
| Organization | View organization | Verify displayed organization information belongs to the caller's organization and cannot be read through another organization's identifier. | Organization member |
| Organization | Update organization | Verify editing name, tax code and address, trimming values, clearing optional fields, validation, pending/error feedback and refreshed organization information. | Owner |
| Organization | Delete organization | Verify explicit confirmation; reject deletion while contracts or other members remain; verify pending invitations are revoked and the frontend session/cache is cleared only after successful deletion. | Owner |
| Members and invitations | View members | Verify the owner can view paginated members with their roles and membership state, and that other organizations' members are inaccessible. | Owner |
| Members and invitations | Remove member (backend API) | Verify only the owner can remove a member; the owner cannot remove themself or another owner; removed accounts lose organization access, revert to the personal `user` role, and pending invitations for that member are revoked. **The backend route exists; a corresponding frontend action is not currently wired.** | Owner (API-level) |
| Members and invitations | Invite member | Verify inviting a valid email with an allowed invitation role; reject duplicates, invalid roles/emails, capacity violations and unauthorized requests; handle email-delivery errors. | Owner |
| Members and invitations | View invitations | Verify invitation pagination and pending, accepted, revoked, expired and delivery-failed states, where returned by the API. | Owner |
| Members and invitations | Revoke invitation | Verify only an authorized owner can revoke an eligible invitation and that invitation lists and available capacity refresh correctly. | Owner |
| Members and invitations | Preview invitation | Verify invitation details are shown for a valid token and errors are shown for invalid, expired or revoked tokens without exposing unrelated data. | Invitation recipient |
| Members and invitations | Accept invitation | Verify the signed-in account matches the recipient and joining respects organization membership/capacity rules; refresh the session and navigate to the assigned role's workspace. | Invitation recipient |
| Contract management | View contract list | Verify organization-scoped listings, search, status/risk filters, pagination, loading, empty and error states. | User / organization member |
| Contract management | Upload contract | Verify supported PDF, DOCX, PNG and JPEG uploads, required contract metadata and the configured 20 MB limit; reject unsupported files and unauthorized roles. | User, Owner, Manager, Staff |
| Contract management | Extraction status | Verify upload/extraction states and failures are presented correctly, and that the user cannot mistake an incomplete extraction for a completed review. | Authorized contract user |
| Contract management | View contract metadata, file and text | Verify the correct contract/version is loaded, private file access is authorized and download/preview failures are shown without exposing another organization's documents. | User / organization member |
| Contract management | Delete contract | Verify role restrictions, confirmation, duplicate-submit prevention, backend failures, cache cleanup and pagination after removing the final item on a page. | User, Owner, Manager |
| Document privacy | Redacted preview | Verify sensitive text is masked in the supported preview, full-text and redacted query caches are separate, and a redaction failure never silently falls back to an original document. | Authorized contract user |
| Document privacy | Original-document consent | Verify explicit confirmation before revealing original content, correct version selection, clause navigation and returning to the masked view. | Authorized contract user |
| AI review | Start review | Verify the selected contract and optional analysis focus are used, role/type policies are enforced and a persisted idempotency key prevents duplicate jobs after a lost response. | User, Owner, Manager, Staff, Reviewer |
| AI review | Check available quota | Verify analysis allowance, reservation/usage feedback and blocked requests when the applicable allowance is exhausted. | Authorized reviewer |
| AI review | Track processing | Verify queued/running/completed/failed states, SSE updates, polling fallback after interruption and cancellation of frontend observation when leaving the page. | Authorized reviewer |
| AI review | Resume review | Verify refresh, navigation and temporary disconnection resume the same run, and failure to fetch results does not trigger another AI run. | Authorized reviewer |
| AI review | Rerun review | Verify rerunning is an explicit action, observes quota/policy rules and does not happen automatically when a failed run is reopened. | Authorized reviewer |
| Review results | Summary and risk findings | Verify summary, severity counts, ordering/filtering of findings, missing-result states and failed requests. Missing or incomplete analysis must not imply that a contract is safe. | Authorized contract user |
| Review results | Clause location and references | Verify findings navigate to available clause locations, missing clauses do not offer invalid locations and references correspond to the returned findings. | Authorized contract user |
| Review results | Key terms | Verify the contract's returned key terms and unavailable/error states without mixing versions or documents. | Authorized contract user |
| Review results | Proposed revisions | Verify viewing, editing and removing proposed revision text, input validation, authorization and updating the cached result without rerunning AI. This does not mean editing the uploaded original file. | Authorized reviewer |
| Contract chat | Ask about contract | Verify streamed responses, relevant contract context, quota errors, empty/invalid questions, interrupted streams and retry feedback. | Authorized reviewer |
| Contract chat | View chat history | Verify messages are loaded for the correct contract/version and cannot be obtained from another organization. | Authorized contract user |
| Share summary | Preview, edit and copy | Verify the supported redacted summary, local draft editing, restoring the draft, copying and clipboard-denial feedback. Email delivery is not part of the implemented flow. | Authorized contract user |
| Legal source management | View and filter sources | Verify administrator source listings, search, type/status filters and loading/empty/error states. | Administrator |
| Legal source management | Preview upload | Verify supported legal-document formats and required metadata, inspect the preview before saving and invalidate an outdated preview after file/form changes. | Administrator |
| Legal source management | Add source | Verify creating a source after validation, ingestion state, pending-state protection and failure feedback. | Administrator |
| Legal source management | Source detail popup | Verify opening details in place, source metadata, available reference parts, loading/error states, closing behavior and focus restoration. | Administrator |
| Legal source management | Append document parts | Verify supplementing the selected source, file validation, processing feedback and refreshed detail/list information. | Administrator |
| Legal source management | Resume processing | Verify resuming an eligible ingestion job, handling already-running/invalid states and refreshing processing status. | Administrator |
| Legal source management | Delete source | Verify confirmation, authorization, failure feedback and removal of the deleted source from displayed data. | Administrator |
| Legal source management | Metrics and charts | Verify type/processing distributions and counts match the loaded dataset, unknown statuses are handled and chart actions apply the expected filters. These are not global platform analytics. | Administrator |
| Subscription | View plan catalog | Verify API-derived names, monthly prices and quotas, personal/business switching, detail dialogs and loading/empty/unavailable states on the homepage and catalog. | Guest / signed-in user |
| Subscription | View current subscription | Verify the actual current plan, dates, remaining analysis/chat quotas and member capacity for the caller's organization/workspace. | Owner / personal User in the current management UI |
| Subscription | Schedule downgrade | Verify selecting a lower-priced plan in the same family, membership limits, confirmation and the returned effective date. Scheduling must not imply immediate activation or successful payment. | Owner / personal User |
| Subscription | Cancel scheduled downgrade | Verify cancelling an eligible schedule, server-side restrictions for already-paid periods, confirmation and refreshed subscription data. | Owner / personal User |
| Dashboard | Organization overview | Verify organization-scoped contract counts and available status/risk statistics, role navigation and error/retry states. | Organization roles according to their workspace |
| Dashboard | Admin access and service health | Verify administrator-only shell access, service-health feedback and availability of the implemented legal-source tools. Placeholder menu sections must not be presented as working management features. | Administrator |
| Public website | Homepage and sample content | Verify navigation, the interactive contract-clause example, sample-report links, FAQ, registration/sign-in links and plan selection. Label demonstration content as illustrative. | Guest / signed-in user |
| Public website | Responsive typography and motion | Verify Vietnamese font loading, the slogan, mobile navigation, usable buttons, no horizontal page overflow, focus handling and reduced-motion behavior at the supported viewport sizes. | All visitors |

*Table 5.1: Scope of Testing for currently implemented LawScan functions.*

Role notes:

- `User` means a personal account; `Owner`, `Manager`, `Staff` and `Reviewer` are organization roles.
- Administrator permissions on contract and organization endpoints remain scoped by the backend to the administrator account's organization. They do not create global organization/user management capabilities.
- Reviewer is permitted to review but is not included in the current contract-upload or contract-delete role lists. Staff is not included in the contract-delete list.
- The legal-source API exposes authenticated read endpoints, but the management UI and write operations described here belong to Administrator.

### 1.2 Not implemented or outside the completed UI scope

The following must not be reported as implemented and passed simply because they appear in the sample report or in a navigation menu.

| Function | Current boundary |
| --- | --- |
| Facebook login | No corresponding provider-login endpoint in the current auth router. |
| Forgot/reset/change password | No corresponding routes in the current auth router. |
| Profile editing, avatar upload and social features | Not part of the implemented scope verified for this document. The example report's followers, XP and leaderboards belong to a different project. |
| Backend logout/session revocation | The frontend clears its session. Backend token revocation must be documented separately if added later. |
| Global admin user/organization listing and management | Current admin navigation marks these sections as pending; organization-scoped endpoints are not substitutes for global management APIs. |
| Member removal UI and role changes | The backend now has an owner-only member-removal endpoint, but no frontend action was found wired to it. No member role-update endpoint was found. |
| Online payment, checkout and payment webhook | Public frontend payment APIs are not available in the current integration. Viewing plans and scheduling downgrades do not demonstrate payment completion. |
| Admin CRUD of subscription plans | Public plan listing exists; corresponding admin plan-editing endpoints are not present in the reviewed router. |
| Full AI-job monitoring, platform reports and audit-log management | These admin sections are marked pending in the current navigation. |
| Emailing the share summary or exporting a final edited contract | The implemented summary flow supports preview/edit/copy. Do not claim these additional delivery/export workflows without separate implementation and evidence. |

These functions can be listed as planned or deferred only after confirmation against the approved project requirements. An absent feature is not automatically a requirement of LawScan.

## 2. Test Strategy

### 2.1 Testing Types

The completion criteria below are proposed acceptance criteria, not claims that testing has already achieved them.

| Objective | Technique | Proposed completion criteria |
| --- | --- | --- |
| Validate isolated validators, access policies, quota/period calculations, query-cache updates and review recovery logic. | Unit / component testing | Cases for the agreed critical rules and boundary conditions pass. Coverage percentages are reported only from an actual coverage run. |
| Verify communication between frontend proxies, backend services, database, file storage, queue and email provider. | Integration testing | Data formats, authorization, organization isolation, errors and state transitions match the expected contract on the recorded environment. Tests with fixtures are identified separately from real-service tests. |
| Validate complete user journeys. | End-to-End testing | Agreed journeys pass against a running FE/BE and configured dependencies: onboarding; invitations; upload and review; recovery; results/chat; source ingestion; supported organization/subscription actions. |
| Verify AI outputs on representative contracts. | AI-output evaluation | A documented, versioned evaluation set is reviewed for expected findings, clause/citation correspondence, missing-clause behavior and unsupported claims. Acceptance thresholds require agreement and expert review; running ordinary UI tests does not measure AI accuracy. |
| Assess responsiveness and stability of core operations. | Performance / load testing | Measured response times, queue delays, stream behavior and error rates meet the team's approved targets at the specified concurrency. No load-test result is claimed before execution. |
| Verify authentication, role enforcement and private-document handling. | Security testing | Agreed tests for missing/expired tokens, forged display cookies, cross-organization IDs, file access, input validation and quota enforcement pass. Unresolved findings are recorded with severity and release decisions. |
| Verify readability, interaction and accessibility. | Usability / accessibility testing | Target workflows can be completed with clear feedback; keyboard/focus checks, Vietnamese text, responsive layout and reduced motion are verified. A full accessibility-compliance claim requires a separate audit. |
| Detect changes that break existing workflows. | Regression testing | Applicable automated suites, static checks, production build and relevant browser checks pass on the release candidate; any exclusions are recorded. |

*Table 5.2: Testing Types and proposed completion criteria.*

### 2.2 Test design

- Use equivalence classes and boundaries for strings, file size/type, pagination, quota and member limits.
- Cover valid, invalid, empty, unauthorized, loading, retry and double-submit cases.
- Use accounts for all six roles and at least two separate organizations to test data isolation.
- Exercise queued/running/completed/failed states, stale data, interrupted SSE, refresh and navigation while work continues.
- Distinguish illustrative homepage data, mocked API responses, real backend fixtures and external AI/provider responses.
- Create controlled test contracts and legal documents; avoid deleting production organizations or contracts during testing.

## 3. Test Environment and Evidence

Record actual values for every execution:

| Item | Required information |
| --- | --- |
| Build | Commit hash, branch, any uncommitted changes and execution time. |
| Frontend | Next.js/React build, configured API URL and browser version. |
| Backend | Running API and worker version, environment configuration and enabled integrations. |
| Dependencies | Test MongoDB, Redis/queue, file storage, email and AI-provider availability; identify every mocked dependency. |
| Accounts and fixtures | Role, organization membership, subscription/quota state and test document identifiers. |
| Viewports | Browser checks currently exercise 320, 390, 820, 1024 and 1440 px. This does not establish coverage of all browsers/devices. |
| Results | Test ID, expected/actual results, pass/fail/blocked/not-run status, evidence link and defect reference. |

### 3.1 Existing verification entry points

Frontend commands, run from `frontend`:

```sh
npm run lint
node --test scripts/*.test.mjs
npm run build
node scripts/admin-smoke.cjs
node scripts/subscription-browser-check.mjs
```

The browser/smoke scripts run against an isolated backend fixture; they do not establish that the complete workflow succeeds with a real database, queue, AI provider or payment provider. The subscription browser script also checks homepage typography, reduced motion, menu behavior and the contract illustration.

Backend entry points, run from `backend`:

```sh
npm run build
npm run lint
npm test
```

The command list is an execution guide, not a record that these commands were all run for this document. Check test configuration when reporting which backend test files were included.

Related workflow guides:

- [Review recovery guide](../scripts/review-recovery-test-guide.md)
- [Redacted document guide](../scripts/redacted-document-test-guide.md)
- [Frontend API integration status](api-integration-status.md)

## 4. Test Case and Result Template

| Field | Required content |
| --- | --- |
| Test Case ID | A stable identifier, for example `AUTH-REG-001`. |
| Requirement / Use Case ID | Identifier from the approved SRS; use `TBD` until mapped. |
| Feature / Function | Function from Table 5.1. |
| Preconditions | Role, workspace, quota, document state and required services. |
| Test data | Inputs and relevant fixtures. |
| Steps | Numbered, reproducible actions. |
| Expected result | Observable result and relevant state changes. |
| Actual result | Observations from the execution; leave blank until run. |
| Status | Not run / Passed / Failed / Blocked. |
| Evidence | Screenshot/log/test-output reference, build and environment. |

Do not prefill Actual Result with Expected Result or mark every case Passed merely because the function exists.

## 5. Completeness Assessment

This document consolidates the current implemented testing scope, including legal-source management, organization updates/deletion, contract deletion, downgrade/cancellation and SSE review progress added during development. It also records known unavailable or pending workflows.

**It does not establish complete coverage of the intended final system.** To assess that, the team must provide the approved SRS/use-case inventory, map each requirement to a test case and maintain a requirements traceability matrix:

| Requirement ID | Approved function | Implementation status | Test Case IDs | Execution status | Evidence / defect |
| --- | --- | --- | --- | --- | --- |
| TBD | Map from approved SRS | Implemented / Partial / Planned | TBD | Not run until executed | TBD |

Until this mapping and execution evidence are completed, report the document as **“Testing scope based on the current implementation”**, not **“All system functions implemented and fully tested.”**
