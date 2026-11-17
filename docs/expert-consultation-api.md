# Expert consultation: text chat

Backend implementation follows `routes -> controllers -> services/review -> models`,
with Zod validation in `validations/expertChat.validation.ts`. It is separate from
AI Q&A and does not call Gemini, reserve AI credits, or charge for appointments.

## Access and lifecycle

- Only the request's sender (Owner, Staff, or personal User) and its assigned Expert
  can access the conversation. Other organization members, Owners who did not send
  the request, Administrators and Managers have no implicit access.
- Organization participants must still be in the owning workspace. Personal
  conversations use the personal account ID as the scope key.
- Sending is enabled only after an Expert accepts the request (`in_progress`).
  Requested, approved, returned and historical attempts are read-only.
- Reopening a returned request creates a new attempt. Its chat is separate from
  previous attempts. Historical attempts can be read by their original participants
  using the existing archived expert-work records, subject to workspace access.
- Messages are plain text, limited to 2,000 characters, encrypted at rest using the
  existing field-encryption utility. Clients must render them as text, not HTML.
  The storage prefix `enc:v1:` is reserved and cannot start message content.
- Deleting a contract also deletes its expert-chat messages.

## List and poll messages

`GET /api/v1/reviews/:reviewId/verification/messages`

Requires Bearer authentication. Query parameters:

| Parameter | Meaning |
| --- | --- |
| `attempt` | Optional positive integer; defaults to the current verification attempt. |
| `limit` | Page size, default 30, maximum 100. |
| `before` | Message ObjectId; load older messages. |
| `after` | Message ObjectId; poll for newer messages. Mutually exclusive with `before`. |

Without a cursor, returns the latest page. Every page is ordered oldest first.
Success envelope: `{ success: true, data: { attempt, status, canSend, items,
hasMore, nextBefore, nextAfter } }`. Each item contains `id`, `attempt`,
`senderId`, `senderType` (`requester` or `expert`), `clientMessageId`, `content`,
and `createdAt`. Responses use `Cache-Control: no-store`.

FE can poll with `after=nextAfter`, append/deduplicate by `id`, and retain its
last cursor when an empty page returns null. If `hasMore` is true during polling,
fetch the next page immediately. Use `before=nextBefore` to load older history.
No WebSocket, presence, read receipts, attachments or SSE are included in this phase.

## Send a message

`POST /api/v1/reviews/:reviewId/verification/messages`

```json
{
  "attempt": 1,
  "clientMessageId": "b5d59875-783a-4912-8fb2-a7b4dfbf78ce",
  "content": "Nhờ chuyên gia giải thích điều khoản thanh toán."
}
```

Use the attempt returned by GET. Generate one UUID per message and reuse the same
UUID and content when retrying a lost response. Sender identity and role are
derived exclusively from authentication; extra body properties are rejected.

- `201`: `{ success: true, data: { message, replayed: false } }`.
- `200`: same sender, attempt, UUID and content already saved; `replayed: true`.
- `400`: invalid IDs, cursor, length, attempt, UUID or body fields.
- `401/403`: unauthenticated/stale session or unsupported role.
- `404`: inaccessible conversation, missing contract or unavailable attempt.
- `409 EXPERT_CHAT_CLOSED`: attempt cannot accept new messages.
- `409 MESSAGE_ID_CONFLICT`: same UUID reused with different content.

Sends use a transaction and write the verification session to serialize against
completion, return and reassignment. Previously saved retries may still be
acknowledged after closure; they never create a new message in a closed attempt.

## Verification

Run from `backend`:

```powershell
npm run build
npx jest --runInBand tests/expert-chat.test.cjs
```

Tests use an isolated MongoDB memory replica set, real authentication middleware,
and HTTP requests through the review router. They do not alter the configured DB.
