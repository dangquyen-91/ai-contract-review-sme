"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReviewCostPrompt } from "@/lib/review/confirm-review-cost";

export function ReviewCostConfirmationDialog({ details, onConfirm, onCancel }: {
  details: ReviewCostPrompt;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className="gap-0 p-0 font-sans sm:max-w-[500px]"
        onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}
      >
        <DialogHeader className="p-5 pr-12 text-left sm:p-6 sm:pr-12">
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle className="text-ui-dialog leading-7">Xác nhận lượt rà soát</DialogTitle>
          <DialogDescription className="break-words text-ui leading-6 [overflow-wrap:anywhere]">
            Kiểm tra lượt sử dụng trước khi AI rà soát “{details.contractTitle}”.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 rounded-xl border border-[#e4e8ef] bg-[#f8faff] p-4 text-ui [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-semibold [&_dt]:text-muted-foreground">
            <dt>Độ dài hợp đồng</dt>
            <dd>{details.pageCount ?? "—"} trang</dd>
            <dt>Lượt dùng từ gói</dt>
            <dd className="text-primary">{details.prepaid ? 0 : details.units} lượt</dd>
            {!details.prepaid && (
              <>
                <dt>Lượt hiện có</dt>
                <dd>{details.available} lượt</dd>
              </>
            )}
          </dl>
          {details.prepaid ? (
            <p className="mb-0 mt-4 text-ui leading-6 text-muted-foreground">
              Phiên bản này đã được thanh toán riêng. Lần rà soát này không trừ lượt trong gói.
            </p>
          ) : (
            <div className="mt-4 text-ui leading-6 text-muted-foreground">
              <p className="m-0">Mỗi 5 trang tương ứng 1 lượt rà soát.</p>
              <p className="mb-0 mt-1">Chỉ trừ khi hoàn tất; lỗi hoặc hủy sẽ hoàn lượt.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-border p-5 sm:px-6 sm:py-4 max-sm:[&>button]:flex-1">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>Hủy</Button>
          <Button onClick={onConfirm}>
            <Sparkles aria-hidden="true" className="size-4" />
            Bắt đầu rà soát
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
