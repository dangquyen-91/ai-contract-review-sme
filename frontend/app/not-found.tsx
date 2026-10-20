import type { Metadata } from "next";
import { StatusPage } from "@/components/feedback/status-page";

export const metadata: Metadata = { title: "Không tìm thấy trang | LawScan" };

export default function NotFound() {
  return <StatusPage kind="not-found" />;
}
