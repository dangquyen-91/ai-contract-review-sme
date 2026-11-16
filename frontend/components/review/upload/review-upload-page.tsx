"use client";

import type { ComponentProps } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { RecentContractList } from "@/components/contract/recent-contract-list";
import { ContractUploadForm } from "@/components/review/upload/contract-upload-form";
import { DuplicateUploadDialog } from "@/components/review/upload/duplicate-upload-dialog";
import { ReviewAllowanceCard } from "@/components/review/upload/review-allowance-card";
import type { DuplicateUpload } from "@/hooks/review/use-review-workflow";
import type { DashboardData } from "@/types/dashboard";

const nextSteps = [
  { title: "Xác nhận loại hợp đồng", detail: "AI tự nhận diện loại hợp đồng và vai trò của bạn, bạn chỉ cần kiểm tra lại." },
  { title: "AI rà soát", detail: "Tóm tắt, tìm điều khoản rủi ro và trích thông tin chính. Bạn có thể rời trang trong lúc chờ." },
  { title: "Xem kết quả", detail: "Mở trang hợp đồng để đọc rủi ro, hỏi đáp hoặc nhờ chuyên gia kiểm tra." },
];

function NextSteps() {
  return (
    <section aria-labelledby="next-steps-heading" className="rounded-[14px] border border-[#e4e8ef] bg-white p-4">
      <h2 id="next-steps-heading" className="m-0 text-ui-meta font-semibold uppercase tracking-wide text-muted-foreground">Sau khi tải lên</h2>
      <ol className="m-0 mt-3 grid list-none gap-3 p-0">
        {nextSteps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5">
            <span className="grid size-6 place-items-center rounded-full bg-blue-50 text-ui-caption font-bold text-blue-700">{index + 1}</span>
            <span>
              <strong className="block text-ui font-semibold text-[#1f2d44]">{step.title}</strong>
              <span className="mt-0.5 block text-ui-meta leading-5 text-muted-foreground">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NoUploadPermission({ canReview }: { canReview: boolean }) {
  return (
    <div className="flex min-h-[220px] items-center gap-4 p-6 text-ui text-[#607087]">
      <Lock aria-hidden="true" className="size-5 shrink-0" />
      <div>
        <h3 className="m-0 text-ui-section font-semibold">Vai trò của bạn không có quyền tải lên</h3>
        <p className="mb-0 mt-2">
          {canReview ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}
        </p>
      </div>
    </div>
  );
}

export function ReviewUploadPage({ data, access, formProps, duplicateUpload, uploading, onDismissDuplicate, onUploadDuplicate }: {
  data: DashboardData;
  access: { upload: boolean; review: boolean };
  formProps: ComponentProps<typeof ContractUploadForm>;
  duplicateUpload?: DuplicateUpload | null;
  uploading: boolean;
  onDismissDuplicate: () => void;
  onUploadDuplicate: () => void;
}) {
  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-[680px]">
          <p className="m-0 text-ui-caption font-bold uppercase tracking-[1.1px] text-[color:var(--accent)]">AI Contract Review</p>
          <h1 className="mb-0 mt-2 text-[clamp(30px,3vw,40px)] font-bold leading-[1.12] tracking-[-0.035em]">Rà soát hợp đồng mới</h1>
          <p className="mb-0 mt-2.5 text-ui leading-6 text-[color:var(--muted)]">
            Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.
          </p>
        </div>
        <p className="m-0 flex items-center gap-2.5 rounded-[10px] border border-[#d7e9e4] bg-[#f3faf8] px-3 py-2.5 text-ui-meta text-[#2b5c51]">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          Chỉ tài khoản có quyền mới xem được hợp đồng của bạn
        </p>
      </section>
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
          <header className="border-b border-[color:var(--line)] px-5 py-4">
            <h2 className="m-0 text-ui-card font-semibold">Tải hợp đồng</h2>
            <p className="mb-0 mt-1 text-ui-meta text-[color:var(--muted)]">PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p>
          </header>
          {access.upload ? <ContractUploadForm {...formProps} /> : <NoUploadPermission canReview={access.review} />}
        </section>
        <aside className="grid gap-4">
          <ReviewAllowanceCard orgId={data.contractScopeId ?? data.organization.id} role={data.role} />
          <NextSteps />
        </aside>
      </div>
      <div className="mt-6">
        <RecentContractList contracts={data.contracts.slice(0, 5)} />
      </div>
      {duplicateUpload && (
        <DuplicateUploadDialog duplicate={duplicateUpload} busy={uploading} onDismiss={onDismissDuplicate} onUploadAnyway={onUploadDuplicate} />
      )}
    </>
  );
}
