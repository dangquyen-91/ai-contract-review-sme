"use client";

import { ReviewAnalysisPane } from "@/components/review/results/review-analysis-pane";
import { ContractDocumentText, FullDocument } from "@/components/review/document/contract-document-text";
import { Button } from "@/components/ui/button";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useContractText } from "@/hooks/use-contracts";
import workspaceStyles from "@/styles/review/review-workspace.module.css";
import { Icon } from "@/components/ui/icon";
import { ContractChat } from "@/components/review/results/contract-chat";
import { ReviewResultHeader } from "@/components/review/results/review-result-header";
import { OriginalContractPreview } from "@/components/review/document/original-contract-preview";
import { KeyTerms } from "@/components/review/results/key-terms";
import { RedactedDocument } from "@/components/review/document/redacted-document";
import { DocumentDisclosureDialog } from "@/components/review/document/document-disclosure-dialog";
import { ShareSummaryDialog } from "@/components/review/sharing/share-summary-dialog";
import type { ContractReviewResult } from "@/types/contracts";

type ReviewResultsProps = { result: ContractReviewResult; canAsk?: boolean; showAiContext?: boolean };

export function ReviewResults(props: ReviewResultsProps) {
  return <ReviewResultsContent key={props.result.contract.id ?? props.result.contract._id} {...props} />;
}

