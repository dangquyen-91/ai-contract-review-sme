import type { LegalCoverage } from "@/types/legal-sources";

export function LegalSourceCoverage({ coverage }: { coverage?: LegalCoverage }) {
  if (!coverage) return <p className="text-muted-foreground">Chưa có thông tin độ đầy đủ của tài liệu.</p>;
  return <section className="rounded-xl border border-border bg-card p-4 text-ui" aria-label="Độ đầy đủ tài liệu">
    <h3 className="font-semibold">Độ đầy đủ tài liệu</h3>
    <p className="mt-2">Đã nhận diện {coverage.articleCount} điều · {coverage.chunkCount} đoạn tham chiếu{coverage.expectedArticleCount ? ` · Dự kiến ${coverage.expectedArticleCount} điều` : ""}.</p>
    <p className="mt-2 text-muted-foreground">{!coverage.structured ? "Chưa nhận diện được cấu trúc điều luật. Hãy kiểm tra bản xem trước." : coverage.complete ? "Không phát hiện thiếu điều theo thông tin nhận diện; cần đối chiếu tài liệu gốc." : "Tài liệu có thể chưa đầy đủ. Hãy kiểm tra và bổ sung các phần còn thiếu."}</p>
    {!!coverage.missingRanges?.length && <p className="mt-2 text-amber-800">Khoảng điều thiếu: {coverage.missingRanges.join(", ")}</p>}
    {!!coverage.warnings?.length && <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">{coverage.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
  </section>;
}
