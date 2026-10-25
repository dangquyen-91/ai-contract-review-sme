# Business contract drafting

## User flow

Owner and Staff members of a business organization can open **Tạo hợp đồng** at `/contract-drafts`.

1. Choose labor, service or sale of goods.
2. Enter the parties and contract terms. Company name is taken from the organization; address and tax code are prefilled and can be corrected for this draft.
3. The form saves after 1.5 seconds without edits. Partial drafts are allowed. Generating or submitting requires complete, valid fields.
4. Generate the draft with Gemini, review the result, and edit the text if needed.
5. Staff submits their own draft; Owner can request changes with a reason or approve. Owner can also approve their own draft.
6. Owner can export approved drafts in their organization as DOCX or open the browser print page to save PDF. Staff can export only their own drafts after Owner approval. Only Owner can transfer a draft to the existing contract/review workflow.

The print page provides browser print-to-PDF, not a server-side PDF file. Publishing creates an ordinary `uploaded` contract and an extracted DOCX version; it does not automatically start or charge for a review. The user starts review through the existing interface.

Personal accounts and personal workspaces cannot access this feature. Staff sees and edits only their own drafts. Owner sees drafts within their organization. An internal approval is not an electronic signature.

## Data and concurrency

- `ContractDraft` is separate from uploaded contracts, with `draft`, `pending_approval` and `approved` states.
- Each draft stores its template version and immutable template snapshot, plus an organization snapshot. Updating the catalog or organization does not rewrite an existing draft.
- Input, organization data, content and review notes use the existing AES-GCM field encryption.
- Updates require the current revision. Stale saves and decisions return 409 rather than overwrite newer data.
- Editing form values invalidates old generated content; editing the contract text alone retains the form.
- Generation takes a per-draft lease, expires after two minutes, uses a 90-second model timeout and the existing AI request limiter. A late response cannot overwrite a newer revision or another lease.
- Approval locks editing. Publishing is transactional and idempotent once a contract is linked; failed publication cleans up the private file.
- AI receives pseudonymized identity values and redacted free text. Request bodies and generated documents are not logged.

## Template scope

Version 2 provides template-specific form groups rather than a single flat form. Labor separates document details, employer, employee, employment, salary and working conditions, with twelve articles and numbered subclauses. Service and sales include a structured line-item editor; it is required for sales and optional for services. Quantity supports three decimals, unit price two decimals; each line rounds to two decimals before summing using integer arithmetic. The table total is the pre-tax contract price and must match at generation/approval. Tax is entered explicitly.

Preview, print and DOCX render line items as tables and signatures in two columns. Normal text uses Times New Roman 13pt; item tables use 11pt to fit the document width. Word uses A4 with 20mm top/right/bottom and 30mm left margins. Editing generated text remains plain text: pipe-delimited lines represent item tables and tab-delimited lines represent paired signatures.

Old drafts retain their original snapshot. **Dùng mẫu mới** copies existing input into a new draft on the latest template, leaving the original document and approval unchanged. New required fields must be completed and content generated again. Basic validation rejects obvious test characters, company names in the employee field and account roles in the labor signatory field; AI may also return blocking field issues instead of generating meaningless clauses.

These are starter frames, not legal certification. Owner reviews the clauses before using them. The labor frame covers Vietnamese adult employees, fixed terms up to 36 months or indefinite terms. Other specialized labor relationships, real estate, international sales and sector-specific regulated contracts are outside the initial frames.

The renderer keeps core template clauses and inserts model-generated additions. AI cannot remove a required section by omitting it: structured responses must contain exactly the expected section keys. It is instructed not to invent tax rates, penalty rates, monetary amounts or legal article numbers. Semantic correctness still requires human review.

Reference basis for maintaining the frames:

- Labor Code 45/2019/QH14, particularly Articles 20–21: https://vanban.chinhphu.vn/?docid=198540&lang=vi&pageid=27160
- Civil Code 91/2015/QH13: https://vanban.chinhphu.vn/?docid=183188&pageid=27160
- Consolidated Commercial Law 113/VBHN-VPQH (2025): https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/113-vbhn-vpqh.pdf

## API

All endpoints are below `/api/v1/contract-drafts`, require authenticated business Owner/Staff, and use organization-scoped access.

| Method and suffix | Purpose |
| --- | --- |
| `GET /templates` | Catalog, field definitions, company defaults and role |
| `GET /?page=1` | Twenty drafts per page; own drafts for Staff |
| `POST /` | Create with `templateCode`, `title`, `ourParty`, `input` |
| `GET /:id` | Load the draft and its original template snapshot |
| `PATCH /:id` | Save with `revision`, `title`, `ourParty`, `input`, `content` |
| `POST /:id/generate` | Generate with `revision` |
| `POST /:id/copy-latest` | Copy permitted draft input into a new latest-version draft with `revision`; returns 201 |
| `POST /:id/decision` | `revision`, `action` (`submit`, `approve`, `return`), `note` |
| `GET /:id/export?format=docx` | Approved DOCX; Owner or the Staff creator |
| `GET /:id/export?format=print` | Approved print content; Owner or the Staff creator |
| `POST /:id/publish` | Owner-only publication with `revision` |

## Configuration and checks

Use the existing `GEMINI_API_KEY`, `GEMINI_MODEL`, MongoDB, and `DATA_ENCRYPTION_KEY`. AI generation requires an active business plan and consumes one drafting credit only when the generated document is successfully saved. Starter defaults to 50 and Pro to 150 drafting credits per period, shared in the organization. Publishing to the review workflow also needs private Cloudinary storage and LibreOffice to count the generated DOCX pages. Generating/downloading a DOCX does not require LibreOffice, Redis or Cloudinary. Reviews use a separate quota of one credit per five pages, rounded up; see [usage billing](subscription/usage-billing.md).

Backend tests use a disposable MongoDB replica set, mocked model responses and mocked storage; browser checks use a fixture backend only. They do not contact production databases or spend Gemini quota.

```powershell
cd backend
npm.cmd test -- --runTestsByPath tests/contractDrafts.test.js
```

```powershell
cd frontend
npm.cmd run test:contract-drafts
npm.cmd run build
npm.cmd run test:contract-drafts:browser
```

The browser check also requires an existing backend build (for template definitions) and Chrome. `CHROME_PATH` can override the default Windows Chrome path.
