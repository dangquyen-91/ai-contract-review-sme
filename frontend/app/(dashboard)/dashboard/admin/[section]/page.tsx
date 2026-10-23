import { notFound, redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { sections } from "@/config/management-sections";
import { ManagementSectionTable } from "@/components/management/management-section-table";
import { userManagementPath } from "@/config/user-management";
export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ status?: string; item?: string }>;
}) {
  const { section } = await params;
  if (section === "users" || section === "userManagement") redirect(userManagementPath);
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
      <ManagementSectionTable
        key={`${section}-${query.status ?? ""}-${query.item ?? ""}`}
        section={section as keyof typeof sections}
        config={config}
        initialStatus={query.status}
        initialItem={query.item}
      />
    </>
  );
}
