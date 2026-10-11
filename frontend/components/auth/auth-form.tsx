"use client";

import { workspacePath } from "@/lib/workspace-path";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { get, useForm, useWatch, type FieldError as FormFieldError, type FieldErrors, type FieldPath, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { useAuthMutation } from "@/hooks/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { authFormSchema } from "@/schemas/auth.schema";
import type { AuthFormValues, AuthMode, AuthMutationVariables } from "@/types/auth";

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

function getFieldError(errors: FieldErrors<AuthFormValues>, field: FieldPath<AuthFormValues>) {
  return get(errors, field) as FormFieldError | undefined;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} className="text-[#b52f43] text-[length:9px] font-[530] leading-[1.4] -mt-0.5" role="alert">{message}</span>;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const authMutation = useAuthMutation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    mode: "onBlur",
    defaultValues: {
      mode,
      email: "",
      password: "",
      remember: false,
      name: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";
  const nameError = getFieldError(errors, "name");
  const confirmPasswordError = getFieldError(errors, "confirmPassword");

  const submit: SubmitHandler<AuthFormValues> = async (values) => {
    let request: AuthMutationVariables;

    if (values.mode === "register") {
      const { confirmPassword: _confirmPassword, mode: _mode, ...data } = values;
      void _confirmPassword;
      void _mode;
      request = { mode: "register", data };
    } else {
      const { mode: _mode, ...data } = values;
      void _mode;
      request = { mode: "login", data };
    }

    try {
      const session = await authMutation.mutateAsync(request);
      toast.success(isRegister ? "Đăng ký thành công" : "Đăng nhập thành công", {
        description: isRegister
          ? "Tài khoản của bạn đã được tạo."
          : "Chào mừng bạn quay lại LawScan.",
      });
      router.push(workspacePath(session.user));
      router.refresh();
    } catch (error) {
      if (!isApiClientError(error)) {
        const message = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
        setError("root.server", { message });
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

  const passwordLongEnough = password.length >= 12;
  const passwordWithinLimit = new TextEncoder().encode(password).length <= 72;
  const passwordNotCommon = !["123456789012", "password1234", "admin12345678", "qwerty123456", "lawscan123456"].includes(password.toLowerCase());
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className={`${"w-[min(460px,100%)] [&:is(a,_button):focus-visible]:[outline:3px_solid_#8ab8fa] [&:is(a,_button):focus-visible]:outline-offset-[3px] motion-safe:animate-[auth-enter_0.45s_cubic-bezier(.22,1,0.36,1)_both] [@media_(max-width:_840px)]:border [@media_(max-width:_840px)]:[background:#fff] [@media_(max-width:_840px)]:shadow-[0_22px_55px_-40px_#153b7380] [@media_(max-width:_840px)]:pt-[27px] [@media_(max-width:_840px)]:pb-[25px] [@media_(max-width:_840px)]:px-6 [@media_(max-width:_840px)]:rounded-[18px] [@media_(max-width:_840px)]:border-solid [@media_(max-width:_840px)]:border-[#e1e7ef] [@media_(max-width:_480px)]:px-[18px] [@media_(max-width:_480px)]:py-[23px] [@media_(max-width:_480px)]:rounded-[15px] motion-reduce:[animation-duration:0.01ms] motion-reduce:[animation-iteration-count:1]"} ${isRegister ? "[padding-block:22px]" : ""}`}>
      <nav className="w-fit grid grid-cols-[1fr_1fr] gap-[3px] border [background:#f4f6f9] p-[3px] rounded-[11px] border-solid border-[#e0e6ef] [&_a]:min-w-[92px] [&_a]:text-[#718097] [&_a]:text-center [&_a]:[text-decoration:none] [&_a]:text-[length:11px] [&_a]:font-[650] [&_a]:px-[13px] [&_a]:py-2 [&_a]:rounded-lg [&_a]:aria-[current=page]:text-[#11203c] [&_a]:aria-[current=page]:[background:#fff] [&_a]:aria-[current=page]:shadow-[0_2px_7px_#19365f12] [@media_(max-width:_480px)]:w-full [&_a]:[@media_(max-width:_480px)]:min-w-0" aria-label="Chọn hình thức truy cập">
        <Link href="/dang-nhap" aria-current={!isRegister ? "page" : undefined}>Đăng nhập</Link>
        <Link href="/dang-ky" aria-current={isRegister ? "page" : undefined}>Đăng ký</Link>
      </nav>

      <header className="mt-[26px] [&_h1]:text-[#0b1530] [&_h1]:text-[length:clamp(32px,3.3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.6px] [&_h1]:mt-2 [&>_p]:last:text-[#69788e] [&>_p]:last:text-[length:13px] [&>_p]:last:leading-[1.6] [&>_p]:last:mt-2.5 [&_h1]:[@media_(max-width:_840px)]:text-[length:33px] [@media_(max-width:_480px)]:mt-[23px] [&_h1]:[@media_(max-width:_480px)]:text-[length:30px]">
        <p className="text-[#0870f6] text-[length:10px] font-[720] tracking-[1.3px] uppercase">{isRegister ? "Bắt đầu với LawScan" : "Chào mừng trở lại"}</p>
        <h1>{isRegister ? "Tạo tài khoản LawScan" : "Đăng nhập vào LawScan"}</h1>
        <p>{isRegister ? "Đăng ký tài khoản để bắt đầu sử dụng LawScan." : "Tiếp tục công việc rà soát hợp đồng của bạn."}</p>
      </header>

      <form onSubmit={handleSubmit(submit)} className="grid gap-[15px] mt-[26px] [@media_(max-width:_480px)]:gap-[13px] [@media_(max-width:_480px)]:mt-[23px]" noValidate>
        <input type="hidden" {...register("mode")} />

        {isRegister && (
          <>
            <label className="grid gap-[7px] text-[#253650] text-[length:11px] font-[650]" htmlFor="name">
              <span>Họ và tên</span>
              <span className={`${"relative box-border flex items-center min-h-[50px] border [background:#fff] [transition:border-color_0.18s,box-shadow_0.18s,background_0.18s] rounded-[10px] border-solid border-[#d5deea] focus-within:[background:#fff] focus-within:shadow-[0_0_0_4px_#0870f612] focus-within:border-[#1675f5] [&>_svg]:w-[18px] [&>_svg]:flex-none [&>_svg]:text-[#8290a3] [&>_svg]:ml-3.5 [&_input]:flex-auto [&_input]:w-auto [&_input]:min-w-0 [&_input]:h-12 [&_input]:box-border [&_input]:text-[#111c34] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[13px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#a0aaba] [&_input]:[font-size:13px] [&_input]:[font-weight:450] [&_input:focus]:[outline:0] [&_input:focus]:shadow-none [&_input:focus-visible]:[outline:0] [&_input:focus-visible]:shadow-none motion-reduce:transition-none"} ${nameError ? "[background:#fffafa] border-[#d45264] focus-within:shadow-[0_0_0_4px_#d84c6212] focus-within:border-[#c83a50]" : ""}`}><Icon name="user" /><input id="name" autoComplete="name" maxLength={100} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "name-error" : undefined} placeholder="Nguyễn Minh Anh" {...register("name")} /></span>
              <FieldError id="name-error" message={nameError?.message} />
            </label>
          </>
        )}

        <label className="grid gap-[7px] text-[#253650] text-[length:11px] font-[650]" htmlFor="email">
          <span>Email công việc</span>
          <span className={`${"relative box-border flex items-center min-h-[50px] border [background:#fff] [transition:border-color_0.18s,box-shadow_0.18s,background_0.18s] rounded-[10px] border-solid border-[#d5deea] focus-within:[background:#fff] focus-within:shadow-[0_0_0_4px_#0870f612] focus-within:border-[#1675f5] [&>_svg]:w-[18px] [&>_svg]:flex-none [&>_svg]:text-[#8290a3] [&>_svg]:ml-3.5 [&_input]:flex-auto [&_input]:w-auto [&_input]:min-w-0 [&_input]:h-12 [&_input]:box-border [&_input]:text-[#111c34] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[13px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#a0aaba] [&_input]:[font-size:13px] [&_input]:[font-weight:450] [&_input:focus]:[outline:0] [&_input:focus]:shadow-none [&_input:focus-visible]:[outline:0] [&_input:focus-visible]:shadow-none motion-reduce:transition-none"} ${errors.email ? "[background:#fffafa] border-[#d45264] focus-within:shadow-[0_0_0_4px_#d84c6212] focus-within:border-[#c83a50]" : ""}`}><Icon name="mail" /><input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} placeholder="ban@doanhnghiep.vn" {...register("email")} /></span>
          <FieldError id="email-error" message={errors.email?.message} />
        </label>

        <label className="grid gap-[7px] text-[#253650] text-[length:11px] font-[650]" htmlFor="password">
          <span>Mật khẩu</span>
          <span className={`${"relative box-border flex items-center min-h-[50px] border [background:#fff] [transition:border-color_0.18s,box-shadow_0.18s,background_0.18s] rounded-[10px] border-solid border-[#d5deea] focus-within:[background:#fff] focus-within:shadow-[0_0_0_4px_#0870f612] focus-within:border-[#1675f5] [&>_svg]:w-[18px] [&>_svg]:flex-none [&>_svg]:text-[#8290a3] [&>_svg]:ml-3.5 [&_input]:flex-auto [&_input]:w-auto [&_input]:min-w-0 [&_input]:h-12 [&_input]:box-border [&_input]:text-[#111c34] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[13px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#a0aaba] [&_input]:[font-size:13px] [&_input]:[font-weight:450] [&_input:focus]:[outline:0] [&_input:focus]:shadow-none [&_input:focus-visible]:[outline:0] [&_input:focus-visible]:shadow-none motion-reduce:transition-none"} ${errors.password ? "[background:#fffafa] border-[#d45264] focus-within:shadow-[0_0_0_4px_#d84c6212] focus-within:border-[#c83a50]" : ""}`}>
            <Icon name="lock" />
            <input id="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} placeholder={isRegister ? "Tối thiểu 12 ký tự" : "Nhập mật khẩu"} {...register("password")} />
            <button className="w-[42px] h-[42px] grid place-items-center flex-none text-[#76859a] cursor-pointer mr-[3px] rounded-lg hover:text-[#0868ed] hover:[background:#f0f5fc] [&_svg]:w-[17px]" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
          </span>
          <FieldError id="password-error" message={errors.password?.message} />
        </label>

        {isRegister && (
          <>
            <label className="grid gap-[7px] text-[#253650] text-[length:11px] font-[650]" htmlFor="confirmPassword">
              <span>Nhập lại mật khẩu</span>
              <span className={`${"relative box-border flex items-center min-h-[50px] border [background:#fff] [transition:border-color_0.18s,box-shadow_0.18s,background_0.18s] rounded-[10px] border-solid border-[#d5deea] focus-within:[background:#fff] focus-within:shadow-[0_0_0_4px_#0870f612] focus-within:border-[#1675f5] [&>_svg]:w-[18px] [&>_svg]:flex-none [&>_svg]:text-[#8290a3] [&>_svg]:ml-3.5 [&_input]:flex-auto [&_input]:w-auto [&_input]:min-w-0 [&_input]:h-12 [&_input]:box-border [&_input]:text-[#111c34] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[13px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#a0aaba] [&_input]:[font-size:13px] [&_input]:[font-weight:450] [&_input:focus]:[outline:0] [&_input:focus]:shadow-none [&_input:focus-visible]:[outline:0] [&_input:focus-visible]:shadow-none motion-reduce:transition-none"} ${confirmPasswordError ? "[background:#fffafa] border-[#d45264] focus-within:shadow-[0_0_0_4px_#d84c6212] focus-within:border-[#c83a50]" : ""}`}><Icon name="lock" /><input id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" aria-invalid={Boolean(confirmPasswordError)} aria-describedby={confirmPasswordError ? "confirmPassword-error" : undefined} placeholder="Nhập lại mật khẩu vừa tạo" {...register("confirmPassword")} /></span>
              <FieldError id="confirmPassword-error" message={confirmPasswordError?.message} />
            </label>
            <div className="flex flex-wrap gap-[8px_15px] text-[#8a96a7] text-[length:9px] -mt-1 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:[background:#ccd3dd] [&_i]:rounded-[50%]" aria-live="polite">
              <span className={passwordLongEnough ? "text-[#16715d] [&_i]:[background:#20a77f]" : ""}><i />Ít nhất 12 ký tự</span>
              <span className={passwordWithinLimit && passwordNotCommon && password ? "text-[#16715d] [&_i]:[background:#20a77f]" : ""}><i />Không phải mật khẩu phổ biến</span>
              <span className={passwordsMatch ? "text-[#16715d] [&_i]:[background:#20a77f]" : ""}><i />Hai mật khẩu trùng khớp</span>
            </div>
          </>
        )}

        {!isRegister && <label className="w-fit flex items-center gap-[9px] text-[#68778d] text-[length:10px] cursor-pointer [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:accent-[#0868ed] [&_input]:m-0"><input type="checkbox" {...register("remember")} /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>}

        {errors.root?.server?.message && <p className="flex items-start gap-[9px] text-[#9c2032] border [background:#fff4f5] text-[length:10px] leading-normal px-3 py-2.5 rounded-[9px] border-solid border-[#f1c7ce] [&>_span]:w-[17px] [&>_span]:h-[17px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-white [&>_span]:[background:#c4364b] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:rounded-[50%]" role="alert"><span>!</span>{errors.root.server.message}</p>}

        <button className="min-h-[52px] flex items-center justify-between gap-3 text-white border [background:linear-gradient(110deg,#0870f6,#0758d7)] shadow-[0_12px_24px_-16px_#005bdccc] [font:inherit] cursor-pointer [transition:transform_0.2s,box-shadow_0.2s,background_0.2s] mt-0.5 pl-5 pr-[17px] py-0 rounded-[10px] border-solid border-[#0868ed] hover:[transform:translateY(-1px)] hover:shadow-[0_16px_28px_-15px_#005bdccc] disabled:opacity-70 disabled:cursor-wait disabled:transform-none [font-size:12px] [font-weight:680] [&_svg]:w-[18px] motion-reduce:transition-none" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}</span>
          {isSubmitting ? <i className="w-[17px] h-[17px] [animation:spin_0.7s_linear_infinite] rounded-[50%] border-t-white border-2 border-solid border-[#ffffff66] motion-reduce:[animation-duration:0.01ms] motion-reduce:[animation-iteration-count:1]" aria-hidden="true" /> : <Icon name="arrow" />}
        </button>
      </form>

      <p className="text-[#748196] text-center text-[length:11px] mt-5 [&_a]:text-[#0868ed] [&_a]:font-bold [&_a]:[text-decoration:none] [&_a]:hover:[text-decoration:underline] [&_a]:hover:underline-offset-[3px]">{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={isRegister ? "/dang-nhap" : "/dang-ky"}>{isRegister ? "Đăng nhập" : "Tạo tài khoản"}</Link></p>
      <p className="max-w-[390px] text-[#929cab] text-center text-[length:8px] leading-[1.6] mt-5 mb-0 mx-auto">{isRegister ? "LawScan chỉ dùng thông tin trên để tạo và bảo vệ tài khoản của bạn." : "AI hỗ trợ rà soát sơ bộ và không thay thế tư vấn pháp lý chuyên nghiệp."}</p>
    </div>
  );
}
