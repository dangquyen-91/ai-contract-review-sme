"use client";

import { useContext } from "react";
import { DashboardSessionContext } from "@/providers/dashboard-provider";

export function useDashboardSession() {
  const session = useContext(DashboardSessionContext);
  if (!session) throw new Error("useDashboardSession requires DashboardProvider");
  return session;
}
