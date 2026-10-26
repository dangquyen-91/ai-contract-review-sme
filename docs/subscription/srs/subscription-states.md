---
type: srs-states
feature: subscription
updated: 2026-10-26
---

# Subscription — States

## State: Payment
**Related entity**: Payment
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> creating : user checks out a plan (order expires in 15 min)
    creating --> pending : payOS payment link created
    creating --> paid : sync / webhook confirms PAID (link reply was lost)
    pending --> pending : partial transfer or still unpaid
    pending --> paid : payOS reports full amount paid
    pending --> cancelled : user cancels, nothing paid
    pending --> expired : payOS link expired, nothing paid
    pending --> failed : payOS reports failure, nothing paid
    paid --> [*] : subscription activated / renewed
    cancelled --> [*]
    expired --> [*]
    failed --> [*]
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| paid | cancelled | A paid order cannot be cancelled |
| pending (partially paid) | cancelled / expired / failed | Partial payments are not discarded, support must handle them |
| cancelled / expired / failed | pending | Closed orders never reopen, user creates a new order |

## State: UsageRun
**Related entity**: UsageRun
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> reserved : AI request reserves 1 credit (quota available)
    reserved --> succeeded : request finishes, credit consumed
    reserved --> failed : request fails or is cancelled, credit released
    succeeded --> [*]
    failed --> [*]
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| failed | reserved | Retrying needs a new idempotency key (new run) |
| succeeded | failed | A consumed credit is final |
