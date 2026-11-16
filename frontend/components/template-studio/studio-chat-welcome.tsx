import { ArrowUpRight, MessageSquare } from "lucide-react";
import type { TemplateCode } from "@/types/contract-drafts";

export function StudioChatWelcome({
  templateCode,
  disabled,
  onSuggestion,
}: {
  templateCode: TemplateCode;
  disabled: boolean;
  onSuggestion: (message: string) => void;
}) {
  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-4"
      data-studio-welcome
    >
      <div className="mb-4 grid size-10 place-items-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
        <MessageSquare size={20} strokeWidth={1.7} />
      </div>
      <h2 className="max-w-72 text-[20px] font-semibold leading-7 tracking-tight text-slate-800">
        Cùng bạn hoàn thiện từng điều khoản.
      </h2>
      <p className="mt-2.5 max-w-80 text-[13px] leading-6 text-slate-500">
        Chỉnh ngay trên mẫu, hoặc nói cho tôi biết bạn muốn thay đổi điều gì.
      </p>
      <div className="mt-5 grid gap-2">
        {[
          templateCode === "labor"
            ? "Điền mức lương 15.000.000 đồng mỗi tháng"
            : "Điền giá trị hợp đồng 15.000.000 đồng",
          "Làm rõ cách bàn giao và nghiệm thu",
          "Thêm trách nhiệm bảo mật phù hợp",
        ].map((text) => (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestion(text)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 text-left text-xs leading-5 text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 disabled:opacity-40"
          >
            <span>{text}</span>
            <ArrowUpRight
              size={13}
              className="shrink-0 text-slate-400 group-hover:text-blue-500"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
