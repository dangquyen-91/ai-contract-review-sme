"use client";

import { Icon } from "@/components/ui/icon";
import type { FormEvent } from "react";

export function OrganizationCreateForm({ name, error, isSubmitting, setupCompleted, onNameChange, onSubmit, onBack }: { name: string; error: string; isSubmitting: boolean; setupCompleted: boolean; onNameChange: (name: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  return (
        <>
          <button className="focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] inline-flex items-center gap-2 text-[#5e718a] [background:transparent] [font:inherit] cursor-pointer mb-[34px] p-0 border-0 border-none border-current hover:text-[color:var(--onboarding-accent)] [font-size:11px] [font-weight:650] [&_svg]:w-[15px] [&_svg]:[transform:rotate(180deg)]" type="button" disabled={isSubmitting || setupCompleted} onClick={() => { onBack(); }}>
            <Icon name="arrow" />Quay lại lựa chọn
          </button>

          <header className="max-w-[570px] [&_h1]:text-[color:var(--onboarding-ink)] [&_h1]:text-[length:clamp(36px,4vw,52px)] [&_h1]:font-[710] [&_h1]:leading-[1.08] [&_h1]:tracking-[-2.1px] [&_h1]:mt-[11px] [&>_p]:last:max-w-[520px] [&>_p]:last:text-[color:var(--onboarding-muted)] [&>_p]:last:text-[length:14px] [&>_p]:last:leading-[1.65] [&>_p]:last:mt-[15px] [&_h1]:[@media_(max-width:_520px)]:text-[length:32px] [&_h1]:[@media_(max-width:_520px)]:tracking-[-1.35px] [&>_p]:[@media_(max-width:_520px)]:last:text-[length:13px]">
            <p className="text-[color:var(--onboarding-accent)] text-[length:11px] font-[740] tracking-[1.1px] uppercase">Không gian làm việc chung</p>
            <h1>Tạo tổ chức của bạn</h1>
            <p>Nhập tên doanh nghiệp hoặc nhóm mà bạn sẽ dùng để rà soát hợp đồng.</p>
          </header>

          <form className="grid gap-3.5 mt-[34px]" onSubmit={onSubmit} noValidate>
            <label className="grid gap-2 text-[#263a56] text-[length:11px] font-[680]" htmlFor="organization-name">
              <span>Tên tổ chức</span>
              <span className={`${"[&:focus-within]:[outline:3px_solid_#9bc2f7] [&:focus-within]:outline-offset-[3px] min-h-[54px] flex items-center border [background:#ffffff] rounded-xl border-solid border-[#cfd9e6] [&>_svg]:w-[19px] [&>_svg]:flex-none [&>_svg]:text-[#73859c] [&>_svg]:ml-4 [&_input]:min-w-0 [&_input]:h-[52px] [&_input]:flex-auto [&_input]:text-[color:var(--onboarding-ink)] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:px-[15px] [&_input]:py-0 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input]:placeholder:text-[#8995a6] [&_input]:[font-size:13px] [&_input]:[font-weight:480]"} ${error ? "[background:#fffafb] border-[#c84b5d]" : ""}`}>
                <Icon name="building" />
                <input
                  id="organization-name"
                  name="organizationName"
                  value={name}
                  onChange={(event) => { onNameChange(event.target.value); }}
                  placeholder="Ví dụ: Công ty Luật Minh Tâm"
                  autoComplete="organization"
                  maxLength={200}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "organization-error" : undefined}
                  disabled={isSubmitting || setupCompleted}
                  autoFocus
                />
              </span>
            </label>

            {error && <p id="organization-error" className="text-[#ae2f43] text-[length:10px] leading-normal" role="alert">{error}</p>}

            <button className="focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] min-h-[54px] flex items-center justify-between gap-3.5 text-white border border-[color:var(--onboarding-accent-deep)] [background:var(--onboarding-accent-deep)] shadow-[0_15px_28px_-20px_rgb(4_74_169_/_0.78)] [font:inherit] cursor-pointer [transition:transform_180ms_ease,background_180ms_ease] mt-[3px] pl-5 pr-[18px] py-0 rounded-xl border-solid hover:[background:#064dac] hover:[transform:translateY(-1px)] active:[transform:translateY(0)_scale(0.99)] disabled:opacity-[0.72] disabled:cursor-wait disabled:transform-none [font-size:12px] [font-weight:720] [&_svg]:w-[18px] motion-reduce:transition-none" type="submit" disabled={isSubmitting}>
              <span>{setupCompleted ? (isSubmitting ? "Đang hoàn tất thiết lập..." : "Hoàn tất thiết lập") : (isSubmitting ? "Đang tạo tổ chức..." : "Tạo tổ chức")}</span>
              {isSubmitting ? <i className="w-[17px] h-[17px] [animation:spin_700ms_linear_infinite] rounded-[50%] border-t-white border-2 border-solid border-[rgb(255_255_255_/_0.45)] motion-reduce:[animation-duration:1.4s]" aria-hidden="true" /> : <Icon name="arrow" />}
            </button>
          </form>
        </>
      );
}
