---
type: srs-flows
feature: ai-review
updated: 2026-10-19
---

# AI Review — Flows

## Flow: Gửi yêu cầu rà soát hợp đồng
**Trigger**: Người dùng bấm "Rà soát" trên một hợp đồng đã tải lên
**Related UC**: TBD
**Related FR**: TBD
**Related E**: TBD

```mermaid
sequenceDiagram
    actor User as User
    participant Web as Web (contractsApi + Next route /api/contracts/[id]/review)
    participant RC as review.controller
    participant RS as review.service
    participant US as usage.service
    participant DB as MongoDB
    participant Q as BullMQ (reviewWorker.enqueueReview)

    User->>Web: contractsApi.startReview(contractId, idempotencyKey, analysisFocus)
    Web->>RC: POST /api/v1/contracts/:id/reviews (Bearer lawscan_access, Idempotency-Key, {analysisFocus})
    RC->>DB: contractService.getContractById(orgId, contractId)
    DB-->>RC: contract {type, ourParty}
    RC->>RC: assertPersonalReviewContract(type, ourParty) or assertBusinessReviewContract(type)
    RC->>RS: startReview({orgId, userId, contractId, idempotencyKey, analysisFocus})
    RS->>DB: findReplay - ReviewModel.findOne({orgId, idempotencyKey})
    RS->>DB: getCurrentVersion(contractId)
    DB-->>RS: version {extractionStatus}
    RS->>Q: releaseLostActiveReview - isReviewJobAlive(activeReviewId)
    RS->>DB: ReviewModel.findOne({contractId, activeLock: true})
    RS->>US: reserveUsage({orgId, userId, contractId, kind: analysis, idempotencyKey, payload: {versionId}}, now, 30 min)
    US->>DB: SubscriptionPeriod check plan and quota, $inc analysisReserved, UsageRun.create(status reserved)
    Note over RC,US: Stops at the first matching condition, in the order of the branches below

    alt A1 - getContractById finds no contract in orgId
        RC-->>Web: 404 Contract not found
        Web-->>User: Show contract not found
    else A6 - Contract type not allowed for this account
        RC-->>Web: 400 Personal or Business accounts can only review listed contract types
        Web-->>User: Show contract type not supported for review
    else Duplicate - findReplay returns an existing review
        RS-->>RC: {review, replayed: true}
        RC-->>Web: 200 {review, replayed: true}
        Web-->>User: Show progress of the existing review
    else A2 - extractionStatus is pending, failed or unsupported
        RS-->>RC: AppError.badRequest
        RC-->>Web: 400 No uploaded file or text could not be extracted
        Web-->>User: Ask to upload the contract file again
    else A3 - A review with activeLock already exists
        RS-->>RC: AppError.conflict
        RC-->>Web: 409 A review is already running
        Web-->>User: Ask to wait for the current review
    else A4 - reserveUsage finds no active Business plan period
        US-->>RS: AppError 403
        RC-->>Web: 403 An active Business plan is required to use AI
        Web-->>User: Ask to subscribe to the Business plan
    else A5 - analysisUsed plus analysisReserved reaches analysisLimit
        US-->>RS: AppError 403
        RC-->>Web: 403 analysis quota exhausted
        Web-->>User: Suggest upgrading or waiting for the next period
    else Valid
        US-->>RS: {run: {_id}, replayed: false}
        RS->>DB: ReviewModel.create({contractId, versionId, orgId, requestedBy, idempotencyKey, usageRunId, analysisFocus, activeLock: true})
        DB-->>RS: review {_id, status: queued}
        RS->>Q: enqueueReview({reviewId, orgId, usageRunId}) with jobId reviewId, attempts 2
        Q-->>RS: job
        RS-->>RC: {review, replayed: false}
        RC-->>Web: 202 {success, data: review} with Location /api/v1/reviews/:reviewId
        Web-->>User: Show review progress screen
    end
```

