"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import type { MemberSubscription } from "@/types/invitations";

export function MemberCapacityDialog({ subscription, onClose, onManage }: {
  subscription?: MemberSubscription;
  onClose: () => void;
  onManage: (tab: "members" | "invitations") => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quota = subscription?.members;
  const pending = quota?.pending ?? 0;
  const planName = subscription ? subscription.plan?.name ?? subscription.plan?.code ?? "Gói miễn phí" : "Gói hiện tại";

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={dialogRef} className={"fixed [inset:0] m-[auto] w-[min(480px,_calc(100%_-_32px))] max-h-[calc(100dvh_-_32px)] overflow-y-auto [border:1px_solid_#e0e7f0] rounded-[20px] [background:white] p-[30px] text-[#14213d] [font-family:var(--font-geist-sans),_Arial,_sans-serif] shadow-[0_32px_90px_-25px_#06152f] [&::backdrop]:[background:rgb(11_24_48_/_55%)] [&_h2]:m-[0] [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:leading-[1.2] [&_h2]:tracking-[-.035em] [&_>_p:not(.tw-member-capacity-dialog-eyebrow)]:mt-[14px] [&_>_p:not(.tw-member-capacity-dialog-eyebrow)]:text-[#65748b] [&_>_p:not(.tw-member-capacity-dialog-eyebrow)]:text-[14px] [&_>_p:not(.tw-member-capacity-dialog-eyebrow)]:leading-[1.65] [&_:is(a,_button):focus-visible]:[outline:3px_solid_#9bbcf8] [&_:is(a,_button):focus-visible]:[outline-offset:3px] max-[520px]:p-[24px]"} aria-labelledby="capacity-title" aria-describedby="capacity-description"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className={"flex items-start justify-between gap-[16px]"}>
      <span className={"grid w-[48px] h-[48px] place-items-center rounded-[14px] [background:#fff3d9] text-[#99630f] [&_svg]:w-[24px] [&_svg]:h-[24px]"}><Icon name="team" /></span>
      <button type="button" className={"grid w-[32px] h-[32px] place-items-center [border:0] rounded-[8px] [background:transparent] text-[#6b778c] text-[24px] cursor-pointer [&:hover]:[background:#f1f4f8]"} onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
    <p className={"tw-member-capacity-dialog-eyebrow m-[22px_0_8px] text-[#99630f] text-[11px] font-bold tracking-[.08em] uppercase"}>Hạn mức thành viên</p>
    <h2 id="capacity-title">Tổ chức đã hết chỗ</h2>
    <p id="capacity-description">{planName}{quota ? ` có ${quota.limit} chỗ, bao gồm Owner` : " đã hết chỗ dành cho thành viên"}. {pending > 0 ? "Thu hồi lời mời đang chờ không còn cần thiết để giải phóng chỗ." : "Bạn cần gói có hạn mức lớn hơn để mời thêm thành viên."}</p>
    {quota && <div className={"grid gap-[7px] mt-[20px] p-[16px] [border:1px_solid_#f1dfb5] rounded-[12px] [background:#fff9eb] [&_strong]:text-[#775625] [&_strong]:text-[16px] [&_strong]:font-bold [&_span]:text-[#886b3e] [&_span]:text-[13px]"}>
      <strong>{quota.count + pending}/{quota.limit} chỗ đã sử dụng</strong>
      <span>{quota.count} thành viên · {pending} lời mời đang chờ</span>
    </div>}
    <div className={"flex flex-wrap gap-[10px] mt-[24px] [&_:is(button,_a)]:inline-flex [&_:is(button,_a)]:min-h-[44px] [&_:is(button,_a)]:items-center [&_:is(button,_a)]:justify-center [&_:is(button,_a)]:gap-[9px] [&_:is(button,_a)]:rounded-[10px] [&_:is(button,_a)]:p-[10px_16px] [&_:is(button,_a)]:text-[13px] [&_:is(button,_a)]:font-semibold [&_:is(button,_a)]:no-underline [&_:is(button,_a)]:cursor-pointer"}>
      {pending > 0
        ? <button type="button" className={"[border:1px_solid_#2864dc] [background:#2864dc] text-[white] [&:hover]:[background:#1f4fb2] [&_svg]:w-[16px] [&_svg]:h-[16px] max-[520px]:flex-1"} onClick={() => onManage("invitations")}>Quản lý lời mời<Icon name="arrow" /></button>
        : <Link className={"[border:1px_solid_#2864dc] [background:#2864dc] text-[white] [&:hover]:[background:#1f4fb2] [&_svg]:w-[16px] [&_svg]:h-[16px] max-[520px]:flex-1"} href="/goi-dich-vu">Xem các gói dịch vụ<Icon name="arrow" /></Link>}
      <button type="button" className={"[border:1px_solid_#dce4ee] [background:white] text-[#4d5c72] [&:hover]:[background:#f3f7fc]"} onClick={onClose}>Đóng</button>
    </div>
    {pending > 0 && <Link className={"[&_svg]:w-[16px] [&_svg]:h-[16px] inline-flex items-center gap-[7px] mt-[20px] text-[#245bd6] text-[13px] font-semibold no-underline [&:hover]:underline"} href="/goi-dich-vu">Xem các gói dịch vụ <Icon name="diagonal" /></Link>}
  </dialog>;
}
