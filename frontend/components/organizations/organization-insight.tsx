export function OrganizationInsight({ row }: { row: readonly string[] }) {
return (
      <section className="mt-6 rounded-xl bg-blue-50 p-5">
        <h3 className="text-sm font-semibold text-blue-950">
          Theo dõi tổ chức
        </h3>
        <p className="mt-2 text-sm leading-6 text-blue-900/75">
          Chủ sở hữu: {row[2]}. Trạng thái hiện tại: {row[3].toLowerCase()}.{" "}
          {row[3] === "Cần xác minh"
            ? "Bước tiếp theo là kiểm tra thông tin pháp lý và người đại diện."
            : "Khi có API, nơi này sẽ hiển thị thành viên, gói dịch vụ và mức sử dụng."}
        </p>
      </section>
    );
}
