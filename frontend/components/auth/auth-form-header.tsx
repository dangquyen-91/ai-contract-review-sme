import Link from "next/link";

export function AuthFormHeader({
  isRegister,
  invited,
  inviteQuery,
}: {
  isRegister: boolean;
  invited: boolean;
  inviteQuery: string;
}) {
  return (
    <>
      {" "}
      <nav
        className="w-fit grid grid-cols-[1fr_1fr] gap-[3px] border [background:#f4f6f9] p-[3px] rounded-[11px] border-solid border-[#e0e6ef] [&_a]:min-w-[92px] [&_a]:text-[#718097] [&_a]:text-center [&_a]:[text-decoration:none] [&_a]:text-[length:11px] [&_a]:font-[650] [&_a]:px-[13px] [&_a]:py-2 [&_a]:rounded-lg [&_a]:aria-[current=page]:text-[#11203c] [&_a]:aria-[current=page]:[background:#fff] [&_a]:aria-[current=page]:shadow-[0_2px_7px_#19365f12] [@media_(max-width:_480px)]:w-full [&_a]:[@media_(max-width:_480px)]:min-w-0"
        aria-label="Chọn hình thức truy cập"
      >
        <Link
          href={`/dang-nhap${inviteQuery}`}
          aria-current={!isRegister ? "page" : undefined}
        >
          Đăng nhập
        </Link>
        <Link
          href={`/dang-ky${inviteQuery}`}
          aria-current={isRegister ? "page" : undefined}
        >
          Đăng ký
        </Link>
      </nav>
      <header className="mt-[26px] [&_h1]:text-[#0b1530] [&_h1]:text-[length:clamp(32px,3.3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.6px] [&_h1]:mt-2 [&>_p]:last:text-[#69788e] [&>_p]:last:text-[length:13px] [&>_p]:last:leading-[1.6] [&>_p]:last:mt-2.5 [&_h1]:[@media_(max-width:_840px)]:text-[length:33px] [@media_(max-width:_480px)]:mt-[23px] [&_h1]:[@media_(max-width:_480px)]:text-[length:30px]">
        <p className="text-[#0870f6] text-[length:10px] font-[720] tracking-[1.3px] uppercase">
          {isRegister ? "Bắt đầu với LawScan" : "Chào mừng trở lại"}
        </p>
        <h1>
          {isRegister ? "Tạo tài khoản LawScan" : "Đăng nhập vào LawScan"}
        </h1>
        <p>
          {invited
            ? "Dùng đúng email nhận lời mời để tiếp tục tham gia tổ chức."
            : isRegister
              ? "Đăng ký tài khoản để bắt đầu sử dụng LawScan."
              : "Tiếp tục công việc rà soát hợp đồng của bạn."}
        </p>
      </header>
    </>
  );
}
export function AuthFormFooter({
  isRegister,
  inviteQuery,
}: {
  isRegister: boolean;
  inviteQuery: string;
}) {
  return (
    <>
      {" "}
      <p className="text-[#748196] text-center text-[length:11px] mt-5 [&_a]:text-[#0868ed] [&_a]:font-bold [&_a]:[text-decoration:none] [&_a]:hover:[text-decoration:underline] [&_a]:hover:underline-offset-[3px]">
        {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <Link href={`${isRegister ? "/dang-nhap" : "/dang-ky"}${inviteQuery}`}>
          {isRegister ? "Đăng nhập" : "Tạo tài khoản"}
        </Link>
      </p>
      <p className="max-w-[390px] text-[#929cab] text-center text-[length:8px] leading-[1.6] mt-5 mb-0 mx-auto">
        {isRegister
          ? "LawScan chỉ dùng thông tin trên để tạo và bảo vệ tài khoản của bạn."
          : "AI hỗ trợ rà soát sơ bộ và không thay thế tư vấn pháp lý chuyên nghiệp."}
      </p>
    </>
  );
}
