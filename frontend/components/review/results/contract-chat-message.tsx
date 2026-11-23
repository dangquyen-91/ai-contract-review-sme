"use client";

import { BookOpen, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ContractChatMessage } from "@/types/contracts";
import { legalSourceLink } from "@/lib/review/legal-source-links";
import { LegalSourceLink } from "./legal-source-link";

function ChatSourceLink({ source }: { source: NonNullable<ContractChatMessage["legalSources"]>[number] }) {
  const link = legalSourceLink(source);
  if (!link) return null;
  return <> · <LegalSourceLink link={link} /></>;
}

function ChatLegalSources({ sources = [] }: { sources?: ContractChatMessage["legalSources"] }) {
  const items = sources.filter((source, index) => sources.findIndex((other) =>
    other.citationLabel === source.citationLabel && other.articleRef === source.articleRef) === index);
  if (!items.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-center gap-2 text-ui-meta font-semibold text-slate-700">
        <BookOpen aria-hidden="true" className="size-3.5" />
        Căn cứ tham khảo
      </div>
      <ul className="m-0 mt-2 grid list-none gap-2 p-0 text-ui-meta leading-5 text-slate-600">
        {items.map((source, index) => (
          <li key={`${source.citationLabel}-${source.articleRef ?? ""}`} className="flex items-start gap-2">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-white text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {index + 1}
            </span>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {source.citationLabel || source.sourceTitle}
              {source.articleRef && <span className="text-slate-500"> · {source.articleRef}</span>}
              <ChatSourceLink source={source} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContractChatMessageView({ role, content, sources, pending = false }: {
  role: ContractChatMessage["role"];
  content: string;
  sources?: ContractChatMessage["legalSources"];
  pending?: boolean;
}) {
  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Đã sao chép câu trả lời");
    } catch {
      toast.error("Chưa thể sao chép. Bạn có thể chọn và sao chép nội dung trực tiếp.");
    }
  }

  if (role === "user") {
    return (
      <article aria-label="Câu hỏi của bạn" className="ml-auto w-fit max-w-[90%] sm:max-w-[80%]">
        <p className="m-0 whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[#edf3ff] px-4 py-3 text-ui leading-7 text-[#244575] [overflow-wrap:anywhere]">
          {content}
        </p>
      </article>
    );
  }

  return (
    <article aria-label="Câu trả lời của LawScan AI" className="flex min-w-0 gap-3 sm:gap-3.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] border border-blue-100 bg-blue-50 text-primary">
        <Sparkles aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-ui font-semibold text-slate-800">LawScan AI</span>
          {pending && <span className="text-ui-caption text-slate-500">Đang trả lời…</span>}
        </div>
        {content ? (
          <p className="m-0 whitespace-pre-wrap break-words text-ui leading-7 text-slate-600 [overflow-wrap:anywhere]">{content}</p>
        ) : (
          <div role="status" aria-label="AI đang soạn câu trả lời" className="flex h-7 items-center gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-1.5 animate-pulse rounded-full bg-blue-400 motion-reduce:animate-none" style={{ animationDelay: `${dot * 180}ms` }} />
            ))}
          </div>
        )}
        <ChatLegalSources sources={sources} />
        {!pending && content && (
          <Button variant="ghost" size="xs" onClick={() => void copyAnswer()} className="mt-2 -ml-1.5 gap-1.5 text-slate-400 hover:text-slate-700" aria-label="Sao chép câu trả lời">
            <Copy aria-hidden="true" className="size-3" />
            Sao chép
          </Button>
        )}
      </div>
    </article>
  );
}
