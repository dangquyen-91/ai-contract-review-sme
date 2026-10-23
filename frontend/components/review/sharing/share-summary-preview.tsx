import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import type { ContractShareSummary } from "@/types/contracts";

const tones = {
  Cao: { card: "border-rose-200 border-l-rose-500 bg-rose-50/60", badge: "bg-rose-100 text-rose-800", Icon: AlertTriangle },
  "Trung bình": { card: "border-border border-l-amber-400 bg-card", badge: "bg-amber-100 text-amber-900", Icon: CircleAlert },
  Thấp: { card: "border-border border-l-blue-300 bg-card", badge: "bg-blue-50 text-blue-800", Icon: Info },
};
const headings = new Set(["TỔNG QUAN", "VẤN ĐỀ ƯU TIÊN", "HƯỚNG XỬ LÝ ĐỀ XUẤT"]);

export function ShareSummaryPreview({ text, counts }: { text: string; counts?: ContractShareSummary["findingCounts"] }) {
  return <article aria-label="Bản xem trước tóm tắt" className="space-y-3 rounded-xl border border-border bg-card p-4 text-ui leading-6 text-card-foreground sm:p-5">
    {counts && <section aria-label="Mức rủi ro theo kết quả đã lưu" className="mb-5">
      <p className="mb-2 text-ui-meta font-medium text-muted-foreground">Mức rủi ro theo kết quả phân tích đã lưu</p>
      <div className="grid grid-cols-3 gap-2">
        {([{ label: "Cao", value: counts.high }, { label: "Trung bình", value: counts.medium }, { label: "Thấp", value: counts.low }] as const).map(({ label, value }) => {
          const { Icon, badge } = tones[label];
          return <div key={label} className={`rounded-xl p-3 ${badge}`}><Icon className="mb-2 size-4" aria-hidden="true" /><strong className="block text-2xl font-bold tabular-nums">{value}</strong><span className="text-ui-meta font-semibold">{label}</span></div>;
        })}
      </div>
    </section>}
    {text.split(/\r?\n/).map((raw, index) => {
      const line = raw.trim();
      if (!line) return null;
      if (index === 0) return <p key={index} className="font-bold tracking-wide">{line}</p>;
      if (headings.has(line)) return <h3 key={index} className="border-t border-border pt-4 text-ui-section font-semibold">{line}</h3>;
      const risk = line.match(/^\d+\.\s*\[(Cao|Trung bình|Thấp)\]\s*(.*)$/);
      if (risk) {
        const severity = risk[1] as keyof typeof tones;
        const { card, badge, Icon } = tones[severity];
        return <div key={index} className={`rounded-lg border border-l-[3px] p-3 ${card}`}>
          <span className={`mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-ui-caption font-semibold ${badge}`}><Icon className="size-3.5" aria-hidden="true" />Rủi ro {severity.toLocaleLowerCase("vi")}</span>
          <p className="break-words font-semibold text-card-foreground">{risk[2]}</p>
        </div>;
      }
      if (line.startsWith("• ")) return <p key={index} className="flex items-start gap-2 text-[#52647e]"><span aria-hidden="true" className="text-primary">•</span><span className="min-w-0 break-words">{line.slice(2)}</span></p>;
      return <p key={index} className="break-words text-muted-foreground">{line}</p>;
    })}
  </article>;
}
