"use client";
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layouts/dashboard/dashboard-shell';
import { roleLabels } from '@/config/dashboard-roles';
import type { AuthUser } from '@/types/auth';

export function DraftShell({ user, organizationName, blockNavigation = false, children }: { user: AuthUser; organizationName?: string; blockNavigation?: boolean; children: ReactNode }) {
  return <div onClickCapture={event => {
    if (blockNavigation && event.target instanceof Element && event.target.closest('a[href]')) {
      event.preventDefault(); event.stopPropagation(); toast.info('Vui lòng lưu thay đổi hoặc chờ thao tác hoàn tất trước khi rời trang.');
    }
  }}><DashboardShell role={user.role} activeKey="drafts" sectionLabel="Tạo hợp đồng từ mẫu" workspaceName={organizationName ?? 'Doanh nghiệp'} workspaceLabel="Không gian doanh nghiệp" name={user.name} roleLabel={roleLabels[user.role]} homeHref="/dashboard"><div className="mx-auto max-w-[1180px]">{children}</div></DashboardShell></div>;
}
