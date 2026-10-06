import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function CTASection() {
  return (
    <section className="[padding-block:42px] [background:radial-gradient(ellipse_at_80%_100%,#d8e9ff88,transparent_60%),linear-gradient(90deg,#f8fafc,#f1f6fc)] [border-top:1px_solid_#e8eef6] [&_h2]:text-[length:clamp(30px,3.2vw,45px)] [&_h2]:leading-[1.3] [&_h2]:tracking-[-1.4px] [&_h2]:font-[730] [&_h2_span]:relative [&_h2_span]:inline-block [&_h2_span]:after:content-[''] [&_h2_span]:after:absolute [&_h2_span]:after:w-full [&_h2_span]:after:h-[9px] [&_h2_span]:after:[border:solid_var(--ls-blue)] [&_h2_span]:after:[transform:rotate(-2deg)] [&_h2_span]:after:rounded-[50%] [&_h2_span]:after:left-0 [&_h2_span]:after:-bottom-2 [&_h2_span::after]:[border-width:4px_0_0] [@media_(max-width:_600px)]:[padding-block:30px] [&_h2]:[@media_(max-width:_600px)]:text-[length:31px] [&_h2]:[@media_(max-width:_600px)]:leading-[1.4] [&_h2]:[@media_(max-width:_600px)]:tracking-[-1px]">
      <div className="w-[min(1380px,calc(100%_-_112px))] [margin-inline:auto] [@media_(max-width:_1199px)]:w-[calc(100%_-_64px)] [@media_(max-width:_600px)]:w-[calc(100%_-_40px)] flex flex-wrap items-center justify-between gap-6">
        <div className="flex-[1_1_560px] max-w-[720px] [&>_p]:max-w-[620px] [&>_p]:text-[#64738c] [&>_p]:text-[length:15px] [&>_p]:leading-[1.65] [&>_p]:mt-3 [&>_p]:[@media_(max-width:_600px)]:text-[length:13px] [&>_p]:[@media_(max-width:_600px)]:mt-2.5">
          <h2>Bắt đầu từ <span>một điều khoản.</span></h2>
          <p>Xem cách LawScan làm rõ rủi ro, giải thích lý do và gợi ý bước kiểm tra tiếp theo.</p>
        </div>
        <Link href="/bao-cao-mau" className="inline-flex justify-center items-center gap-[15px] min-h-[52px] [background:var(--ls-blue)] text-[white] border border-[color:var(--ls-blue)] font-[550] text-center [text-decoration:none] [transition:background-color_0.2s,color_0.2s,border-color_0.2s,box-shadow_0.25s,transform_0.25s] px-[25px] py-3 rounded-[9px] border-solid hover:text-[white] hover:[background:#0054d4] hover:[transform:translateY(-1px)] hover:border-[#0054d4] min-w-[124px] rounded-[13px] min-h-16 text-[length:19px] py-4 rounded-xl [@media_(hover:_hover)_and_(pointer:_fine)]:hover:[transform:translateY(-3px)] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_10px_24px_-10px_#0066ff80] [@media_(max-width:_1199px)]:text-[length:16px] [@media_(max-width:_1199px)]:[padding-inline:18px] [@media_(max-width:_1199px)]:min-h-[54px] [@media_(max-width:_600px)]:text-[length:16px] [@media_(max-width:_600px)]:text-[length:14px] [@media_(max-width:_600px)]:mt-2 motion-reduce:hover:transform-none">Xem báo cáo mẫu <Icon name="diagonal" width="19" /></Link>
      </div>
    </section>
  );
}