## Flow: Xử lý rà soát nền và theo dõi tiến độ
**Trigger**: Phiên rà soát vừa được đưa vào hàng đợi xử lý nền
**Related UC**: TBD
**Related FR**: TBD
**Related E**: —

```mermaid
sequenceDiagram
    participant Web as Web (contractsApi.streamReview)
    participant RC as review.controller
    participant W as reviewWorker (processReview)
    participant US as usage.service
    participant AN as analysis services
    participant DB as MongoDB

    Web->>RC: GET /api/v1/reviews/:reviewId/events (SSE)
    RC->>DB: reviewService.getReview(orgId, reviewId)
    RC->>W: subscribeToReview(reviewId, listener)
    Note over Web,RC: openSseStream, also re-checks every 5s (STREAM_POLL_MS)

    W->>DB: runReview - ReviewModel.findById(reviewId)
    DB-->>W: review {orgId, contractId, versionId, stages, analysisFocus}
    W->>US: extendUsageLease(usageRunId)
    US-->>W: true
    Note over W,US: keepCreditReserved calls extendUsageLease every 60s
    W->>DB: updateReview({status: running, startedAt})
    W--)RC: job.updateProgress, QueueEvents progress
    RC->>DB: getReview(orgId, reviewId)
    RC--)Web: SSE event review {status, currentStage, stageDetail}

    loop waitForExtraction every 2s, up to 15 min
        W->>DB: ContractVersionModel.findById(versionId) select extractionStatus, extractionProgress
        DB-->>W: {extractionStatus: processing, processedPages, totalPages}
        W->>DB: updateReview({currentStage: waiting_for_extraction, stageDetail: x/y pages})
    end

    W->>AN: runStage segmentation - segmentClauses(orgId, contractId, signal)
    AN->>DB: getCurrentVersionWithText, segmentContractClauses via generateJson, ClauseModel.insertMany
    AN-->>W: done
    W->>DB: updateReview({stages.segmentation: completed})

    par summary stage
        W->>AN: generateContractSummary(orgId, contractId, analysisFocus, signal)
        AN->>DB: summarizeContract via generateJson, ContractVersionModel.updateOne(summaryPoints)
        AN-->>W: done
    and riskDetection stage
        W->>AN: runPlaybookReview(orgId, contractId, reviewId, analysisFocus, onDetail, signal)
        AN->>DB: RiskFindingModel.insertMany, issueCounts, checkCoverage, overallAssessment, keyTerms
        AN-->>W: done
    end

    W->>US: finishUsage(orgId, usageRunId, true, {reviewId})
    US->>DB: UsageRun status succeeded, analysisReserved -1, analysisUsed +1
    W->>DB: buildReviewResult(versionId) - ContractVersion, Clause, RiskFinding
    DB-->>W: {issueCounts, checkCoverage, overallAssessment, summaryPoints, summarySources, clauseCount, keyTerms, findings}
    W->>DB: updateReview({status: completed, finishedAt, result}) unset activeLock
    W--)RC: QueueEvents completed
    RC->>DB: getReview(orgId, reviewId)
    RC--)Web: SSE event review {status: completed, result}, stream end
```

## Flow: Phát hiện rủi ro hợp đồng
**Trigger**: reviewWorker gọi `runPlaybookReview` ở giai đoạn riskDetection
**Related UC**: TBD
**Related FR**: TBD
**Related E**: —

Nguyên tắc: AI chỉ đọc và trích dẫn; mọi kết luận do phép kiểm trong playbook (dữ liệu có phiên bản, có căn cứ, đã duyệt) quyết định bằng code. Không có mức rủi ro cao/trung bình/thấp.

