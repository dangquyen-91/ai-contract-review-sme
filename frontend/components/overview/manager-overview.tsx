import { Button } from "@/components/ui/button";
import { ContractPriorityQueue } from "@/components/contract/contract-priority-queue";
import type { DashboardContract } from "@/types/contracts";
import { Icon } from "@/components/ui/icon";
import { ContractStatusChart } from "@/components/overview/contract-status-chart";
import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";

const metricToneClasses: Record<string, string> = {
  "blue": "[&_.tw-staff-overview-metricIcon]:[background:#eaf2ff] [&_.tw-staff-overview-metricIcon]:text-[#2864dc]",
  "amber": "[&_.tw-staff-overview-metricIcon]:[background:#fff5e6] [&_.tw-staff-overview-metricIcon]:text-[#a86413]",
  "rose": "[&_.tw-staff-overview-metricIcon]:[background:#fff0f2] [&_.tw-staff-overview-metricIcon]:text-[#b43f55]"
};

export function ManagerOverview({ data, onUpload, onViewContracts, onReview, isReviewing }: {
  data: DashboardData;
  onUpload: () => void;
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  onViewContracts: (filter?: DashboardContractFilter) => void;
}) {
  const metrics = [
    { label: "Tổng hợp đồng", value: data.totalContracts, icon: "document" as const, tone: "blue" },
    { label: "Chờ rà soát", value: data.distribution?.statuses.uploaded, icon: "search" as const, tone: "amber" },
    { label: "AI đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "blue" },
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
  ];
  return <div className={"grid gap-[22px] [font-family:var(--font-geist-sans),_Arial,_sans-serif] text-[#14213d] [&_:is(h1,_h2,_h3,_p)]:m-[0] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-[.55] max-[650px]:gap-[15px] motion-reduce:[&_*]:[scroll-behavior:auto] motion-reduce:[&_*]:[transition-duration:.01ms]!"}>
    <section className={"relative flex min-h-[0] items-center overflow-hidden [border:1px_solid_#cbdcf7] rounded-[20px] [background:linear-gradient(112deg,_#eaf2ff_0%,_#f6f9ff_67%,_#e7f5f2_100%)] p-[22px_28px] shadow-[0_22px_45px_-40px_#284d80] [&::after]:absolute [&::after]:right-[-78px] [&::after]:top-[-105px] [&::after]:w-[330px] [&::after]:h-[330px] [&::after]:[border:1px_solid_#bad1f2] [&::after]:rounded-[50%] [&::after]:[content:''] [&_h1]:max-w-[700px] [&_h1]:mt-[12px] [&_h1]:text-[clamp(26px,_2.4vw,_32px)] [&_h1]:font-bold [&_h1]:tracking-[-.04em] [&_h1]:leading-[1.14] [&_p]:max-w-[550px] [&_p]:mt-[13px] [&_p]:text-[#576b87] [&_p]:text-[14px] [&_p]:leading-[1.65] max-[820px]:p-[28px] max-[650px]:min-h-[0] max-[650px]:p-[25px_21px] max-[650px]:[&_h1]:text-[29px]"} aria-labelledby="manager-heading">
      <div className={"relative z-[1] max-w-[720px] max-[820px]:max-w-[640px]"}>
        <span className={"text-[#245bd6] text-[12px] font-bold tracking-[.035em]"}>Không gian quản lý · {data.organization.name}</span>
        <h1 id="manager-heading">Tổng quan công việc</h1>
        <p>Theo dõi tình trạng xử lý của tổ chức và những rủi ro cần đội ngũ chú ý.</p>
        <div className={"flex flex-wrap gap-[10px] mt-[16px] max-[650px]:[&_>_button]:w-[100%]"}>
          <Button variant="outline" size="default" type="button"  onClick={() => onViewContracts({ riskLevel: "high" })}><Icon name="shield" className={"w-[17px] h-[17px]"} />Kiểm tra rủi ro cao</Button>
          <Button variant="default" size="default" type="button"  onClick={onUpload}><Icon name="upload" className={"w-[17px] h-[17px]"} />Tải hợp đồng mới</Button>
        </div>
      </div>
    </section>
    <section className={`grid gap-[15px] max-[650px]:grid-cols-[1fr] max-[650px]:gap-[10px] grid-cols-[repeat(4,_minmax(0,_1fr))] [&_>_button]:p-[19px_16px] [&_>_button]:gap-[12px] [&_>_button]:text-left [&_>_button]:text-[inherit] [&_>_button:hover]:[border-color:#a9c5f4] [&_>_button:hover]:[background:#f5f9ff] max-[1200px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[650px]:grid-cols-[1fr]`} aria-label="Thống kê hợp đồng toàn tổ chức">
      {metrics.map((item) => <button type="button" onClick={() => onViewContracts(item.label === "Chờ rà soát" ? { status: "uploaded" } : item.label === "AI đang xử lý" ? { status: "processing" } : item.label === "Rủi ro cao" ? { riskLevel: "high" } : {})} key={item.label} className={`flex min-h-[115px] items-center gap-[17px] [border:1px_solid_#e1e8f2] rounded-[16px] [background:#fff] p-[20px_22px] shadow-[0_12px_26px_-25px_#4b668b] [&_p]:text-[#62728a] [&_p]:text-[13px] [&_p]:font-semibold [&_strong]:block [&_strong]:mt-[3px] [&_strong]:text-[29px] [&_strong]:font-bold [&_strong]:tracking-[-.04em] [&_strong]:leading-[1.1] max-[650px]:min-h-[86px] max-[650px]:p-[14px_17px] max-[650px]:[&_strong]:text-[25px] ${metricToneClasses[item.tone]}`}><span className={"tw-staff-overview-metricIcon grid w-[48px] h-[48px] flex-none place-items-center rounded-[13px] [&_svg]:w-[22px] [&_svg]:h-[22px] max-[650px]:w-[42px] max-[650px]:h-[42px]"}><Icon name={item.icon} /></span><div><p>{item.label}</p><strong>{item.value?.toLocaleString("vi-VN") ?? "—"}</strong></div></button>)}
    </section>
    <ContractPriorityQueue orgId={data.organization.id} role="manager" onReview={onReview} onViewContracts={onViewContracts} isReviewing={isReviewing} />
    <div className={"grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_>_section]:h-[100%] [&_>_section]:flex [&_>_section]:flex-col [&_>_section_>_p:last-child]:mt-[auto]! [&_>_section_>_p:last-child]:pt-[16px] max-[950px]:grid-cols-[1fr]"}>
      <ContractStatusChart data={data} expertMode={false} onFilter={onViewContracts} />
      <ContractStatusChart data={data} expertMode onFilter={onViewContracts} />
    </div>
    <details className={"[border:1px_solid_#e1e8f2] rounded-[18px] [background:white] p-[24px] shadow-[0_18px_35px_-34px_#4b668b] block [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:tracking-[-.02em] [&_h2]:mt-[14px] [&_p]:mt-[7px] [&_p]:text-[#708099] [&_p]:text-[13px] [&_p]:leading-[1.6] [&_summary]:cursor-pointer [&_summary]:text-[14px] [&_summary]:font-semibold [&[open]_dl]:mt-[20px] [&_dl]:grid [&_dl]:gap-[15px] [&_dl]:content-center [&_dt]:text-[#708099] [&_dt]:text-[12px] [&_dd]:m-[5px_0_0] [&_dd]:wrap-anywhere [&_dd]:text-[14px] [&_dd]:font-semibold max-[650px]:grid-cols-[1fr] max-[650px]:p-[20px]"} aria-labelledby="manager-org-heading">
      <summary id="manager-org-heading">Thông tin tổ chức · {data.organization.name}</summary>
      <dl><div><dt>Mã số thuế</dt><dd>{data.organization.taxCode || "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{data.organization.address || "Chưa cập nhật"}</dd></div></dl>
      <p className={"col-[1_/_-1] pt-[16px] [border-top:1px_solid_#e9eef5]"}>Thông tin tổ chức và lời mời thành viên do Owner quản lý.</p>
    </details>
  </div>;
}
