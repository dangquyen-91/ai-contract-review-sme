"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { routes } from "@/config/routes";
import { clearSessionCache } from "@/lib/auth/session-cache";
import { useDeleteOrganization } from "./use-organizations";

export function useDeleteOrganizationWorkflow(organizationId: string) {
  const mutation = useDeleteOrganization(organizationId);
  const client = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const lock = useRef(false);

  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    try {
      await mutation.mutateAsync();
    } catch {
      lock.current = false;
      return;
    }
    setNavigating(true);
    try {
      await clearSessionCache(client);
    } finally {
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith("lawscan_review_")) sessionStorage.removeItem(key);
        }
      } catch {
        // Storage may be blocked. A fresh document still removes in-memory state.
      }
      // The next server render verifies the existing refresh token against the
      // updated personal account; SessionKeeper refreshes its browser cookies.
      window.location.replace(routes.reviewWorkspace);
    }
  }

  return {
    confirmOpen,
    pending: mutation.isPending || navigating,
    error: mutation.error?.message,
    open: () => {
      mutation.reset();
      setConfirmOpen(true);
    },
    close: () => {
      if (!lock.current) setConfirmOpen(false);
    },
    confirm,
  };
}
