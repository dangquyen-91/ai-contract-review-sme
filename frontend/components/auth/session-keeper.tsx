"use client";

import { useSessionKeeper } from "@/hooks/auth/use-session-keeper";

export function SessionKeeper() {
  useSessionKeeper();
  return null;
}
