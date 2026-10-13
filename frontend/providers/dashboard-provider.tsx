"use client";

import { createContext, useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLogoutMutation } from "@/hooks/use-auth";

export type DashboardSession = {
  logout: () => Promise<void>;
  loggingOut: boolean;
};

export const DashboardSessionContext = createContext<DashboardSession | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutMutation();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }, [loggingOut, logoutMutation, queryClient, router]);

  return <DashboardSessionContext.Provider value={{ logout, loggingOut }}>{children}</DashboardSessionContext.Provider>;
}
