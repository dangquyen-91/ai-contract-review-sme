"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/api/client";
import { clearSessionCache } from "@/lib/session-cache";
import { workspacePath } from "@/lib/workspace-path";
import type { AuthSession } from "@/types/auth";
import type { ReceivedInvitation } from "@/types/invitations";

const labels = { staff: "Nhân viên", manager: "Quản lý", expert: "Chuyên viên rà soát" };
export function ReceivedInvitations() {
  const client = useQueryClient();
  const router = useRouter();
  const locked = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const query = useQuery({ queryKey: ["received-invitations"], queryFn: () => apiRequest<ReceivedInvitation[]>({ url: "/invitations/received" }), retry: false, refetchInterval: 60_000 });
  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      if (action === "accept") {
        const session = await apiRequest<AuthSession>({ url: "/invitations/accept", method: "POST", data: { invitationId: id } });
        setNavigating(true);
        await clearSessionCache(client);
        toast.success("Đã tham gia tổ chức");
        router.replace(workspacePath(session.user));
        router.refresh();
      } else {
        await apiRequest({ url: "/invitations/received", method: "POST", data: { invitationId: id } });
        await query.refetch();
        toast.success("Đã từ chối lời mời");
      }
    },
  });
  async function respond(id: string, action: "accept" | "decline") {
    if (locked.current || navigating) return;
    locked.current = true;
    try { await mutation.mutateAsync({ id, action }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể xử lý lời mời."); setNavigating(false); locked.current = false; }
    finally { if (action === "decline") locked.current = false; }
  }
  if (query.isLoading) return <p role="status" className="mb-6 text-sm text-muted-foreground">Đang kiểm tra lời mời…</p>;
  if (query.error) return <div role="alert" className="mb-6 rounded-xl border bg-white p-4 text-sm">Chưa thể tải lời mời từ tổ chức. <Button variant="link" onClick={() => void query.refetch()}>Thử lại</Button></div>;
  if (!query.data?.length) return null;
  const busy = mutation.isPending || navigating;
  return <section aria-label="Lời mời từ tổ chức" className="mb-8 space-y-3">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon name="mail" className="h-5 w-5 text-blue-600" />Lời mời từ tổ chức <span className="text-sm text-muted-foreground">({query.data.length})</span></h2>
    {query.data.map((invite) => <article key={invite.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div><p className="font-semibold">{invite.organizationName} mời bạn tham gia</p><p className="mt-1 text-sm text-muted-foreground">Vai trò: {labels[invite.role]} · Hết hạn {new Intl.DateTimeFormat("vi-VN").format(new Date(invite.expiresAt))}</p></div>
      <div className="flex gap-2"><Button disabled={busy} onClick={() => void respond(invite.id, "accept")}>Chấp nhận</Button><Button variant="outline" disabled={busy} onClick={() => void respond(invite.id, "decline")}>Từ chối</Button></div>
    </article>)}
  </section>;
}
