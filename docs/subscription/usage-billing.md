# AI usage rules

## Review credits

Both personal and business reviews consume `ceil(pageCount / 5)` credits per successful review. Pages 1–5 cost 1; 6–10 cost 2; 11–15 cost 3. Images count as one page. PDF page counts come from the PDF parser, including blank pages. DOCX is rendered to PDF by the server's LibreOffice installation and then counted by the same PDF parser; cached Word document properties and character counts are not used for billing.

The complete document must be extracted and have a positive integer page count. Missing page counts and truncated documents cannot start a paid review. The PDF extractor currently processes at most 100 pages: split larger files. Older DOCX versions without a stored page count must be uploaded again (PDF is also supported). Existing successful results remain readable without another credit charge.

`GET /contracts/:id` includes `reviewBilling`: `versionId`, `pageCount`, `pagesPerUnit`, `units`, `ready`, `reason`. The UI displays the quote and available credits before starting. New review and retry requests can include `billing: { versionId, units }`; the server checks the quote again and rejects a changed quote/version. Actual costs are always calculated from database version metadata, never taken from a client-supplied page count.

## Drafting credits

Each successful AI generation or regeneration costs 1 drafting credit. Current default limits are 50 per Business Starter period and 150 per Business Pro period, shared by Owner and Staff. Personal drafting is not enabled and its drafting limit is 0. AI input validation failures, provider failures, expired attempts and failed result saves do not consume credits. Editing forms/text, autosave, copying drafts, approval, DOCX/PDF downloads and transferring a draft to the contract repository do not consume AI credits. Running a review after transfer is a separate action charged by page count.

Plan prices, review-credit limits, chat limits and seat limits remain unchanged. The new catalog benefit is `draftingLimit`. `seedPlans()` backfills only missing drafting limits in existing plan records and subscription snapshots; it does not reset usage or overwrite configured limits. Existing `analysisUsed` values are not retroactively recalculated. These rules apply to new requests after deployment. Renewals and upgrades follow the existing payment activation rules.

## Settlement and concurrency

`UsageRun.units` records the reserved amount, along with `versionId` and `pageCount` for reviews, or `draftId` for drafting. Organization-level transaction locks serialize quota reservations. The full required amount must be available before AI/queue work starts; a 3-credit document cannot start with 2 credits remaining.

Success atomically saves the review/draft result, releases the reserved units and increments used units in one MongoDB transaction. Failure/cancellation releases the full amount. Expired leases are recovered with the original reserved amount, including historical runs without `units`, which default to 1. Repeated settlement and idempotent request replay do not charge again. Draft generation also uses a revision check and per-draft token lease, so a duplicate click cannot run two generations for the same revision.

## DOCX deployment

Deploy/restart the API and every review/extraction worker on the same version together. Older workers settle each request as one credit and must not process new multi-credit reservations. API startup seeds missing drafting benefits automatically; no production database migration was executed during development.

Docker installs `libreoffice-writer`, Liberation and DejaVu fonts. Use the same server image/fonts consistently because pagination depends on layout and fonts. The server's page count is the billing basis; opening Word on another device can paginate differently.

For non-Docker development, install LibreOffice and set `LIBREOFFICE_PATH` when it is not at the platform default:

```dotenv
# Windows default (no override needed at this location)
LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
# Linux, if available on PATH
LIBREOFFICE_PATH=soffice
```

Conversion runs with a unique temporary profile and output directory, high macro security, no shell, a 60-second timeout and a hidden window on Windows. Temporary documents are removed after conversion, including failures. The DOCX-to-review transfer also records the counted page total before uploading its generated file. Generating/downloading Word alone does not require LibreOffice. Without conversion support, DOCX review is blocked explicitly rather than charged as one page; users can upload PDF instead.

Command-line reference: [LibreOffice startup parameters](https://help.libreoffice.org/latest/en-GB/text/shared/guide/start_parameters.html).

## Validation

Backend fixtures cover five-page boundaries, missing/invalid counts, truncated extraction, personal/business limits, insufficient balance, shared concurrent reservations, refunds, expired leases, idempotency, drafting limits, legacy snapshots and payment activation. Conversion adapter tests mock LibreOffice execution but use real PDF parsing and filesystem cleanup; a real LibreOffice rendering smoke test is still required on the deployment image. No production database, Gemini or payment calls are used in these tests.

Frontend checks cover cost confirmation, unchanged recovery keys/quotes after network loss, no charges when opening existing results, pricing labels, remaining drafting quota, failed AI requests and disabling AI when credits are exhausted. Ordinary editing and approved exports remain available.