function ReviewResultsContent({ result, canAsk = false, showAiContext = false }: ReviewResultsProps) {
  const [activeClause, setActiveClause] = useState<number | null>(null);
  const [originalTarget, setOriginalTarget] = useState<{ index: number; requestId: number } | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "text" | "redacted">("redacted");
  const [disclosure, setDisclosure] = useState<{ mode: "text" | "original"; clauseIndex?: number } | null>(null);
  const [docxTextFallback, setDocxTextFallback] = useState(false);
  const [shareSummaryOpen, setShareSummaryOpen] = useState(false);
  const sectionId = useId();
  const contractBodyRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);
  const restoreScroll = useRef<number | null>(null);
  const clauses = useMemo(() => [...result.clauses].sort((a, b) => a.index - b.index), [result.clauses]);
  const contractId = result.contract.id ?? result.contract._id;
  const redactedQuery = useContractText(contractId ?? "", {
    redacted: true,
    redactionMode: "partial",
    enabled: viewMode === "redacted",
    version: result.contract.updatedAt,
  });
  const fullQuery = useContractText(contractId ?? "", {
    redacted: false,
    enabled: viewMode === "text" || (viewMode === "original" && originalTarget !== null),
    version: result.contract.updatedAt,
  });
  const text = fullQuery.isError ? "" : fullQuery.data?.text ?? "";
  const originalClause = originalTarget ? clauses.find((clause) => clause.index === originalTarget.index) : undefined;
  const previewTarget = originalClause && originalTarget && text ? {
    text: text.slice(originalClause.startOffset, originalClause.endOffset), requestId: originalTarget.requestId,
  } : null;
  const mimeType = result.contract.currentVersion?.mimeType;
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const canShowOriginal = Boolean(contractId && mimeType && [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
  ].includes(mimeType));
  const showOriginal = canShowOriginal && viewMode === "original";

  function applyDocumentMode(mode: typeof viewMode, clauseIndex?: number) {
    if (mode === "redacted") setDocxTextFallback(false);
    const body = contractBodyRef.current;
    if (body) savedScroll.current = body.scrollTop / Math.max(1, body.scrollHeight - body.clientHeight);
    restoreScroll.current = savedScroll.current;
    setActiveClause(clauseIndex ?? null);
    setOriginalTarget((current) => mode === "original" && clauseIndex !== undefined ? { index: clauseIndex, requestId: (current?.requestId ?? 0) + 1 } : null);
    setViewMode(mode);
    if (mode === "text" && clauseIndex !== undefined && !fullQuery.isPending) scrollToClause(clauseIndex);
  }

  function selectDocumentMode(mode: typeof viewMode) {
    if (mode === viewMode) return;
    if (mode === "redacted") applyDocumentMode(mode);
    else setDisclosure({ mode });
  }

  useLayoutEffect(() => {
    if (showOriginal || (viewMode === "redacted" ? redactedQuery.isPending : fullQuery.isPending)) return;
    const body = contractBodyRef.current;
    if (body && restoreScroll.current !== null) {
      body.scrollTo({ top: restoreScroll.current * Math.max(0, body.scrollHeight - body.clientHeight), behavior: "instant" });
      restoreScroll.current = null;
    }
  }, [viewMode, showOriginal, redactedQuery.isPending, fullQuery.isPending]);

  function scrollToClause(index: number) {
    const target = contractBodyRef.current?.querySelector<HTMLElement>(`[data-clause-index="${index}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (viewMode !== "text" || activeClause === null) return;
    scrollToClause(activeClause);
  }, [activeClause, viewMode, text]);

  function jumpToClause(index: number) {
    const mode = isDocx && canShowOriginal ? "original" : "text";
    if (viewMode !== mode) setDisclosure({ mode, clauseIndex: index });
    else applyDocumentMode(mode, index);
  }

  return (
    <section className={`overflow-hidden border [background:#fff] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid border-[#e4e8ef] ${showAiContext ? workspaceStyles.workspace : ""}`}>
      {showAiContext && <p className="m-0 border-b border-[#dce7f6] bg-[#f4f8ff] px-5 py-3 text-ui leading-6 text-[#536881]">Kết quả do AI phân tích, chưa thể hiện phê duyệt của chuyên viên.</p>}
      <ReviewResultHeader result={result} onShareSummary={() => setShareSummaryOpen(true)} />
      {showAiContext && <nav className={workspaceStyles.navigation} aria-label="Điều hướng kết quả"><a href={`#${sectionId}-analysis`}>Tóm tắt & rủi ro</a><a href={`#${sectionId}-document`}>Nội dung hợp đồng</a></nav>}
      <div className={`${workspaceStyles.resultColumns} grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-stretch [@media_(max-width:_1080px)]:grid-cols-[1fr] ${workspaceStyles.splitPane}`}>
        <ReviewAnalysisPane result={result} sectionId={sectionId} isDocx={isDocx} onJumpToClause={jumpToClause} />
        <section className={`${workspaceStyles.documentPane} min-w-0 min-h-0 grid grid-rows-[auto_auto_minmax(0,1fr)] [@media_(max-width:_1080px)]:block`} id={`${sectionId}-document`} aria-label="Nội dung hợp đồng">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] bg-[#fbfcfe] px-4 py-2.5">
            <div className="min-w-0"><h3 className="m-0 text-ui-section font-semibold">Nội dung hợp đồng</h3><p className="mb-0 mt-1 max-w-[360px] truncate text-ui-meta text-[#778398]">{result.contract.currentVersion?.fileName ?? result.contract.title}</p></div>

          </div>
          <div className="border-b border-[#e4e8ef] bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex max-w-full flex-wrap gap-1" role="group" aria-label="Chế độ xem văn bản">
                {(["redacted", "text"] as const).map((mode) => <Button variant={viewMode === mode ? "default" : "outline"} size="sm" type="button" key={mode} aria-pressed={viewMode === mode} onClick={() => selectDocumentMode(mode)} >{mode === "redacted" ? (isDocx ? "Bản DOCX đã che" : "Văn bản đã che") : "Văn bản đầy đủ"}</Button>)}
              </div>
              {canShowOriginal && <Button variant={showOriginal ? "default" : "outline"} size="sm" type="button" aria-pressed={showOriginal} onClick={() => selectDocumentMode("original")} ><Icon name="document" className="h-4 w-4" />Xem file gốc</Button>}
            </div>
            <details className="mt-1.5 max-h-40 overflow-y-auto text-ui-meta leading-5 text-[#607087]"><summary className="w-fit cursor-pointer text-[#536881]">Thông tin hiển thị & bảo mật</summary>
            {viewMode === "redacted" && <p className="mb-0 mt-3 text-ui-meta leading-5 text-[#607087]">Bản đã che vẫn giữ một phần thông tin để đối chiếu.</p>}
            <p className="mb-0 mt-3 text-ui leading-6 text-[#607087]">{viewMode === "redacted" ? "Giữ 4 số cuối tài khoản và 3 số cuối điện thoại để đối chiếu. Tên dùng nhãn thay thế; email giữ ký tự đầu và tên miền; CCCD, ngày sinh, địa chỉ được che hoàn toàn khi nhận diện." : showOriginal ? "File gốc hiển thị nội dung đầy đủ để đối chiếu và không được che trong chế độ này." : "Bạn đang xem văn bản đầy đủ trong phạm vi quyền đọc hợp đồng hiện tại."}</p>
            {viewMode === "redacted" && <p role="note" className="mb-0 mt-2 border-l-2 border-[#e1b96d] pl-3 text-ui-meta leading-6 text-[#79581b]">{isDocx ? "Bản DOCX đã che là bản xem riêng; file gốc được giữ nguyên. " : "Chỉ áp dụng cho khung văn bản này. "}Tóm tắt, rủi ro, chat và file gốc có thể còn thông tin đầy đủ.</p>}
            <p className="mb-0 mt-2">Việc nhận diện phụ thuộc cấu hình hợp đồng. Tên dùng nhãn Cá nhân 1 nhất quán trong bản xem. Email chỉ giữ ký tự đầu và tên miền, ví dụ m•••@gmail.com. Khi số cuối trùng nhau, nhãn Tài khoản hoặc Điện thoại giúp phân biệt các giá trị. Dấu chấm có độ dài cố định, không phản ánh số ký tự thật. Đây là bản đối chiếu nội bộ, không phải bản báo cáo chia sẻ đã che toàn bộ.</p>
            </details>
          </div>
          <div className={`${workspaceStyles.documentBody} min-h-0 overflow-hidden [@media_(max-width:_1080px)]:h-[min(58vh,650px)] [@media_(max-width:_1080px)]:min-h-[390px]`}>
            {viewMode === "redacted" && isDocx && contractId && !docxTextFallback ? <OriginalContractPreview key="redacted-docx" redacted version={result.contract.updatedAt} contractId={contractId} mimeType={mimeType} fileName={result.contract.currentVersion?.fileName} onTextFallback={() => setDocxTextFallback(true)} /> : showOriginal && contractId && mimeType ? originalTarget ? <FullDocument query={fullQuery}><OriginalContractPreview key="original-docx" version={result.contract.updatedAt} contractId={contractId} mimeType={mimeType} fileName={result.contract.currentVersion?.fileName} target={previewTarget} /></FullDocument> : <OriginalContractPreview key="original-file" version={result.contract.updatedAt} contractId={contractId} mimeType={mimeType} fileName={result.contract.currentVersion?.fileName} /> :
              <div ref={contractBodyRef} className="h-full overflow-y-auto scroll-smooth p-[26px] [@media_(max-width:_580px)]:p-[18px] motion-reduce:scroll-auto">
                {viewMode === "redacted" ? <RedactedDocument data={redactedQuery.data} isPending={redactedQuery.isPending && Boolean(contractId)} isError={redactedQuery.isError} isFetching={redactedQuery.isFetching} onRetry={() => { void redactedQuery.refetch(); }} /> : <FullDocument query={fullQuery}><ContractDocumentText clauses={clauses} text={text} activeClause={activeClause} /></FullDocument>}
              </div>}
          </div>
        </section>
      </div>
      {disclosure && <DocumentDisclosureDialog mode={disclosure.mode} onCancel={() => setDisclosure(null)} onConfirm={() => { applyDocumentMode(disclosure.mode, disclosure.clauseIndex); setDisclosure(null); }} />}
      {shareSummaryOpen && contractId && <ShareSummaryDialog key={`${contractId}:${result.contract.updatedAt}`} contractId={contractId} version={result.contract.updatedAt} onClose={() => setShareSummaryOpen(false)} />}
      {contractId && <KeyTerms contractId={contractId} />}
      {contractId && <ContractChat key={contractId} contractId={contractId} canAsk={canAsk} />}
      <p className="text-[#8a94a3] [border-top:1px_solid_#edf0f4] [background:#fafbfc] text-ui-meta text-right m-0 px-[22px] py-[9px]">Kết quả do AI hỗ trợ, không thay thế ý kiến tư vấn pháp lý chuyên môn.</p>
    </section>
  );
}
