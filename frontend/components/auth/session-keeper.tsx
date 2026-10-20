"use client";

import { useSessionKeeper } from "@/hooks/use-session-keeper";

export function SessionKeeper() {
  useSessionKeeper();
  return null;
}
