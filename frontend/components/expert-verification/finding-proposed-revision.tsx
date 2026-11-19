import type { RiskFinding } from "@/types/contracts";
import styles from "@/styles/review/review-design.module.css";

export function FindingProposedRevision({ revision }: { revision?: RiskFinding["proposedRevision"] }) {
  if (!revision?.revisedText?.trim()) return null;
  return (
    <details className={`${styles.scope} ${styles.expertDisclosure}`}>
      <summary className="w-fit cursor-pointer text-xs font-medium text-[#315eac]">Xem đề xuất sửa điều khoản</summary>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="min-w-0">
          <h4 className="m-0 text-[11px] font-medium text-[#73766f]">Nội dung gốc được đối chiếu</h4>
          <p className={`${styles.revisionOriginal} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>{revision.originalText?.trim() || "Chưa có đoạn gốc được liên kết; đây có thể là đề xuất bổ sung điều khoản."}</p>
        </section>
        <section className="min-w-0">
          <h4 className="m-0 text-[11px] font-medium text-[#346538]">Nội dung đề xuất</h4>
          <p className={`${styles.revisionNew} whitespace-pre-wrap break-words [overflow-wrap:anywhere]`}>{revision.revisedText}</p>
        </section>
      </div>
      {revision.reason && <p className="mb-0 mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-[#73766f]"><strong className="font-medium">Lý do:</strong> {revision.reason}</p>}
      <p className="mb-0 mt-3 text-[11px] leading-6 text-[#93988e]">Nội dung tham khảo từ đề xuất đã lưu. Việc xác minh rủi ro chưa thay đổi văn bản hợp đồng.</p>
    </details>
  );
}
