---
type: srs-states
feature: core-data-model
updated: 2026-10-26
---

# Core Data Model — States

## State: OrganizationInvitation
**Related entity**: OrganizationInvitation
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> pending : owner sends invite (valid 7 days)
    pending --> delivery_failed : invitation email could not be sent
    pending --> accepted : invitee accepts before expiry
    pending --> declined : invitee declines
    pending --> revoked : owner revokes, or member removed from org
    pending --> expired : 7 days pass without a response
    accepted --> [*]
    declined --> [*]
    revoked --> [*]
    expired --> [*]
    delivery_failed --> [*]
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| expired | accepted | An expired link cannot be accepted, owner sends a new invite |
| revoked / declined / delivery_failed | pending | Closed invitations never reopen, a new invite is created |
| pending | pending (2nd invite) | Only one pending invitation per email per organization |

## State: LegalSourceIngestion
**Related entity**: LegalSource
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> queued : manager uploads a legal source
    queued --> running : embedding starts
    running --> paused : embedding quota reached
    paused --> running : quota available again, resumes automatically
    running --> completed : all chunks embedded
    running --> failed : embedding fails
    failed --> queued : manager resumes ingestion
    paused --> queued : manager resumes ingestion
    completed --> queued : manager appends a new part
    failed --> completed : manager resumes, nothing left to embed
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| queued / running | queued | Cannot resume while embedding is in progress |
| completed | queued (resume) | Every chunk is already embedded, only appending a part restarts it |
