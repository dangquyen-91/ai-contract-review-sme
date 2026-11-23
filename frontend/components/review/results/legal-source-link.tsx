import { ExternalLink } from "lucide-react";
import type { LegalSourceLink as Link } from "@/lib/review/legal-source-links";

export function LegalSourceLink({ link, showLabel = false, className = "" }: {
  link: Link;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Mở văn bản gốc ${link.label} (tab mới)`}
      className={`inline-flex items-center gap-1 font-medium text-[#315eac] underline underline-offset-2 hover:text-[#244575] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315eac] ${className}`}
    >
      {showLabel ? `Xem văn bản ${link.label}` : "Xem văn bản gốc"}
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
    </a>
  );
}
