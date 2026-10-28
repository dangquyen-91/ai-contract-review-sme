---
type: srs-states
feature: ai-review
updated: 2026-10-26
---

# AI Review — States

## State: Contract
**Related entity**: Contract
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> uploaded : user uploads contract file
    uploaded --> unsupported : AI classification - type not supported
    unsupported --> uploaded : user confirms a supported contract type
    uploaded --> processing : review starts a stage (segmentation / risk detection)
    processing --> uploaded : segmentation done, or a stage fails
    processing --> reviewed : risk detection completed
    reviewed --> processing : user runs a new review
    processing --> reviewed : stage fails during a re-review
    archived : archived (reserved)
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| unsupported | processing | A review needs a confirmed, supported contract type first |
| processing | processing | Only one analysis may run per contract at a time |
| uploaded | reviewed | Reviewed is only reached after risk detection completes |

## State: Review
**Related entity**: Review
**Related UC**: —
**Related BR**: —

```mermaid
stateDiagram-v2
    direction LR
    [*] --> queued : user starts review (1 analysis credit reserved)
    queued --> running : analysis starts
    queued --> cancelled : user cancels before analysis starts
    running --> completed : segmentation, summary, risk detection done
    running --> cancelled : user cancels during analysis
    running --> failed : analysis fails
    failed --> queued : user retries (same contract version)
    cancelled --> queued : user retries (same contract version)
    completed --> [*]
```

### Invalid transitions
| From | To | Why not |
|---|---|---|
| completed | queued | Only failed or cancelled reviews can be retried |
| failed / cancelled | queued | Not allowed when the contract has a newer version, start a new review instead |
| completed / failed / cancelled | cancelled | A finished review cannot be cancelled |
| any | queued | Not allowed while another review of the same contract is active |
