"use client";

import type { LegalSource } from "@/types/legal-sources";
import { Button } from "@/components/ui/button";

export function LegalSourceDeleteConfirmation({ source, pending, error, onConfirm, onCancel }: { source: LegalSource; pending: boolean; error: string; onConfirm: () => void; onCancel: () => void }) {
  return (<section
          aria-labelledby="delete-source-title"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <h2 id="delete-source-title" className="font-semibold text-red-900">
            Xóa nguồn pháp lý?
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-900">
            Nguồn “{source.title}” và các đoạn tham chiếu của nguồn sẽ bị xóa
            khỏi kho. Không thể hoàn tác thao tác này.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Button variant="destructive" size="default"
              type="button"
              disabled={pending}
              onClick={onConfirm}
              
            >
              {pending ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
            <Button variant="outline" size="default"
              type="button"
              disabled={pending}
              onClick={onCancel}
              
            >
              Hủy
            </Button>
          </div>
        </section>);
}
