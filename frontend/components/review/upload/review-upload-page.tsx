"use client";

import type { ComponentProps } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { RecentContractList } from "@/components/contract/recent-contract-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
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
    <Card role="region" aria-labelledby="next-steps-heading" className="gap-3 p-4">
      <h2 id="next-steps-heading" className="m-0 text-ui-meta font-semibold uppercase tracking-wide text-muted-foreground">Sau khi tải lên</h2>
      <ol className="m-0 grid list-none gap-3 p-0">
        {nextSteps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5">
            <span className="grid size-6 place-items-center rounded-full bg-accent text-ui-caption font-bold text-primary">{index + 1}</span>
            <span>
              <strong className="block text-ui font-semibold text-foreground">{step.title}</strong>
              <span className="mt-0.5 block text-ui-meta leading-5 text-muted-foreground">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function NoUploadPermission({ canReview }: { canReview: boolean }) {
  return (
    <div className="flex min-h-[220px] items-center gap-4 text-ui text-muted-foreground">
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
      <PageHeading
        eyebrow="AI Contract Review"
        title="Rà soát hợp đồng mới"
        description="Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa."
        actions={
          <Badge variant="success" className="h-auto gap-2 whitespace-normal px-3 py-2 text-ui-meta">
            <ShieldCheck aria-hidden="true" className="size-4!" />
            Chỉ tài khoản có quyền mới xem được hợp đồng của bạn
          </Badge>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-ui-card">Tải hợp đồng</CardTitle>
            <CardDescription className="text-ui-meta">PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</CardDescription>
          </CardHeader>
          {access.upload ? <ContractUploadForm {...formProps} /> : <CardContent className="py-6"><NoUploadPermission canReview={access.review} /></CardContent>}
        </Card>
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
