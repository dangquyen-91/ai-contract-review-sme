"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getUserRoleLabel } from "@/lib/user-role";
import { useManagedUser, useSaveManagedUser } from "@/hooks/use-user-management";
import type { ManagedUser, ManagedUserRole } from "@/types/user-management";

const selectClass = "h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";
type EditorProps = { user: ManagedUser | null; close: () => void; saved: () => void };

export function UserEditor(props: EditorProps) {
  return props.user ? <ExistingUserEditor {...props} id={props.user.id} /> : <UserEditorForm {...props} />;
}

function ExistingUserEditor({ id, close, saved }: EditorProps & { id: string }) {
  const detail = useManagedUser(id);
  if (detail.data && !detail.isError) return <UserEditorForm user={detail.data} close={close} saved={saved} />;
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent>
    <DialogTitle>Thông tin người dùng</DialogTitle>
    <DialogDescription>{detail.isError ? "Chưa thể tải thông tin tài khoản." : "Đang tải thông tin tài khoản…"}</DialogDescription>
    {detail.isError && <p role="alert" className="text-sm text-destructive">{detail.error.message}</p>}
    <DialogFooter><Button variant="outline" onClick={close}>Đóng</Button>{detail.isError && <Button onClick={() => void detail.refetch()}>Thử lại</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}

function UserEditorForm({ user, close, saved }: { user: ManagedUser | null; close: () => void; saved: () => void }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<ManagedUserRole>(user?.role ?? "user");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");
  const mutation = useSaveManagedUser();
  function submit(event: FormEvent) {
    event.preventDefault();
    const data = { name: name.trim(), email: email.trim(), role, isActive };
    const onSuccess = () => { toast.success(user ? "Đã cập nhật người dùng." : "Đã tạo người dùng."); saved(); close(); };
    if (user) mutation.mutate({ id: user.id, data }, { onSuccess });
    else if (role === "user" || role === "administrator") mutation.mutate({ data: { ...data, role, password } }, { onSuccess });
  }
  const options: ManagedUserRole[] = !user || ["user", "administrator"].includes(user.role) ? ["user", "administrator"] : user.role === "owner" ? ["owner"] : ["manager", "staff", "expert"];
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close(); }}><DialogContent busy={mutation.isPending}>
    <DialogTitle>{user ? "Thông tin người dùng" : "Thêm người dùng"}</DialogTitle>
    <DialogDescription>{user ? "Cập nhật thông tin và quyền truy cập tài khoản." : "Tạo tài khoản cá nhân hoặc quản trị viên. Thành viên tổ chức được thêm qua lời mời của tổ chức."} Tài khoản mới hoặc đổi email cần xác minh email khi đăng nhập.</DialogDescription>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={mutation.isPending} className="space-y-4">
      <label className="block space-y-2 text-sm"><span>Họ tên</span><Input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
      <label className="block space-y-2 text-sm"><span>Email</span><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      {!user && <label className="block space-y-2 text-sm"><span>Mật khẩu (tối thiểu 12 ký tự, tối đa 72 byte)</span><Input required type="password" minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>}
      <label className="block space-y-2 text-sm"><span>Vai trò</span><select className={`${selectClass} w-full`} value={role} onChange={(event) => setRole(event.target.value as ManagedUserRole)}>{options.map((code) => <option key={code} value={code}>{getUserRoleLabel(code)}</option>)}</select></label>
      {user && <p className="text-sm text-muted-foreground">Tổ chức: {user.organization?.name ?? "Chưa có tổ chức"}<br />Ngày tạo: {new Date(user.createdAt).toLocaleDateString("vi-VN")}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />Cho phép tài khoản hoạt động</label>
    </fieldset>
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{Object.values(mutation.error.details ?? {}).flat().join("; ") || mutation.error.message}</p>}
    <DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Hủy</Button><Button type="submit" loading={mutation.isPending}>{user ? "Lưu thay đổi" : "Tạo người dùng"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
