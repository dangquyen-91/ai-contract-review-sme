"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";

const workspaceEvent = "lawscan_workspace_changed";

function openWorkspace(path: "/review" | "/dashboard") {
  // Discard mounted providers and in-memory document state when the billing scope changes.
  window.location.assign(path);
}

export function useWorkspaceSwitcher() {
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const locked = useRef(false);
  const session = useQuery({
    queryKey: ["workspace-session"],
    queryFn: () => apiRequest<AuthUser>({ url: "/auth/workspace" }),
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

  async function switchWorkspace(workspace: "personal" | "organization") {
    if (locked.current || workspace === session.data?.workspace) return;
    locked.current = true;
    setSwitching(true);
    try {
      await queryClient.cancelQueries();
      await apiRequest({ url: "/auth/workspace", method: "POST", data: { workspace } });
      queryClient.clear();
      try { window.localStorage.setItem(workspaceEvent, String(Date.now())); } catch { /* Storage may be disabled. */ }
      openWorkspace(workspace === "personal" ? "/review" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể chuyển không gian. Hãy thử lại.");
      setSwitching(false);
      locked.current = false;
    }
  }

  return { user: session.data, switching, switchWorkspace };
}
