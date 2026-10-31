"use client";

import { useContext } from "react";
import { DashboardContext } from "@/providers/dashboard-provider";

export function useDashboardSession() {
  const session = useContext(DashboardContext);
  if (!session) throw new Error("useDashboardSession requires DashboardProvider");
  return session;
}
