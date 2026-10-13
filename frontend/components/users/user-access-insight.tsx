export function UserAccessInsight({ row }: { row: readonly string[] }) {
return (
      <section className="mt-6 rounded-xl bg-emerald-50 p-5">
        <h3 className="text-sm font-semibold text-emerald-950">
          Quyền truy cập
        </h3>
        <p className="mt-2 text-sm leading-6 text-emerald-900/75">
          Vai trò {row[2]} thuộc {row[3]}. Khi có API, admin có thể xem lịch sử
          đăng nhập và quyền thực tế trước khi thay đổi trạng thái tài khoản.
        </p>
      </section>
    );
}
