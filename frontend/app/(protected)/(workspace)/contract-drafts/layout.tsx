import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

export default async function DraftLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();
  if (user.role !== "user" && (!user.orgId || !["owner", "staff"].includes(user.role))) notFound();
  return children;
}
