"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useForm,
  useWatch,
  type FieldPath,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "sonner";
import { useAuthMutation } from "@/hooks/auth/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { authDestination, emailVerificationNavigation } from "@/lib/auth-return";
import { authFormSchema } from "@/schemas/auth.schema";
import type {
  AuthFormValues,
  AuthMutationVariables,
  ResolvedAuthFormProps,
} from "@/types/auth";
const authFields = new Set<FieldPath<AuthFormValues>>([
  "name",
  "email",
  "password",
  "confirmPassword",
  "remember",
]);

function isAuthField(field: string): field is FieldPath<AuthFormValues> {
  return authFields.has(field as FieldPath<AuthFormValues>);
}

export function useAuthForm({
  mode,
  invitationToken,
  invitedEmail,
  returnTo,
}: ResolvedAuthFormProps) {
  const isRegister = mode === "register";
  const invited = Boolean(
    invitationToken && /^[a-f\d]{64}$/.test(invitationToken),
  );
  const inviteQuery = invited
    ? `?invitationToken=${invitationToken}`
    : returnTo
      ? `?returnTo=${encodeURIComponent(returnTo)}`
      : "";
  const router = useRouter();
  const authMutation = useAuthMutation();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    mode: "onBlur",
    defaultValues: {
      mode,
      email: invitedEmail ?? "",
      password: "",
      remember: false,
      name: "",
      confirmPassword: "",
    },
  });
  const { control, setError } = form;

  const password = useWatch({ control, name: "password" }) ?? "";
  const remember = useWatch({ control, name: "remember" }) ?? false;
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";

  const submit: SubmitHandler<AuthFormValues> = async (values) => {
    if (googleBusy) return;
    setAccountExists(false);
    let request: AuthMutationVariables;

    if (values.mode === "register") {
      const {
        confirmPassword: _confirmPassword,
        mode: _mode,
        ...data
      } = values;
      void _confirmPassword;
      void _mode;
      request = {
        mode: "register",
        data: {
          ...data,
          ...(invited ? { invitationToken, email: invitedEmail! } : {}),
        },
      };
    } else {
      const { mode: _mode, ...data } = values;
      void _mode;
      request = {
        mode: "login",
        data: {
          ...data,
          ...(invited ? { invitationToken, email: invitedEmail! } : {}),
        },
      };
    }

    try {
      const session = await authMutation.mutateAsync(request);
      if ("verificationRequired" in session) {
        router.push(emailVerificationNavigation(mode, invited ? invitationToken : undefined, returnTo).verificationHref);
        return;
      }
      toast.success(
        isRegister ? "Đăng ký thành công" : "Đăng nhập thành công",
        {
          description: isRegister
            ? "Tài khoản của bạn đã được tạo."
            : "Chào mừng bạn quay lại LawScan.",
        },
      );
      router.push(
        authDestination(
          session.user,
          invited ? invitationToken : undefined,
          returnTo,
        ),
      );
      router.refresh();
    } catch (error) {
      if (!isApiClientError(error)) {
        const message = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
        setError("root.server", { message });
        toast.error(message);
        return;
      }

      if (
        isRegister &&
        invited &&
        error.status === 409 &&
        error.message === "Email already registered"
      ) {
        const message =
          "Email này đã đăng ký. Vui lòng đăng nhập để nhận lời mời.";
        setAccountExists(true);
        setError("root.server", { type: "server", message });
        toast.error(message);
        return;
      }

      for (const [field, messages] of Object.entries(error.details ?? {})) {
        if (isAuthField(field) && messages[0]) {
          setError(field, { type: "server", message: messages[0] });
        }
      }
      setError("root.server", { type: "server", message: error.message });
      toast.error(error.message);
    }
  };

  return {
    form,
    isRegister,
    invited,
    inviteQuery,
    googleBusy,
    setGoogleBusy,
    accountExists,
    password,
    remember,
    confirmPassword,
    onSubmit: form.handleSubmit(submit),
  };
}
