import type { z } from "zod";
import type { authFormSchema, loginFormSchema, registerFormSchema } from "@/schemas/auth.schema";

export type AuthMode = "login" | "register";

export type UserRole = "administrator" | "manager" | "staff" | "owner" | "reviewer" | "user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string | null;
  hasCompletedOnboarding: boolean;
};

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type AuthFormValues = z.infer<typeof authFormSchema>;

export type LoginInput = LoginFormValues;
export type RegisterInput = Omit<RegisterFormValues, "confirmPassword">;

export type AuthSession = {
  user: AuthUser;
};

export type RefreshTokenResult = {
  refreshed: true;
};

export type AuthMutationVariables =
  | { mode: "login"; data: LoginInput }
  | { mode: "register"; data: RegisterInput };
