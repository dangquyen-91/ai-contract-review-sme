"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLogoutMutation } from "@/hooks/auth/use-auth";
import { clearSessionCache } from "@/lib/auth/session-cache";

export function useLogoutWorkflow({ destination = "/dang-nhap", onSuccess, onError, successMessage }: {
  destination?: string;
  onSuccess?: () => void;
  onError?: () => void;
  successMessage?: string;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useLogoutMutation();
  const [navigating, setNavigating] = useState(false);
  const lock = useRef(false);
  const loggingOut = mutation.isPending || navigating;

  async function logout() {
    if (lock.current || loggingOut) return;
    lock.current = true;
    try {
      await mutation.mutateAsync();
      setNavigating(true);
      await clearSessionCache(queryClient);
      onSuccess?.();
      if (successMessage) toast.success(successMessage);
      router.replace(destination);
      router.refresh();
    } catch {
      lock.current = false;
      setNavigating(false);
      if (onError) onError();
      else toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  return { logout, loggingOut };
}
