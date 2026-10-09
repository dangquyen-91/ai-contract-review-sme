import { notFound } from "next/navigation";
import { PageHeading, sections } from "@/components/admin/admin-panels";
import { AdminSectionTable } from "@/components/admin/admin-section-table";
export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ status?: string; item?: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(sections, section)) notFound();
  const config = sections[section as keyof typeof sections];
  const query = await searchParams;
  return (
    <>
      <PageHeading
        eyebrow={
          section === "organizations" || section === "users"
            ? "Quản lý"
            : "Vận hành"
        }
        title={config.title}
        description={config.description}
      />
      <AdminSectionTable
        key={`${section}-${query.status ?? ""}-${query.item ?? ""}`}
        section={section as keyof typeof sections}
        config={config}
        initialStatus={query.status}
        initialItem={query.item}
      />
    </>
  );
}
