"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLegalSourceDetail } from "@/hooks/use-legal-source-detail";
import { LegalSourceDetailContent } from "./legal-source-detail-content";

// Keeps previously shared detail URLs usable; list actions open the dialog.
export function LegalSourceDetail({ id }: { id: string }) {
  const router = useRouter();
  const workflow = useLegalSourceDetail(id, () => router.replace("/management/legal-sources"));
  return <div className="space-y-5 text-card-foreground">
    <Button asChild variant="ghost" size="sm" className="h-11 sm:h-9"><Link href="/management/legal-sources"><ArrowLeft aria-hidden="true" />Kho dữ liệu pháp lý</Link></Button>
    <h1 className="break-words text-ui-title font-semibold">{workflow.source?.title || "Chi tiết nguồn pháp lý"}</h1>
    <LegalSourceDetailContent workflow={workflow} />
  </div>;
}
