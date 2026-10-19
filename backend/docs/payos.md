# payOS subscription payments

Backend implementation uses `@payos/node` v2. All credentials stay in the backend
environment. Rotate any credentials shared in chat, screenshots or source control.

## Setup

Set `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`
and `PAYOS_CANCEL_URL` in `backend/.env`, then run `npm run dev`.
The frontend now provides checkout on `/goi-dich-vu/xac-nhan?plan=PLAN_CODE`,
payment history, and the `/thanh-toan/ket-qua` and `/thanh-toan/huy` pages.
The redirect URLs must point to the running frontend origin. For local testing,
run the frontend on port 3000 and keep the backend webhook tunnel open.

Expose the backend through an HTTPS deployment or development tunnel and configure
this callback in the payOS channel:

```text
https://YOUR-BACKEND/api/v1/payments/payos/webhook
```

`localhost` is reachable by your browser, but not by payOS servers. The callback
requires no JWT: it verifies payOS signatures instead. Signed setup probes for
unknown orders are acknowledged without activating subscriptions.

## Manual test in Swagger

1. Start MongoDB and Redis, start the backend, open `http://localhost:4000/api-docs`.
2. Sign in with a verified Owner account, or a user owning a personal workspace.
   Use its access token in **Authorize**. Get the real workspace ID from the account.
3. Call `POST /organizations/{id}/payments` with an `Idempotency-Key` such as
   `purchase-test-0001` and the body below. Use `personal_pro` for personal workspaces.
4. Save `orderCode` and open the returned `checkoutUrl`. Creating the link grants
   no paid rights. Any bank transfer here is a real payment; automated tests mock it.
5. Complete a deliberately authorized payment. Inspect the stored order and
   `GET /organizations/{id}/subscription`. Successful activation sets both
   `paidAt` and `fulfilledAt` on the payment.
6. If the webhook was missed, call `POST /organizations/{id}/payments/{orderCode}/sync`.
   Repeating sync/webhooks must not create another period.

```json
{ "planCode": "business_starter", "action": "purchase" }
```

Other actions: `renew` (same active plan, append the next monthly period), `upgrade`
(full new price, start a fresh cycle immediately after confirmed payment, cancel
remaining old periods without carryover), `downgrade` (schedule with the existing
subscription endpoint first; member count must fit before scheduling and payment).
Paying a scheduled downgrade does not apply it before its effective date.

## API contract for frontend

All organization payment endpoints require the workspace owner (or personal user).
The standard response is `{ "success": true, "data": ... }`.

| Method | Path under `/api/v1` | Result |
| --- | --- | --- |
| POST | `/organizations/{id}/payments` | Create checkout; requires Idempotency-Key |
| GET | `/organizations/{id}/payments?page=1` | Payment history, newest first, 20 per page |
| GET | `/organizations/{id}/payments/{orderCode}` | Stored status; no provider call |
| POST | `/organizations/{id}/payments/{orderCode}/sync` | Reconcile with payOS; retry activation |
| POST | `/organizations/{id}/payments/{orderCode}/cancel` | Cancel through payOS; not a refund |

The frontend uses the backend `checkoutUrl` and only navigates to HTTPS payOS
checkout URLs. It does not send a price or use redirect status parameters as proof
of payment. Return/cancel pages read the stored order and synchronize once; polling
then reads backend status briefly, with a manual retry option. `fulfilledAt`
determines whether rights were granted; `status: paid` alone is insufficient.
Password login, Google login, registration and OTP preserve validated checkout or
order-detail return paths. Invitation acceptance takes precedence over that path.
An account without a workspace must finish onboarding before purchasing.

There is one open payment per workspace. Reuse the same Idempotency-Key to retry
the same checkout. Use payment history to recover the order after losing a response.
Resolve/cancel an open order before creating a different purchase.

## Recovery and limits

- Provider timeouts retain the stored order; they do not prove payment failed.
  Sync or cancel it through payOS. If creation never reached payOS and the provider
  cannot find the order, support must reconcile it before releasing that open order;
  this implementation does not silently discard an uncertain checkout.
- Confirmed payment is stored before subscription activation. Activation uses a
  stable `payos:orderCode` reference. Webhook retries or explicit sync recover a
  crash between granting the period and recording `fulfilledAt`.
- `fulfillmentError` retains a business conflict, such as membership or plan changes
  since checkout. Resolve that conflict and retry sync. Do not create a second charge.
- Partial/overpayments and mismatched orders require review; they do not grant rights
  or trigger automatic refunds. Only an exact, fully paid provider order is activated.
- Payment cancellation racing with settlement uses the provider's authoritative
  response; paid orders are fulfilled rather than marked cancelled.
- No automatic card debit, refund endpoint, scheduled reconciliation worker or real
  bank transaction is included in the automated tests.

## Automated verification

`npm test -- --silent` builds the backend and runs Jest. `tests/payments.test.js`
uses temporary MongoDB, mocked payOS create/get/cancel calls and real SDK webhook
signature verification with test-only keys. It covers authorization, amount checks,
idempotency, concurrent webhooks, cancellation, missed events, activation recovery,
renewal, upgrade and scheduled downgrade. Real channel delivery requires a separate
manual test using the configured public callback.

Frontend verification: run `node --test scripts/*.test.mjs` from `frontend` for
automated tests. After `npm run build`, run `npm run test:payments:browser` for
Chrome checks against an isolated API fixture. Google and hosted payOS checkout
are intercepted locally in this script. It does not send OTP emails or create real
payments. Use `CHROME_PATH` if Chrome is not installed at the default Windows path.

References: https://github.com/payOSHQ/payos-lib-node and https://payos.vn/docs/api/
