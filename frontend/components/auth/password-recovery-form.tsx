"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { usePasswordRecovery } from "@/hooks/auth/use-password-recovery";
import { ForgotPasswordRequestForm } from "./forgot-password-request-form";
import { PasswordRecoverySuccess } from "./password-recovery-success";
import { ResetPasswordForm } from "./reset-password-form";

export function PasswordRecoveryForm({ loginHref }: { loginHref: string }) {
  const workflow = usePasswordRecovery();

  return (
    <section className="w-full max-w-[460px] rounded-2xl bg-white p-2 max-[840px]:border max-[840px]:p-6">
      <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <Icon name={workflow.done ? "check" : "lock"} className="h-6 w-6" />
      </span>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
        Khôi phục tài khoản
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        {workflow.done
          ? "Đã đổi mật khẩu"
          : workflow.challenge
            ? "Đặt mật khẩu mới"
            : "Quên mật khẩu?"}
      </h1>

      {workflow.done ? (
        <PasswordRecoverySuccess loginHref={loginHref} />
      ) : (
        <>
          <p className="mb-6 mt-3 text-sm leading-6 text-[#65748b]">
            {workflow.challenge ? (
              <>
                Nếu email{" "}
                <strong className="break-all">{workflow.challenge.email}</strong>{" "}
                thuộc tài khoản đang hoạt động, mã 6 số sẽ được gửi đến hộp thư. Mã có hiệu lực trong 10 phút. Kiểm tra cả thư rác.
              </>
            ) : (
              "Nhập email đã đăng ký để nhận mã xác minh và đặt lại mật khẩu."
            )}
          </p>

          {workflow.error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {workflow.error}
            </p>
          )}

          {workflow.challenge ? (
            <ResetPasswordForm
              busy={workflow.busy}
              remaining={workflow.remaining}
              onSubmit={({ code, password }) => workflow.submit({ code, password })}
              onResend={() => workflow.send(workflow.challenge!.email)}
              onChangeEmail={workflow.changeEmail}
            />
          ) : (
            <ForgotPasswordRequestForm
              busy={workflow.busy}
              remaining={workflow.remaining}
              onSubmit={workflow.send}
            />
          )}

          <Link
            className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline"
            href={loginHref}
          >
            Quay lại đăng nhập
          </Link>
        </>
      )}
    </section>
  );
}
