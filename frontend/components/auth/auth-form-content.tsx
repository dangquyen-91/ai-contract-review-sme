"use client";
import { Icon } from "@/components/ui/icon";
import { useAuthForm } from "@/hooks/use-auth-form";
import { EmailVerificationForm } from "./email-verification-form";
import { GoogleSignIn } from "./google-sign-in";
import { AuthFormHeader, AuthFormFooter } from "./auth-form-header";
import { AuthCredentialsFields } from "./auth-credentials-fields";
import type { ResolvedAuthFormProps } from "@/types/auth";

export function AuthFormContent(props: ResolvedAuthFormProps) {
  const { invitationToken, invitedEmail, returnTo } = props;
  const {
    form,
    isRegister,
    invited,
    inviteQuery,
    googleBusy,
    setGoogleBusy,
    accountExists,
    verification,
    clearVerification,
    password,
    remember,
    confirmPassword,
    onSubmit,
  } = useAuthForm(props);
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  if (verification)
    return (
      <EmailVerificationForm
        initialChallenge={verification}
        invitationToken={invited ? invitationToken : undefined}
        returnTo={returnTo}
        onBack={clearVerification}
      />
    );
  return (
    <div
      className={`${"w-[min(460px,100%)] [&:is(a,_button):focus-visible]:[outline:3px_solid_#8ab8fa] [&:is(a,_button):focus-visible]:outline-offset-[3px] motion-safe:animate-[auth-enter_0.45s_cubic-bezier(.22,1,0.36,1)_both] [@media_(max-width:_840px)]:border [@media_(max-width:_840px)]:[background:#fff] [@media_(max-width:_840px)]:shadow-[0_22px_55px_-40px_#153b7380] [@media_(max-width:_840px)]:pt-[27px] [@media_(max-width:_840px)]:pb-[25px] [@media_(max-width:_840px)]:px-6 [@media_(max-width:_840px)]:rounded-[18px] [@media_(max-width:_840px)]:border-solid [@media_(max-width:_840px)]:border-[#e1e7ef] [@media_(max-width:_480px)]:px-[18px] [@media_(max-width:_480px)]:py-[23px] [@media_(max-width:_480px)]:rounded-[15px] motion-reduce:[animation-duration:0.01ms] motion-reduce:[animation-iteration-count:1]"} ${isRegister ? "[padding-block:22px]" : ""}`}
    >
      <AuthFormHeader
        isRegister={isRegister}
        invited={invited}
        inviteQuery={inviteQuery}
      />
      <GoogleSignIn
        invitationToken={invitationToken}
        invitedEmail={invitedEmail}
        returnTo={returnTo}
        remember={remember}
        disabled={isSubmitting}
        onBusyChange={setGoogleBusy}
      />
      <form
        onSubmit={onSubmit}
        className="grid gap-[15px] mt-[26px] [@media_(max-width:_480px)]:gap-[13px] [@media_(max-width:_480px)]:mt-[23px]"
        noValidate
      >
        <fieldset disabled={googleBusy} className="contents">
          <input type="hidden" {...register("mode")} />
          <AuthCredentialsFields
            form={form}
            isRegister={isRegister}
            invited={invited}
            inviteQuery={inviteQuery}
            accountExists={accountExists}
            password={password}
            confirmPassword={confirmPassword}
          />
          {errors.root?.server?.message && (
            <p
              className="flex items-start gap-[9px] text-[#9c2032] border [background:#fff4f5] text-[length:10px] leading-normal px-3 py-2.5 rounded-[9px] border-solid border-[#f1c7ce] [&>_span]:w-[17px] [&>_span]:h-[17px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-white [&>_span]:[background:#c4364b] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:rounded-[50%]"
              role="alert"
            >
              <span>!</span>
              {errors.root.server.message}
            </p>
          )}

          <button
            className="min-h-[52px] flex items-center justify-between gap-3 text-white border [background:linear-gradient(110deg,#0870f6,#0758d7)] shadow-[0_12px_24px_-16px_#005bdccc] [font:inherit] cursor-pointer [transition:transform_0.2s,box-shadow_0.2s,background_0.2s] mt-0.5 pl-5 pr-[17px] py-0 rounded-[10px] border-solid border-[#0868ed] hover:[transform:translateY(-1px)] hover:shadow-[0_16px_28px_-15px_#005bdccc] disabled:opacity-70 disabled:cursor-wait disabled:transform-none [font-size:12px] [font-weight:680] [&_svg]:w-[18px] motion-reduce:transition-none"
            type="submit"
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting
                ? "Đang xử lý…"
                : isRegister
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
            </span>
            {isSubmitting ? (
              <i
                className="w-[17px] h-[17px] [animation:spin_0.7s_linear_infinite] rounded-[50%] border-t-white border-2 border-solid border-[#ffffff66] motion-reduce:[animation-duration:0.01ms] motion-reduce:[animation-iteration-count:1]"
                aria-hidden="true"
              />
            ) : (
              <Icon name="arrow" />
            )}
          </button>
        </fieldset>
      </form>
      <AuthFormFooter isRegister={isRegister} inviteQuery={inviteQuery} />
    </div>
  );
}
