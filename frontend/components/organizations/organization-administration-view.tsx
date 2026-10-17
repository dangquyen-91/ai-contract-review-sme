import Link from "next/link";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationInformationCard } from "./organization-information-card";

export function OrganizationAdministrationView({ organization, roleLabel, onMembers }: {
  organization: { id: string; name: string; taxCode: string | null; address: string | null };
  roleLabel: string;
  onMembers: () => void;
}) {
  return <>
    <header>
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Không gian quản trị</p>
      <h1 className="mt-2 text-[clamp(30px,3vw,42px)] font-bold leading-tight tracking-tight">Quản trị tổ chức</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Quản lý thông tin tổ chức, thành viên và gói dịch vụ của đội ngũ.</p>
    </header>
    <div className="mt-7 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <OrganizationInformationCard organization={organization} roleLabel={roleLabel} />
      <section className="flex min-w-0 flex-col items-start rounded-[14px] border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Users className="size-5" aria-hidden="true" /></span>
        <h2 className="mt-4 text-sm font-semibold">Thành viên & phân quyền</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Mời thành viên, gán vai trò và kiểm soát phạm vi truy cập của đội ngũ.</p>
        <div className="mt-auto pt-5"><Button variant="outline" size="sm" onClick={onMembers}>Quản lý thành viên<ArrowRight aria-hidden="true" /></Button></div>
      </section>
      <section className="flex min-w-0 flex-col items-start rounded-[14px] border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Sparkles className="size-5" aria-hidden="true" /></span>
        <h2 className="mt-4 text-sm font-semibold">Gói dịch vụ</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">So sánh hạn mức rà soát, lượt chat và số thành viên giữa các gói.</p>
        <div className="mt-auto pt-5"><Button variant="outline" size="sm" asChild><Link href="/goi-dich-vu">Xem các gói<ArrowRight aria-hidden="true" /></Link></Button></div>
      </section>
    </div>
  </>;
}
