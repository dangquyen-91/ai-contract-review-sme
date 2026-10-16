"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import type { MemberSubscription } from "@/types/invitations";

export function MemberCapacityDialog({ subscription, onClose, onManage }: {
  subscription?: MemberSubscription; onClose: () => void;
  onManage: (tab: "members" | "invitations") => void;
}) {
  const quota = subscription?.members;
  const pending = quota?.pending ?? 0;
  const planName = subscription ? subscription.plan?.name ?? subscription.plan?.code ?? "Gói miễn phí" : "Gói hiện tại";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-[480px] sm:p-8">
      <DialogHeader className="text-left">
        <span className="mb-2 grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="team" className="size-6" /></span>
        <p className="text-ui-caption font-bold uppercase tracking-wide text-amber-700">Hạn mức thành viên</p>
        <DialogTitle className="text-ui-dialog font-bold">Tổ chức đã hết chỗ</DialogTitle>
        <DialogDescription>{planName}{quota ? ` có ${quota.limit} chỗ, bao gồm Owner` : " đã hết chỗ dành cho thành viên"}. {pending > 0 ? "Thu hồi lời mời đang chờ không còn cần thiết để giải phóng chỗ." : "Bạn cần gói có hạn mức lớn hơn để mời thêm thành viên."}</DialogDescription>
      </DialogHeader>
      {quota && <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <strong className="text-ui-section text-amber-900">{quota.count + pending}/{quota.limit} chỗ đã sử dụng</strong>
        <span className="text-ui-meta text-amber-800">{quota.count} thành viên · {pending} lời mời đang chờ</span>
      </div>}
      <div className="mt-2 flex flex-wrap gap-3">
        {pending > 0
          ? <Button onClick={() => onManage("invitations")}>Quản lý lời mời<Icon name="arrow" /></Button>
          : <Button asChild><Link href="/goi-dich-vu">Xem các gói dịch vụ<Icon name="arrow" /></Link></Button>}
        <Button variant="outline" onClick={onClose}>Đóng</Button>
      </div>
      {pending > 0 && <Link className="inline-flex items-center gap-2 text-ui font-semibold text-primary hover:underline" href="/goi-dich-vu">Xem các gói dịch vụ<Icon name="diagonal" className="size-4" /></Link>}
    </DialogContent>
  </Dialog>;
}
