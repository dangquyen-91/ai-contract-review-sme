import {
  legalSourceStatuses,
  legalSourceTypes,
} from "@/config/legal-source-display";
import type { StudioLaw } from "@/types/template-studio";

function date(value?: string) {
  return value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : undefined;
}

export function StudioLawAttributes({ source }: { source: StudioLaw }) {
  const rows = [
    ["Số hiệu", source.documentNumber],
    [
      "Loại văn bản",
      legalSourceTypes[source.sourceType as keyof typeof legalSourceTypes],
    ],
    ["Cơ quan ban hành", source.issuingBody],
    ["Người ký", source.signer],
    ["Ngày ban hành", date(source.issuedDate)],
    ["Ngày có hiệu lực", date(source.effectiveDate)],
    ["Tình trạng hiệu lực", legalSourceStatuses[source.status]],
    ["Lĩnh vực", source.legalField],
    ["Nơi ban hành", source.issuingPlace],
    ["Công báo", source.gazette],
  ];
  return (
    <dl className="mt-2 pb-1">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)]"
        >
          <dt className="text-xs font-medium leading-6 text-slate-500">
            {label}
          </dt>
          <dd
            className={`min-w-0 break-words text-[13px] leading-6 ${value ? "text-slate-800" : "text-slate-400"}`}
          >
            {value || "Chưa cập nhật"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
