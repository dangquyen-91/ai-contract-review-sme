import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PasswordRecoverySuccess({ loginHref }: { loginHref: string }) {
  return (
    <>
      <p role="status" className="my-5 text-sm leading-6 text-[#65748b]">
        Mật khẩu đã được cập nhật. Các phiên đăng nhập cũ đã kết thúc. Hãy đăng nhập lại bằng mật khẩu mới.
      </p>
      <Button asChild className="w-full">
        <Link href={loginHref}>Đăng nhập</Link>
      </Button>
    </>
  );
}
