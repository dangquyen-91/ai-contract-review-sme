import { notFound } from "next/navigation";
import { UnavailableSection, sections } from "@/components/admin/admin-panels";
export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(sections, section)) notFound();
  return <UnavailableSection section={section as keyof typeof sections} />;
}
