"use client";

import { StatusPage } from "@/components/feedback/status-page";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <><title>Đã có lỗi xảy ra | LawScan</title><StatusPage kind="error" onRetry={retry} /></>;
}
