import type { DashboardContract } from "@/types/contracts";

type ReviewBillingNoticeProps = {
  billing: NonNullable<DashboardContract["reviewBilling"]>;
  available?: number;
  blocked: boolean;
};

export function ReviewBillingNotice({
  billing,
  available,
  blocked,
}: ReviewBillingNoticeProps) {
  return (
    <p
      role="status"
      className="my-3 rounded-lg bg-accent p-3 text-ui leading-6"
    >
      {!billing.ready ? (
        billing.reason
      ) : (
        <>
          Tài liệu có <strong>{billing.pageCount} trang</strong>, cần{" "}
          <strong>{billing.units} lượt rà soát</strong>.
          {available !== undefined && (
            <>
              {" "}
              Bạn còn {available} lượt.{blocked && " Chưa đủ hạn mức để chạy."}
            </>
          )}
        </>
      )}
    </p>
  );
}
