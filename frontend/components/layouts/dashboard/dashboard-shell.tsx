"use client";

import { routes } from "@/config/routes";
import type { ReactNode } from "react";
import { DashboardHeader } from "./dashboard-header";
import { DashboardNavigation, DashboardSidebar } from "./dashboard-sidebar";
import { DashboardError } from "@/components/layouts/dashboard/dashboard-error";
import { DashboardSkeleton } from "@/components/layouts/dashboard/dashboard-skeleton";
import { getDashboardNavigation } from "@/config/dashboard-navigation";
import type { DashboardRole } from "@/config/dashboard-roles";
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace";
import { useDashboardSession } from "@/hooks/use-dashboard-session";
import type { DashboardData } from "@/types/dashboard";
import { ReceivedInvitations } from "@/components/invitations/received-invitations";
import { toast } from 'sonner';

export type DashboardWorkspaceContext = {
  data: DashboardData;
  access: { upload: boolean; review: boolean; administer: boolean };
  roleLabel: string;
};

type WorkspaceProps = {
  role: DashboardRole;
  activeKey: string;
  sectionLabel: string;
  workspaceName: string;
  workspaceLabel: string;
  name: string;
  roleLabel: string;
  onNavigate?: (key: string) => void;
  contractCount?: number;
  homeHref?: string;
  mainId?: string;
  className?: string;
  mainClassName?: string;
  footer?: ReactNode;
  layout?: 'standard' | 'editor';
  blockNavigation?: boolean;
  children: ReactNode;
};

type DataProps = {
  view: "review" | "contract" | "subscription";
  children: (context: DashboardWorkspaceContext) => ReactNode;
};

export type DashboardShellProps = WorkspaceProps | DataProps;

export function DashboardShell(props: DashboardShellProps) {
  if ("view" in props) return <DashboardDataView {...props} />;
  return <DashboardFrame {...props} />;
}

function DashboardDataView({ view, children }: DataProps) {
  const { data, error, isLoading, refetch, access, roleLabel } = useDashboardWorkspace();

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError error={error} onRetry={() => refetch()} />;

  const role: DashboardRole = data.role === "administrator" || data.role === "owner" || data.role === "manager" || data.role === "staff" || data.role === "expert" ? data.role : "user";
  const activeKey = role === "user" ? view : view === "review" ? "upload" : "contracts";

  return <DashboardFrame
    role={role}
    activeKey={activeKey}
    sectionLabel={view === "subscription" ? "Gói dịch vụ" : view === "review" ? "Tải & rà soát" : "Hợp đồng"}
    workspaceName={data.organization.name}
    workspaceLabel={role === "user" ? "Không gian cá nhân" : role === "administrator" ? "Không gian quản trị" : "Không gian tổ chức"}
    name={data.user?.name ?? "Tài khoản LawScan"}
    roleLabel={roleLabel}
    contractCount={data.totalContracts}
  >{children({ data, access, roleLabel })}</DashboardFrame>;
}

function DashboardFrame({ role, activeKey, sectionLabel, workspaceName, workspaceLabel, name, roleLabel, onNavigate, contractCount, homeHref = routes.home(role), mainId = "dashboard-content", className = "", mainClassName = "", footer, children, layout = 'standard', blockNavigation = false }: WorkspaceProps) {
  const { logout, loggingOut } = useDashboardSession();
  const navigation = getDashboardNavigation(role);
  const editor = layout === 'editor';
  const blocked = () => { toast.info('Vui lòng lưu thay đổi hoặc chờ thao tác hoàn tất trước khi rời trang.'); };
  const onLogout = () => { if (blockNavigation) blocked(); else void logout(); };

  return (
    <div onClickCapture={event => { if (blockNavigation && event.target instanceof Element && event.target.closest('a[href]:not([href^="#"])')) { event.preventDefault(); event.stopPropagation(); blocked(); } }} className={`[--ink:#14213d] [--muted:#6b778c] [--line:#e4e8ef] [--accent:#2864dc] [--accent-dark:#1f4fb2] [--soft:#f4f7fb] ${editor ? "h-dvh min-h-0 overflow-hidden max-[820px]:!flex max-[820px]:flex-col" : "min-h-dvh"} flex text-[color:var(--ink)] [background:#f6f7f9] [font-family:var(--font-geist-sans),Arial,sans-serif] [&_*]:box-border [&_:is(a,_button)]:[text-decoration:none] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:[outline:3px_solid_#9bbcf8] [&_:is(a,_button,_input,_select,_textarea)]:focus-visible:outline-offset-2 [@media_(max-width:_820px)]:block [&_*]:motion-reduce:!transition-none [&_*::before]:motion-reduce:!transition-none [&_*::after]:motion-reduce:!transition-none ${className}`}>
      <a className="fixed top-[-60px] z-20 text-[color:var(--ink)] [background:white] px-3.5 py-2.5 rounded-lg left-4 focus:top-3" href={`#${mainId}`}>Đến nội dung chính</a>
      <DashboardSidebar homeHref={homeHref} workspaceName={workspaceName} workspaceLabel={workspaceLabel} name={name} roleLabel={roleLabel} onLogout={onLogout} loggingOut={loggingOut} items={navigation} activeKey={activeKey} onNavigate={onNavigate} contractCount={contractCount} />
      <div className={`min-w-0 flex-1 ${editor ? 'flex min-h-0 flex-col' : ''}`}>
        <div className={editor ? 'shrink-0 min-[821px]:hidden' : undefined}><DashboardHeader workspaceName={workspaceName} sectionLabel={sectionLabel} name={name} roleLabel={roleLabel} onLogout={onLogout} loggingOut={loggingOut} /></div>
        <DashboardNavigation mobile items={navigation} activeKey={activeKey} onNavigate={onNavigate} contractCount={contractCount} />
        <main id={mainId} className={`${editor ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden' : 'w-[min(1420px,100%)] [margin-inline:auto] pt-[38px] pb-16 px-[clamp(24px,4vw,52px)] [@media_(max-width:_820px)]:pt-[30px] [@media_(max-width:_820px)]:pb-12 [@media_(max-width:_820px)]:px-[18px]'} ${mainClassName}`}>{role === "user" && <ReceivedInvitations />}{children}</main>
        {footer}
      </div>
    </div>
  );
}
