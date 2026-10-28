"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompleteOnboardingMutation, useRefreshTokenMutation } from "@/hooks/auth/use-auth";
import { useCreateOrganizationMutation } from "@/hooks/organizations/use-organizations";
import { authMutationKeys } from "@/lib/query-keys/auth";
import { isApiClientError } from "@/lib/api/client";
import { clearSessionCache } from "@/lib/session-cache";

type SetupAction = "personal" | "organization";

export function useOnboardingWorkflow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useCreateOrganizationMutation();
  const complete = useCompleteOnboardingMutation();
  const refresh = useRefreshTokenMutation();
  const completedAction = useRef<SetupAction | null>(null);
  const lock = useRef(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const mutation = useMutation({
    mutationKey: authMutationKeys.onboardingWorkflow,
    mutationFn: async ({ action, name }: { action: SetupAction; name?: string }) => {
      if (!completedAction.current) {
        if (action === "organization") await create.mutateAsync({ name: name! });
        else await complete.mutateAsync();
        completedAction.current = action;
        setSetupCompleted(true);
      }
      await refresh.mutateAsync();
      setNavigating(true);
      await clearSessionCache(queryClient);
      router.replace(completedAction.current === "organization" ? "/dashboard" : "/review");
      router.refresh();
    },
    retry: false,
  });
  const busy = mutation.isPending || navigating;
  const error = validationError || (mutation.error
    ? setupCompleted ? "Thiết lập đã được lưu nhưng chưa thể cập nhật phiên. Vui lòng thử lại để tiếp tục."
      : isApiClientError(mutation.error) ? mutation.error.message
      : mutation.variables?.action === "organization" ? "Không thể tạo tổ chức. Vui lòng thử lại." : "Không thể hoàn tất thiết lập. Vui lòng thử lại."
    : "");

  async function run(action: SetupAction, name?: string) {
    if (busy || lock.current) return;
    const trimmed = name?.trim();
    if (!completedAction.current && action === "organization" && (!trimmed || trimmed.length < 2)) {
      setValidationError("Tên tổ chức cần có ít nhất 2 ký tự.");
      return;
    }
    setValidationError("");
    lock.current = true;
    try { await mutation.mutateAsync({ action, name: trimmed }); }
    catch { setNavigating(false); lock.current = false; }
  }

  function clearError() {
    setValidationError("");
    if (!busy) mutation.reset();
  }
  return {
    busy, error, setupCompleted, clearError,
    continueWithoutOrganization: () => run("personal"),
    createOrganization: (name: string) => run("organization", name),
  };
}
