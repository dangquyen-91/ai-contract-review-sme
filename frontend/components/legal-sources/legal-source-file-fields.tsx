export const legalSourceFieldClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-ui leading-normal text-card-foreground [color-scheme:light] focus-visible:outline-2 focus-visible:outline-ring";

export function LegalSourceFileFields() {
  return <>
    <label className="grid gap-2 text-ui">Tài liệu *<input name="file" type="file" required accept=".pdf,.docx,.txt" className="w-full min-w-0 rounded-lg border border-input p-2" /><span className="text-ui-meta text-muted-foreground">PDF, DOCX hoặc TXT · Tối đa 20 MB</span></label>
    <label className="grid gap-2 text-ui">Tổng số điều dự kiến (không bắt buộc)<input name="expectedArticleCount" type="number" min={1} max={5000} step={1} className={legalSourceFieldClass} /><span className="text-ui-meta text-muted-foreground">Tổng số điều của toàn bộ văn bản để đối chiếu phần còn thiếu.</span></label>
  </>;
}
