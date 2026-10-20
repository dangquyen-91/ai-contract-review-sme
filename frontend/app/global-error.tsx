"use client";

import { StatusPage } from "@/components/feedback/status-page";
import "@/styles/globals.css";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="vi">
      <head><title>Đã có lỗi xảy ra | LawScan</title></head>
      <body><StatusPage kind="error" onRetry={retry} /></body>
    </html>
  );
}
