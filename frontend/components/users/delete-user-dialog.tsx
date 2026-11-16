"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useDeleteManagedUser } from "@/hooks/users/use-user-management";
import type { ManagedUser } from "@/types/user-management";

export function DeleteUserDialog({ user, close, deleted }: {
  user: ManagedUser;
  close: () => void;
  deleted: () => void;
}) {
  const mutation = useDeleteManagedUser();
  const lock = useRef(false);

  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    try {
      await mutation.mutateAsync(user.id);
      toast.success("Đã xóa tài khoản người dùng.");
      deleted();
    } catch {
      // Keep the dialog open and display the backend error for retry.
    } finally {
      lock.current = false;
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !lock.current) close(); }}>
    <DialogContent busy={mutation.isPending}>
      <DialogTitle>Xóa tài khoản người dùng?</DialogTitle>
      <DialogDescription>
        Tài khoản {user.name} ({user.email}) sẽ không thể đăng nhập và không còn xuất hiện trong danh sách người dùng.
        Dữ liệu hợp đồng và lịch sử liên quan được giữ lại. Giao diện hiện không hỗ trợ khôi phục tài khoản đã xóa.
      </DialogDescription>
      {mutation.isError && <p role="alert" className="break-words text-sm text-destructive">{mutation.error.message}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={mutation.isPending} onClick={close}>Hủy</Button>
        <Button variant="destructive" loading={mutation.isPending} onClick={() => void confirm()}>
          <Trash2 aria-hidden="true" />Xác nhận xóa
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
