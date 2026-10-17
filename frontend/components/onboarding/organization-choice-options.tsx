"use client";

import { Icon } from "@/components/ui/icon";

export function OrganizationChoiceOptions({ isSubmitting, error, onContinue, onCreate }: { isSubmitting: boolean; error: string; onContinue: () => void; onCreate: () => void }) {
  return (
        <>
          <header className="max-w-[570px] [&_h1]:text-[color:var(--onboarding-ink)] [&_h1]:text-[length:clamp(36px,4vw,52px)] [&_h1]:font-[710] [&_h1]:leading-[1.08] [&_h1]:tracking-[-2.1px] [&_h1]:mt-[11px] [&>_p]:last:max-w-[520px] [&>_p]:last:text-[color:var(--onboarding-muted)] [&>_p]:last:text-[length:14px] [&>_p]:last:leading-[1.65] [&>_p]:last:mt-[15px] [&_h1]:[@media_(max-width:_520px)]:text-[length:32px] [&_h1]:[@media_(max-width:_520px)]:tracking-[-1.35px] [&>_p]:[@media_(max-width:_520px)]:last:text-[length:13px]">
            <p className="text-[color:var(--onboarding-accent)] text-[length:11px] font-[740] tracking-[1.1px] uppercase">Bước thiết lập cuối cùng</p>
            <h1>Bạn đã thuộc công ty nào chưa?</h1>
            <p>Chọn cách bạn muốn bắt đầu. Bạn vẫn có thể cập nhật thông tin tổ chức sau.</p>
          </header>

          <div className="grid gap-[13px] mt-[38px] [@media_(max-width:_520px)]:mt-[29px]" role="group" aria-label="Chọn trạng thái tổ chức">
            <button className="w-full min-h-[104px] grid grid-cols-[48px_minmax(0,1fr)_34px] items-center gap-[17px] text-[color:var(--onboarding-ink)] border border-[color:var(--onboarding-line)] [background:#ffffff] shadow-[0_13px_34px_-30px_rgb(28_70_128_/_0.6)] text-left cursor-pointer [transition:border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] px-5 py-[19px] rounded-[15px] border-solid hover:shadow-[0_18px_38px_-29px_rgb(16_82_174_/_0.62)] hover:[transform:translateY(-2px)] hover:border-[#91baf1] active:[transform:translateY(0)_scale(0.99)] focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] [@media_(max-width:_520px)]:grid-cols-[43px_minmax(0,1fr)_30px] [@media_(max-width:_520px)]:gap-3 [@media_(max-width:_520px)]:min-h-[98px] [@media_(max-width:_520px)]:px-3.5 [@media_(max-width:_520px)]:py-4 motion-reduce:transition-none" type="button" disabled={isSubmitting} onClick={onContinue}>
              <span className="w-12 h-12 grid place-items-center text-[color:var(--onboarding-accent)] [background:#e7f1ff] rounded-[13px] [&_svg]:w-[22px] [@media_(max-width:_520px)]:w-[43px] [@media_(max-width:_520px)]:h-[43px]"><Icon name="user" /></span>
              <span className="[&_strong]:block [&_small]:block [&_strong]:text-[length:15px] [&_strong]:font-[720] [&_small]:max-w-[420px] [&_small]:text-[color:var(--onboarding-muted)] [&_small]:text-[length:11px] [&_small]:leading-normal [&_small]:mt-[5px]">
                <strong>Chưa</strong>
                <small>Tiếp tục với tài khoản cá nhân và thiết lập tổ chức sau.</small>
              </span>
              <span className="w-[34px] h-[34px] grid place-items-center justify-self-end text-[#66809f] [background:#eef3f8] rounded-[10px] text-white [background:var(--onboarding-accent)] [&_svg]:w-[17px] [@media_(max-width:_520px)]:w-[30px] [@media_(max-width:_520px)]:h-[30px]"><Icon name="arrow" /></span>
            </button>

            <button className={`${"w-full min-h-[104px] grid grid-cols-[48px_minmax(0,1fr)_34px] items-center gap-[17px] text-[color:var(--onboarding-ink)] border border-[color:var(--onboarding-line)] [background:#ffffff] shadow-[0_13px_34px_-30px_rgb(28_70_128_/_0.6)] text-left cursor-pointer [transition:border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] px-5 py-[19px] rounded-[15px] border-solid hover:shadow-[0_18px_38px_-29px_rgb(16_82_174_/_0.62)] hover:[transform:translateY(-2px)] hover:border-[#91baf1] active:[transform:translateY(0)_scale(0.99)] focus-visible:[outline:3px_solid_#9bc2f7] focus-visible:outline-offset-[3px] [@media_(max-width:_520px)]:grid-cols-[43px_minmax(0,1fr)_30px] [@media_(max-width:_520px)]:gap-3 [@media_(max-width:_520px)]:min-h-[98px] [@media_(max-width:_520px)]:px-3.5 [@media_(max-width:_520px)]:py-4 motion-reduce:transition-none"} ${"[background:#f3f8ff] border-[#a8c9f4]"}`} type="button" disabled={isSubmitting} onClick={() => onCreate()}>
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
      );
}
