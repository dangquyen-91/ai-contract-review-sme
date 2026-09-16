import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

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
  icons: { icon: "/lawscan.svg", shortcut: "/lawscan.svg" },
  description: "Trợ lý AI hỗ trợ doanh nghiệp rà soát sơ bộ hợp đồng mua bán và dịch vụ tiếng Việt: hiểu điều khoản, phát hiện rủi ro và đối chiếu nguồn tham chiếu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