```mermaid
sequenceDiagram
    participant W as reviewWorker
    participant PR as playbookReview.service
    participant EV as playbookEvidence.service
    participant EL as playbookEvaluation.service
    participant PB as playbook.service
    participant LR as legalRetrieval.service
    participant LLM as llm.service (Gemini)
    participant DB as MongoDB

    W->>PR: runPlaybookReview(orgId, contractId, reviewId, analysisFocus, onProgress, signal)
    PR->>DB: contract, version {extractedText}, buildReviewContext, claimStage(riskDetection, reviewId)
    PR->>DB: Clause.find({versionId, reviewId}) với loại điều khoản
    Note over PR: Redactor che PII cho mọi prompt
    PR->>EV: collectContractEvidence (collecting_evidence)
    EV->>PB: playbook theo loại điều khoản, chỉ phép kiểm đã duyệt
    EV->>LLM: ② điền trường theo nhóm điều khoản (kèm câu trích)
    EV->>EV: kiểm câu trích tồn tại + hỗ trợ giá trị (số liệu bằng code)
    EV->>LLM: ③ tìm trường còn trống trong toàn văn + tình tiết + điều khoản bị phân loại nhầm
    EV->>LLM: kiểm chứng độc lập (có/không, tình tiết, số suy ra)
    EV-->>PR: ContractEvidence
    PR->>EL: evaluateContract (evaluating_checks)
    EL->>PB: verifyPlaybookArticleRefs (tra đúng Điều, kiểm cụm từ neo)
    PB->>DB: LegalSource còn hiệu lực + LegalKnowledgeChunk
    EL->>EL: chấm từng phép kiểm + kiểm tra toàn văn VB-01..VB-06
    EL-->>PR: kết quả: Đạt / Chưa rõ ràng / Thiếu nội dung / Nên thương lượng / Vi phạm / Lỗi soạn thảo / Chưa xác minh được / Không kiểm tra được
    par preparing_suggestions
        PR->>LLM: ⑥ tối đa 3 câu hỏi cho chuyên gia về điểm playbook chưa có (kèm câu trích, không kết luận pháp lý)
        PR->>LR: searchLegalChunks — 3 đoạn luật ứng viên cho mỗi câu hỏi
        PR->>LLM: chọn đoạn luật trực tiếp liên quan hoặc không chọn
    and
        PR->>LLM: ⑦ gợi ý sửa (câu gốc phải có nguyên văn trong điều khoản)
    end
    PR->>DB: insert RiskFinding + RiskCitation (snapshot), xoá bản cũ của review này (saving_findings)
    PR->>DB: ContractVersion {issueCounts, checkCoverage, overallAssessment theo mẫu, keyTerms}
    PR-->>W: done
```

| Kết quả của phép kiểm | Khi nào | Lưu thành |
| --- | --- | --- |
| Đạt | Hợp đồng đáp ứng tiêu chí | Chỉ đếm trong `checkCoverage.passed` |
| Chưa rõ ràng / Thiếu nội dung / Nên thương lượng | Phép kiểm nhóm rõ ràng / đầy đủ / cân bằng không đạt | `RiskFinding` `outcome=failed` |
| Vi phạm | Phép kiểm tuân thủ không đạt, điều luật **và** điều kiện áp dụng đều đã xác minh | `RiskFinding` `checkGroup=compliance` |
| Lỗi soạn thảo | Kiểm tra toàn văn VB-01..VB-04: chỗ trống, dẫn chiếu đến điều hoặc phụ lục không có, số tiền bằng số khác bằng chữ | `RiskFinding` `checkGroup=drafting` |
| Chưa xác minh được | Phép kiểm tuân thủ không đạt nhưng chưa xác định được tình tiết hoặc điều luật | `RiskFinding` `outcome=unverified` |
| Không kiểm tra được | Giá trị đọc từ hợp đồng không chắc chắn | `checkCoverage.notCheckedItems` |
| Đề nghị chuyên gia xem xét | AI đặt câu hỏi về điểm playbook chưa có; không trùng vị trí với vấn đề đã báo; câu có kết luận pháp lý hoặc nêu tên luật, điều luật bị loại bằng code | `RiskFinding` `findingType=referral`, không tính vào `issueCounts.total` |
