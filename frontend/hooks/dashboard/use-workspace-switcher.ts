"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { invitationsApi } from "@/lib/api/invitations";
import { authQueryKeys } from "@/lib/query-keys/auth";
import type { Workspace } from "@/types/auth";

const workspaceEvent = "lawscan_workspace_changed";

function openWorkspace(path: string) {
  // Discard mounted providers and in-memory document state when the billing scope changes.
  window.location.assign(path);
}

/** Only same-site paths are allowed as a destination after switching. */
const internalPath = (path?: string) => (path && /^\/(?![/\\])/.test(path) ? path : undefined);

export function useWorkspaceSwitcher() {
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const locked = useRef(false);
  const session = useQuery({
    queryKey: authQueryKeys.workspaceSession,
    queryFn: authApi.workspaceSession,
    staleTime: 30_000,
    retry: false,
  });
  const workspaces = useQuery({
    queryKey: authQueryKeys.workspaces,
    queryFn: authApi.workspaces,
    enabled: Boolean(session.data?.organizationMembership),
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key === workspaceEvent) openWorkspace("/review");
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  /** Runs `before` (if any), moves the session to `workspace` and reloads with no stale data. */
  async function enterWorkspace(workspace: Workspace, failure: string, before?: () => Promise<void>, returnTo?: string) {
    if (locked.current) return false;
    locked.current = true;
    setSwitching(true);
    try {
      await queryClient.cancelQueries();
      await before?.();
      await authApi.switchWorkspace(workspace);
      queryClient.clear();
      try { window.localStorage.setItem(workspaceEvent, String(Date.now())); } catch { /* Storage may be disabled. */ }
      openWorkspace(internalPath(returnTo) ?? (workspace === "personal" ? "/review" : "/dashboard"));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
      setSwitching(false);
      locked.current = false;
      return false;
    }
  }

  /** Switches the billing scope; `returnTo` keeps the user on the page they were using. */
  async function switchWorkspace(workspace: Workspace, returnTo?: string) {
    if (workspace === session.data?.workspace) return false;
    return enterWorkspace(workspace, "Không thể chuyển không gian. Hãy thử lại.", undefined, returnTo);
  }

  /** Staff leaves the organization, then continues in the personal workspace. */
  async function leaveOrganization() {
    const orgId = session.data?.organizationMembership?.orgId;
    if (!orgId) return false;
    return enterWorkspace("personal", "Không thể rời tổ chức. Hãy thử lại.", () =>
      invitationsApi.leaveOrganization(orgId),
    );
  }

  return {
    user: session.data,
    workspaces: workspaces.data?.items ?? [],
    switching,
    switchWorkspace,
    leaveOrganization,
  };
}
