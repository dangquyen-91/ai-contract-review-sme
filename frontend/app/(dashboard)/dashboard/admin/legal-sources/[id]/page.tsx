import { notFound } from "next/navigation";
import { LegalSourceDetail } from "@/components/legal-sources/legal-source-detail";

export default async function LegalSourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  return <LegalSourceDetail id={id} />;
}
