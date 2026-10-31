"use client";
import type { ReactNode } from 'react';
import { DashboardContext } from './dashboard-provider';
import { useLogoutWorkflow } from '@/hooks/auth/use-logout-workflow';

export function AccountProvider({ children }: { children: ReactNode }) {
  const session = useLogoutWorkflow();
  return <DashboardContext.Provider value={{ ...session, workspace: null }}>{children}</DashboardContext.Provider>;
}
