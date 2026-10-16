import { Button } from "@/components/ui/button";
import { QuickContractUpload } from "@/components/contract/quick-contract-upload";
import { Icon } from "@/components/ui/icon";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";
import { ContractPriorityQueue } from "@/components/contract/contract-priority-queue";
import { ContractStatusChart } from "@/components/overview/contract-status-chart";

const metricToneClasses: Record<string, string> = {
  "blue": "[&_.tw-staff-overview-metricIcon]:[background:#eaf2ff] [&_.tw-staff-overview-metricIcon]:text-[#2864dc]",
  "amber": "[&_.tw-staff-overview-metricIcon]:[background:#fff5e6] [&_.tw-staff-overview-metricIcon]:text-[#a86413]",
  "rose": "[&_.tw-staff-overview-metricIcon]:[background:#fff0f2] [&_.tw-staff-overview-metricIcon]:text-[#b43f55]"
};

export function StaffOverview({
  data,
  onUpload,
  onViewContracts,
  onReview,
  isReviewing,
  reviewerMode = false,
  onQuickUpload,
}: {
  data: DashboardData;
  onUpload: () => void;
  onViewContracts: (filter?: DashboardContractFilter) => void;
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  reviewerMode?: boolean;
  onQuickUpload?: (file: File) => void;
}) {
  const headingId = reviewerMode ? "reviewer-heading" : "staff-heading";
  const overview = reviewerMode ? [
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
    { label: "Đã rà soát bằng AI", value: data.stats.reviewed, icon: "check" as const, tone: "blue" },
    { label: "AI đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "amber" },
  ] : [
    { label: "Hợp đồng", value: data.totalContracts, icon: "document" as const, tone: "blue" },
    { label: "Đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "amber" },
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
  ];

  return (
    <div className={"grid gap-[22px] [font-family:var(--font-geist-sans),_Arial,_sans-serif] text-[#14213d] [&_:is(h1,_h2,_h3,_p)]:m-[0] [&_button:not([data-slot=button])]:[font:inherit] [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button]):disabled]:cursor-wait [&_button:not([data-slot=button]):disabled]:opacity-[.55] max-[650px]:gap-[15px] motion-reduce:[&_*]:[scroll-behavior:auto] motion-reduce:[&_*]:[transition-duration:.01ms]!"}>
      <section className={"relative flex min-h-[0] items-center overflow-hidden [border:1px_solid_#cbdcf7] rounded-[20px] [background:linear-gradient(112deg,_#eaf2ff_0%,_#f6f9ff_67%,_#e7f5f2_100%)] p-[22px_28px] shadow-[0_22px_45px_-40px_#284d80] [&::after]:absolute [&::after]:right-[-78px] [&::after]:top-[-105px] [&::after]:w-[330px] [&::after]:h-[330px] [&::after]:[border:1px_solid_#bad1f2] [&::after]:rounded-[50%] [&::after]:[content:''] [&_h1]:max-w-[700px] [&_h1]:mt-[12px] [&_h1]:text-[clamp(26px,_2.4vw,_32px)] [&_h1]:font-bold [&_h1]:tracking-[-.04em] [&_h1]:leading-[1.14] [&_p]:max-w-[550px] [&_p]:mt-[13px] [&_p]:text-[#576b87] [&_p]:text-[14px] [&_p]:leading-[1.65] max-[820px]:p-[28px] max-[650px]:min-h-[0] max-[650px]:p-[25px_21px] max-[650px]:[&_h1]:text-[29px]"} aria-labelledby={headingId}>
        <div className={"relative z-[1] max-w-[720px] max-[820px]:max-w-[640px]"}>
          <span className={"text-[#245bd6] text-[12px] font-bold tracking-[.035em]"}>{reviewerMode ? "Không gian chuyên viên rà soát" : "Không gian nhân viên"} · {data.organization.name}</span>
          <h1 id={headingId}>{reviewerMode ? "Kiểm tra rủi ro hợp đồng" : "Không gian làm việc"}</h1>
          <p>{reviewerMode ? "Xem kết quả AI, đối chiếu căn cứ pháp lý và chỉnh sửa đề xuất cho hợp đồng của tổ chức." : "Tải hợp đồng, theo dõi kết quả rà soát và ưu tiên những rủi ro cần xem xét."}</p>
          <div className={"flex flex-wrap gap-[10px] mt-[16px] max-[650px]:[&_>_button]:w-[100%]"}>
            <Button variant="default" size="default" type="button"  onClick={reviewerMode ? () => onViewContracts({ riskLevel: "high", status: "reviewed" }) : onUpload} disabled={reviewerMode && isReviewing}>
              <Icon name={reviewerMode ? "shield" : "upload"} className={"w-[17px] h-[17px]"} /> {reviewerMode ? "Kiểm tra rủi ro cao" : "Tải hợp đồng mới"}
            </Button>
            <Button variant="outline" size="default" type="button"  onClick={() => onViewContracts()}>
              Xem hợp đồng <Icon name="arrow" className={"w-[17px] h-[17px]"} />
            </Button>
          </div>
        </div>
        <div className={"absolute right-[62px] bottom-[0] grid w-[215px] h-[235px] place-items-center max-[1160px]:right-[20px] max-[1160px]:opacity-[.55] max-[820px]:hidden"} aria-hidden="true">
          <span className={"absolute w-[178px] h-[178px] [border:20px_solid_#d4e5fb] rounded-[50%] opacity-[.7]"} />
          <div className={"relative flex w-[132px] h-[166px] flex-col gap-[12px] [transform:rotate(8deg)] [border:1px_solid_#c7d8f2] rounded-[12px_12px_4px_4px] [background:#fff] p-[23px_17px] shadow-[0_23px_33px_-20px_#5374a6] [&_>_svg]:w-[25px] [&_>_svg]:h-[25px] [&_>_svg]:text-[#245bd6] [&_>_span]:w-[100%] [&_>_span]:h-[6px] [&_>_span]:rounded-[5px] [&_>_span]:[background:#e4ebf5] [&_>_span:nth-of-type(2)]:w-[77%] [&_>_span:nth-of-type(3)]:w-[91%]"}>
            <Icon name="document" />
            <span /><span /><span />
            <div className={"absolute right-[-19px] bottom-[16px] grid w-[52px] h-[52px] place-items-center [border:5px_solid_#e9f8f2] rounded-[50%] [background:#16a472] text-[#fff] [&_svg]:w-[23px] [&_svg]:h-[23px]"}><Icon name="check" /></div>
          </div>
        </div>
      </section>

      {!reviewerMode && onQuickUpload && <QuickContractUpload onSelect={onQuickUpload} />}
      <section className={"grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[15px] max-[650px]:grid-cols-[1fr] max-[650px]:gap-[10px]"} aria-label="Tình trạng hợp đồng của tổ chức">
        {overview.map((item) => (
          <article className={`flex min-h-[115px] items-center gap-[17px] [border:1px_solid_#e1e8f2] rounded-[16px] [background:#fff] p-[20px_22px] shadow-[0_12px_26px_-25px_#4b668b] [&_p]:text-[#62728a] [&_p]:text-[13px] [&_p]:font-semibold [&_strong]:block [&_strong]:mt-[3px] [&_strong]:text-[29px] [&_strong]:font-bold [&_strong]:tracking-[-.04em] [&_strong]:leading-[1.1] max-[650px]:min-h-[86px] max-[650px]:p-[14px_17px] max-[650px]:[&_strong]:text-[25px] ${metricToneClasses[item.tone]}`} key={item.label}>
            <span className={"tw-staff-overview-metricIcon grid w-[48px] h-[48px] flex-none place-items-center rounded-[13px] [&_svg]:w-[22px] [&_svg]:h-[22px] max-[650px]:w-[42px] max-[650px]:h-[42px]"}><Icon name={item.icon} /></span>
            <div><p>{item.label}</p><strong>{item.value.toLocaleString("vi-VN")}</strong></div>
          </article>
        ))}
      </section>

      <div className={"flex flex-wrap gap-[8px] [&_button:not([data-slot=button])]:min-h-[36px] [&_button:not([data-slot=button])]:[border:1px_solid_#dce5f2] [&_button:not([data-slot=button])]:rounded-[20px] [&_button:not([data-slot=button])]:p-[6px_13px] [&_button:not([data-slot=button])]:[background:#fff] [&_button:not([data-slot=button])]:text-[#536881] [&_button:not([data-slot=button])]:text-[12px] [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button]):hover]:[border-color:#a9c5f4] [&_button:not([data-slot=button]):hover]:[background:#eaf2ff] [&_button:not([data-slot=button]):hover]:text-[#245bd6] [&_button:not([data-slot=button])[aria-pressed=true]]:[border-color:#a9c5f4] [&_button:not([data-slot=button])[aria-pressed=true]]:[background:#eaf2ff] [&_button:not([data-slot=button])[aria-pressed=true]]:text-[#245bd6]"} aria-label="Lọc nhanh hợp đồng">
        {reviewerMode ? <>
          <Button variant="outline" size="sm" type="button" onClick={() => onViewContracts({ riskLevel: "high" })}>Rủi ro cao · {data.stats.highRisk}</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => onViewContracts({ status: "reviewed" })}>Đã có kết quả · {data.stats.reviewed}</Button>
        </> : <Button variant="outline" size="sm" type="button" onClick={() => onViewContracts({ status: "uploaded" })}>Chờ rà soát · {data.distribution?.statuses.uploaded ?? "—"}</Button>}
        <Button variant="outline" size="sm" type="button" onClick={() => onViewContracts({ status: "processing" })}>AI đang xử lý · {data.stats.processing}</Button>
      </div>
      <div className={"grid grid-cols-[minmax(0,_1.2fr)_minmax(280px,_.8fr)] gap-[20px] items-start max-[1100px]:grid-cols-[1fr]"}>
        <ContractPriorityQueue orgId={data.organization.id} role={reviewerMode ? "reviewer" : "staff"} onReview={onReview} onViewContracts={onViewContracts} isReviewing={isReviewing} />
        <ContractStatusChart data={data} reviewerMode={reviewerMode} onFilter={onViewContracts} />
      </div>

    </div>
  );
}
