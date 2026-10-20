# 2. Test Strategy

## 2.1 Testing Types

This is the planned strategy and acceptance criteria. Automated tests do not prove
that browser E2E, real payment, load, security audit or usability testing is complete.

| Objective | Technique | Completion criteria |
| --- | --- | --- |
| Validate input rules, subscription quotas, membership limits, invitations and payment state handling. | Unit testing | All implemented unit tests pass and critical rules cover valid, invalid and boundary cases. Backend uses Jest; frontend logic tests use the Node.js test runner. |
| Verify API/service/database interactions, queue behavior and adapters for Google, Brevo, Cloudinary, Gemini and payOS. | Integration testing | Success, failure and access-denied cases pass. payOS tests verify signatures, server-side prices, duplicate-event handling and subscription activation using mocked provider calls. Real external connections are checked separately. |
| Validate registration, Verify OTP, Resend OTP, password/Google login, organization membership, contract upload/analysis/chat and subscription checkout. | End-to-End (E2E) testing | Agreed browser journeys complete with connected frontend/backend. Frontend checkout, payment history and return/cancel pages are implemented. Automated browser checks use isolated backend, Google and payOS fixtures. Purchase, renewal, full-price immediate upgrade and scheduled downgrade must grant the correct rights once. Real provider E2E remains pending a separately verified Google login and payment journey through the configured channel and public callback. |
| Assess API responsiveness, queue stability and concurrent payment/analysis requests. | Performance / Load testing | Agreed response-time and concurrency targets are measured under a defined workload. Concurrent requests do not overrun quotas or duplicate paid periods. AI execution time is measured separately. |
| Verify authentication, permissions, organization isolation, OTP limits and payment integrity. | Security testing | Unauthorized access is rejected. Forged webhooks, manipulated client prices and cross-workspace orders grant no rights. Duplicate callbacks are safe, and exposed findings within the tested scope are resolved before release. |
| Evaluate clarity, responsive layout and accessibility of the LawScan web interface and checkout flow. | Usability testing | Representative users complete main tasks. Forms and payment pages clearly distinguish pending payment, confirmed payment, activation pending, cancellation and failure. Agreed browser sizes and keyboard navigation work. |
| Preserve existing behavior after subscription/payment changes and merges. | Regression testing | Relevant backend/frontend tests, TypeScript checks and lint pass before merging. Critical auth, invitation, contract and payment journeys are repeated when affected. No unconfigured automatic PR testing or unmeasured coverage percentage is claimed. |
