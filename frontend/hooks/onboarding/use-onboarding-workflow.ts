"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useCompleteOnboardingMutation,
  useRefreshTokenMutation,
} from "@/hooks/auth/use-auth";
import { useCreateOrganizationMutation } from "@/hooks/organizations/use-organizations";
import { authMutationKeys } from "@/lib/query-keys/auth";
import { isApiClientError } from "@/lib/api/client";
import { clearSessionCache } from "@/lib/auth/session-cache";
import type { CreateOrganizationInput } from "@/types/organization";
import {
  organizationCreateFormSchema,
  type OrganizationCreateFormValues,
} from "@/schemas/organization.schema";

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
    mutationFn: async ({
      action,
      organization,
    }: {
      action: SetupAction;
      organization?: CreateOrganizationInput;
    }) => {
      if (!completedAction.current) {
        if (action === "organization") await create.mutateAsync(organization!);
        else await complete.mutateAsync();
        completedAction.current = action;
        setSetupCompleted(true);
      }
      await refresh.mutateAsync();
      setNavigating(true);
      await clearSessionCache(queryClient);
      router.replace(
        completedAction.current === "organization" ? "/dashboard" : "/review",
      );
      router.refresh();
    },
    retry: false,
  });
  const busy = mutation.isPending || navigating;
  const error =
    validationError ||
    (mutation.error
      ? setupCompleted
        ? "Thiết lập đã được lưu nhưng chưa thể cập nhật phiên. Vui lòng thử lại để tiếp tục."
        : isApiClientError(mutation.error)
          ? mutation.error.message
          : mutation.variables?.action === "organization"
            ? "Không thể tạo tổ chức. Vui lòng thử lại."
            : "Không thể hoàn tất thiết lập. Vui lòng thử lại."
      : "");

  async function run(
    action: SetupAction,
    input?: OrganizationCreateFormValues,
  ) {
    if (busy || lock.current) return;
    let organization: CreateOrganizationInput | undefined;
    if (!completedAction.current && action === "organization") {
      const parsed = organizationCreateFormSchema.safeParse({
        name: input?.name ?? "",
        taxCode: input?.taxCode ?? "",
        industry: input?.industry ?? "",
        provinceCode: input?.provinceCode ?? "",
        wardCode: input?.wardCode ?? "",
        addressLine: input?.addressLine ?? "",
      });
      if (!parsed.success) {
        setValidationError(parsed.error.issues[0].message);
        return;
      }
      const values = parsed.data;
      organization = {
        name: values.name,
        taxCode: values.taxCode,
        industry: values.industry,
        addressDetails: {
          provinceCode: values.provinceCode,
          wardCode: values.wardCode,
          addressLine: values.addressLine,
        },
      };
    }
    setValidationError("");
    lock.current = true;
    try {
      await mutation.mutateAsync({ action, organization });
    } catch {
      setNavigating(false);
      lock.current = false;
    }
  }

  function clearError() {
    setValidationError("");
    if (!busy) mutation.reset();
  }
  return {
    busy,
    error,
    setupCompleted,
    clearError,
    continueWithoutOrganization: () => run("personal"),
    createOrganization: (input: OrganizationCreateFormValues) =>
      run("organization", input),
  };
}
