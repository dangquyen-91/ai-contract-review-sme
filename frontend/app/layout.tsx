import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { AppToaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/providers/query-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LawScan — Nhìn rõ rủi ro. Trước khi bạn ký.",
  icons: { icon: "/logo-transparent.png", shortcut: "/logo-transparent.png" },
  description: "Trợ lý AI hỗ trợ doanh nghiệp rà soát sơ bộ hợp đồng mua bán và dịch vụ tiếng Việt: hiểu điều khoản, phát hiện rủi ro và đối chiếu nguồn tham chiếu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased [--background:#ffffff] [--foreground:#171717] dark:[--background:#0a0a0a] dark:[--foreground:#ededed]`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground [font-family:Arial,Helvetica,sans-serif]">
        <NuqsAdapter>
          <QueryProvider>{children}</QueryProvider>
        </NuqsAdapter>
        <AppToaster />
      </body>
    </html>
  );
}
