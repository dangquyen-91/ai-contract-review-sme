"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useCreateOrganizationMutation } from "@/hooks/use-organizations";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";

export function CompanyChoice() {
  const router = useRouter();
  const [view, setView] = useState<"choice" | "create">("choice");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createOrganizationMutation = useCreateOrganizationMutation();

  async function continueWithoutOrganization() {
    setError("");
    setIsSubmitting(true);

    try {
      await authApi.completeOnboarding();
      await authApi.refreshToken();
      router.replace("/dashboard/user");
      router.refresh();
    } catch (requestError) {
      setError(
        isApiClientError(requestError)
          ? requestError.message
          : "Không thể hoàn tất thiết lập. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationName = name.trim();

    if (organizationName.length < 2) {
      setError("Tên tổ chức cần có ít nhất 2 ký tự.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await createOrganizationMutation.mutateAsync({ name: organizationName });
      await authApi.refreshToken();
      router.replace("/dashboard/owner");
      router.refresh();
    } catch (requestError) {
      setError(
        isApiClientError(requestError)
          ? requestError.message
          : "Không thể tạo tổ chức. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-[min(610px,100%)] [@media_(max-width:_900px)]:max-w-[620px] [@media_(max-width:_900px)]:[margin-inline:auto] [@media_(max-width:_900px)]:border [@media_(max-width:_900px)]:[background:#ffffff] [@media_(max-width:_900px)]:shadow-[0_24px_60px_-44px_rgb(18_65_126_/_0.62)] [@media_(max-width:_900px)]:p-[30px] [@media_(max-width:_900px)]:rounded-[18px] [@media_(max-width:_900px)]:border-solid [@media_(max-width:_900px)]:border-[#dce5f0] [@media_(max-width:_520px)]:px-[18px] [@media_(max-width:_520px)]:py-[25px] [@media_(max-width:_520px)]:rounded-[15px]">
      {view === "choice" ? (
        <>
          <header className="max-w-[570px] [&_h1]:text-[color:var(--onboarding-ink)] [&_h1]:text-[length:clamp(36px,4vw,52px)] [&_h1]:font-[710] [&_h1]:leading-[1.08] [&_h1]:tracking-[-2.1px] [&_h1]:mt-[11px] [&>_p]:last:max-w-[520px] [&>_p]:last:text-[color:var(--onboarding-muted)] [&>_p]:last:text-[length:14px] [&>_p]:last:leading-[1.65] [&>_p]:last:mt-[15px] [&_h1]:[@media_(max-width:_520px)]:text-[length:32px] [&_h1]:[@media_(max-width:_520px)]:tracking-[-1.35px] [&>_p]:[@media_(max-width:_520px)]:last:text-[length:13px]">
            <p className="text-[color:var(--onboarding-accent)] text-[length:11px] font-[740] tracking-[1.1px] uppercase">Bước thiết lập cuối cùng</p>
            <h1>Bạn đã thuộc công ty nào chưa?</h1>
            <p>Chọn cách bạn muốn bắt đầu. Bạn vẫn có thể cập nhật thông tin tổ chức sau.</p>
          </header>

          <div className="grid gap-[13px] mt-[38px] [@media_(max-width:_520px)]:mt-[29px]" role="group" aria-label="Chọn trạng thái tổ chức">
            <button className="w-full min-h-[104px] grid grid-cols-[48px_minmax(0,1fr)_34px] items-center gap-[17px] text-[color:var(--onboarding-ink)] border border-[color:var(--onboarding-line)] [background:#ffffff] shadow-[0_13px_34px_-30px_rgb(28_70_128_/_0.6)] text-left cursor-pointer [transition:border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] px-5 py-[19px] rounded-[15px] border-solid hover:shadow-[0_18px_38px_-29px_rgb(16_82_174_/_0.62)] hover:[transform:translateY(-2px)] hover:border-[#91baf1] active:[transform:translateY(0)_scale(0.99)] focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] [@media_(max-width:_520px)]:grid-cols-[43px_minmax(0,1fr)_30px] [@media_(max-width:_520px)]:gap-3 [@media_(max-width:_520px)]:min-h-[98px] [@media_(max-width:_520px)]:px-3.5 [@media_(max-width:_520px)]:py-4 motion-reduce:transition-none" type="button" disabled={isSubmitting} onClick={continueWithoutOrganization}>
              <span className="w-12 h-12 grid place-items-center text-[color:var(--onboarding-accent)] [background:#e7f1ff] rounded-[13px] [&_svg]:w-[22px] [@media_(max-width:_520px)]:w-[43px] [@media_(max-width:_520px)]:h-[43px]"><Icon name="user" /></span>
              <span className="[&_strong]:block [&_small]:block [&_strong]:text-[length:15px] [&_strong]:font-[720] [&_small]:max-w-[420px] [&_small]:text-[color:var(--onboarding-muted)] [&_small]:text-[length:11px] [&_small]:leading-normal [&_small]:mt-[5px]">
                <strong>Chưa</strong>
                <small>Tiếp tục với tài khoản cá nhân và thiết lập tổ chức sau.</small>
              </span>
              <span className="w-[34px] h-[34px] grid place-items-center justify-self-end text-[#66809f] [background:#eef3f8] rounded-[10px] text-white [background:var(--onboarding-accent)] [&_svg]:w-[17px] [@media_(max-width:_520px)]:w-[30px] [@media_(max-width:_520px)]:h-[30px]"><Icon name="arrow" /></span>
            </button>

            <button className={`${"w-full min-h-[104px] grid grid-cols-[48px_minmax(0,1fr)_34px] items-center gap-[17px] text-[color:var(--onboarding-ink)] border border-[color:var(--onboarding-line)] [background:#ffffff] shadow-[0_13px_34px_-30px_rgb(28_70_128_/_0.6)] text-left cursor-pointer [transition:border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] px-5 py-[19px] rounded-[15px] border-solid hover:shadow-[0_18px_38px_-29px_rgb(16_82_174_/_0.62)] hover:[transform:translateY(-2px)] hover:border-[#91baf1] active:[transform:translateY(0)_scale(0.99)] focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] [@media_(max-width:_520px)]:grid-cols-[43px_minmax(0,1fr)_30px] [@media_(max-width:_520px)]:gap-3 [@media_(max-width:_520px)]:min-h-[98px] [@media_(max-width:_520px)]:px-3.5 [@media_(max-width:_520px)]:py-4 motion-reduce:transition-none"} ${"[background:#f3f8ff] border-[#a8c9f4]"}`} type="button" onClick={() => setView("create")}>
              <span className="w-12 h-12 grid place-items-center text-[color:var(--onboarding-accent)] [background:#e7f1ff] rounded-[13px] [&_svg]:w-[22px] [@media_(max-width:_520px)]:w-[43px] [@media_(max-width:_520px)]:h-[43px]"><Icon name="building" /></span>
              <span className="[&_strong]:block [&_small]:block [&_strong]:text-[length:15px] [&_strong]:font-[720] [&_small]:max-w-[420px] [&_small]:text-[color:var(--onboarding-muted)] [&_small]:text-[length:11px] [&_small]:leading-normal [&_small]:mt-[5px]">
                <strong>Tạo tổ chức</strong>
                <small>Tạo không gian chung để quản lý hợp đồng cùng đội ngũ.</small>
              </span>
              <span className="w-[34px] h-[34px] grid place-items-center justify-self-end text-[#66809f] [background:#eef3f8] rounded-[10px] text-white [background:var(--onboarding-accent)] [&_svg]:w-[17px] [@media_(max-width:_520px)]:w-[30px] [@media_(max-width:_520px)]:h-[30px]"><Icon name="arrow" /></span>
            </button>
          </div>

          {error && <p className="text-[#ae2f43] text-[length:10px] leading-normal" role="alert">{error}</p>}

          <p className="flex items-center gap-2 text-[#7d8999] text-[length:10px] mt-[22px] [&_svg]:w-[15px] [&_svg]:text-[#54759f]"><Icon name="shield" />Thông tin tổ chức được bảo vệ trong tài khoản của bạn.</p>
        </>
      ) : (
        <>
          <button className="focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] inline-flex items-center gap-2 text-[#5e718a] [background:transparent] [font:inherit] cursor-pointer mb-[34px] p-0 border-0 border-none border-current hover:text-[color:var(--onboarding-accent)] [font-size:11px] [font-weight:650] [&_svg]:w-[15px] [&_svg]:[transform:rotate(180deg)]" type="button" onClick={() => { setView("choice"); setError(""); }}>
            <Icon name="arrow" />Quay lại lựa chọn
          </button>

          <header className="max-w-[570px] [&_h1]:text-[color:var(--onboarding-ink)] [&_h1]:text-[length:clamp(36px,4vw,52px)] [&_h1]:font-[710] [&_h1]:leading-[1.08] [&_h1]:tracking-[-2.1px] [&_h1]:mt-[11px] [&>_p]:last:max-w-[520px] [&>_p]:last:text-[color:var(--onboarding-muted)] [&>_p]:last:text-[length:14px] [&>_p]:last:leading-[1.65] [&>_p]:last:mt-[15px] [&_h1]:[@media_(max-width:_520px)]:text-[length:32px] [&_h1]:[@media_(max-width:_520px)]:tracking-[-1.35px] [&>_p]:[@media_(max-width:_520px)]:last:text-[length:13px]">
            <p className="text-[color:var(--onboarding-accent)] text-[length:11px] font-[740] tracking-[1.1px] uppercase">Không gian làm việc chung</p>
            <h1>Tạo tổ chức của bạn</h1>
            <p>Nhập tên doanh nghiệp hoặc nhóm mà bạn sẽ dùng để rà soát hợp đồng.</p>
          </header>

          <form className="grid gap-3.5 mt-[34px]" onSubmit={createOrganization} noValidate>
            <label className="grid gap-2 text-[#263a56] text-[length:11px] font-[680]" htmlFor="organization-name">
              <span>Tên tổ chức</span>
              <span className={`${"[&:focus-within]:[outline:3px_solid_#9bc2f7] [&:focus-within]:outline-offset-[3px] min-h-[54px] flex items-center border [background:#ffffff] rounded-xl border-solid border-[#cfd9e6] [&>_svg]:w-[19px] [&>_svg]:flex-none [&>_svg]:text-[#73859c] [&>_svg]:ml-4 [&_input]:min-w-0 [&_input]:h-[52px] [&_input]:flex-auto [&_input]:text-[color:var(--onboarding-ink)] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[15px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#8995a6] [&_input]:[font-size:13px] [&_input]:[font-weight:480]"} ${error ? "[background:#fffafb] border-[#c84b5d]" : ""}`}>
                <Icon name="building" />
                <input
                  id="organization-name"
                  name="organizationName"
                  value={name}
                  onChange={(event) => { setName(event.target.value); setError(""); }}
                  placeholder="Ví dụ: Công ty Luật Minh Tâm"
                  autoComplete="organization"
                  maxLength={200}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "organization-error" : undefined}
                  autoFocus
                />
              </span>
            </label>

            {error && <p id="organization-error" className="text-[#ae2f43] text-[length:10px] leading-normal" role="alert">{error}</p>}

            <button className="focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] min-h-[54px] flex items-center justify-between gap-3.5 text-white border border-[color:var(--onboarding-accent-deep)] [background:var(--onboarding-accent-deep)] shadow-[0_15px_28px_-20px_rgb(4_74_169_/_0.78)] [font:inherit] cursor-pointer [transition:transform_180ms_ease,background_180ms_ease] mt-[3px] pl-5 pr-[18px] py-0 rounded-xl border-solid hover:[background:#064dac] hover:[transform:translateY(-1px)] active:[transform:translateY(0)_scale(0.99)] disabled:opacity-[0.72] disabled:cursor-wait disabled:transform-none [font-size:12px] [font-weight:720] [&_svg]:w-[18px] motion-reduce:transition-none" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Đang tạo tổ chức..." : "Tạo tổ chức"}</span>
              {isSubmitting ? <i className="w-[17px] h-[17px] [animation:spin_700ms_linear_infinite] rounded-[50%] border-t-white border-2 border-solid border-[rgb(255_255_255_/_0.45)] motion-reduce:[animation-duration:1.4s]" aria-hidden="true" /> : <Icon name="arrow" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
