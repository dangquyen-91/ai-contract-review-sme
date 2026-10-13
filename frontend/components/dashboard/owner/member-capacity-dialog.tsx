"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import type { MemberSubscription } from "@/types/invitations";
import styles from "./member-capacity-dialog.module.css";

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

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="capacity-title" aria-describedby="capacity-description"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className={styles.heading}>
      <span className={styles.icon}><Icon name="team" /></span>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
    <p className={styles.eyebrow}>Hạn mức thành viên</p>
    <h2 id="capacity-title">Tổ chức đã hết chỗ</h2>
    <p id="capacity-description">{planName}{quota ? ` có ${quota.limit} chỗ, bao gồm Owner` : " đã hết chỗ dành cho thành viên"}. {pending > 0 ? "Thu hồi lời mời đang chờ không còn cần thiết để giải phóng chỗ." : "Bạn cần gói có hạn mức lớn hơn để mời thêm thành viên."}</p>
    {quota && <div className={styles.quota}>
      <strong>{quota.count + pending}/{quota.limit} chỗ đã sử dụng</strong>
      <span>{quota.count} thành viên · {pending} lời mời đang chờ</span>
    </div>}
    <div className={styles.actions}>
      {pending > 0
        ? <button type="button" className={styles.primary} onClick={() => onManage("invitations")}>Quản lý lời mời<Icon name="arrow" /></button>
        : <Link className={styles.primary} href="/goi-dich-vu">Xem các gói dịch vụ<Icon name="arrow" /></Link>}
      <button type="button" className={styles.secondary} onClick={onClose}>Đóng</button>
    </div>
    {pending > 0 && <Link className={styles.plans} href="/goi-dich-vu">Xem các gói dịch vụ <Icon name="diagonal" /></Link>}
  </dialog>;
}
