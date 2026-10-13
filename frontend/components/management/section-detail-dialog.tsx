"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailInsight } from "./detail-insight";
import type { SectionConfig, ManagementSectionId } from "@/types/management";

export function SectionDetailDialog({ selected, section, config, previousFocusRef, onClose }: {
  selected: readonly string[]; section: ManagementSectionId; config: SectionConfig;
  previousFocusRef: RefObject<HTMLElement | null>; onClose: () => void;
}) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-[680px] sm:p-8" showCloseButton={false}
      onCloseAutoFocus={(event) => {
        if (previousFocusRef.current) { event.preventDefault(); previousFocusRef.current.focus(); }
      }}>
      <div className="flex items-start justify-between gap-4">
        <DialogHeader className="text-left">
          <p className="text-ui-caption font-semibold uppercase tracking-wide text-primary">{config.title} · Bản xem trước</p>
          <DialogTitle>{selected[0]}</DialogTitle>
          <DialogDescription>Thông tin chi tiết minh họa cho giao diện quản trị.</DialogDescription>
        </DialogHeader>
        <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-5 rounded-xl border border-border bg-muted p-5 sm:grid-cols-2">
        {config.columns.map((column, index) => <div key={column} className="min-w-0">
          <dt className="text-ui-meta font-medium text-muted-foreground">{column}</dt>
          <dd className="mt-1 break-words text-ui font-semibold">{selected[index]}</dd>
        </div>)}
      </dl>
      <DetailInsight section={section} row={selected} />
      <p className="text-ui-meta leading-5 text-muted-foreground">Dữ liệu minh họa · Chưa có thao tác quản trị qua API.</p>
    </DialogContent>
  </Dialog>;
}
