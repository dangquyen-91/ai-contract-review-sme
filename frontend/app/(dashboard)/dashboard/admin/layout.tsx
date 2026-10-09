import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | LawScan",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getAdminSession();
  } catch {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 font-sans text-slate-800">
        <section className="max-w-md rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold">Chưa thể mở trang quản trị</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Không thể xác minh phiên đăng nhập lúc này. Vui lòng thử tải lại
            trang.
          </p>
          <Link
            href="/dashboard/admin"
            className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-3 text-sm text-white"
          >
            Thử lại
          </Link>
        </section>
      </main>
    );
  }
  if (!session) redirect("/dang-nhap");
  if (session.role !== "administrator") {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 font-sans text-slate-800">
        <section className="max-w-md">
          <h1 className="text-2xl font-semibold">
            Bạn không có quyền truy cập
          </h1>
          <p className="mt-3 text-slate-600">
            Không gian này chỉ dành cho quản trị viên hệ thống.
          </p>
          <Link className="mt-5 inline-block text-blue-700 underline" href="/">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }
  return <AdminShell name={session.name}>{children}</AdminShell>;
}
