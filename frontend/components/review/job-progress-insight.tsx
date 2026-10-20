export function JobProgressInsight({ row }: { row: readonly string[] }) {
return (
      <section className="mt-6 rounded-xl bg-amber-50 p-5">
        <h3 className="text-sm font-semibold text-amber-950">
          Tiến trình xử lý
        </h3>
        <ol className="mt-3 space-y-3 text-sm text-amber-900/75">
          <li>1. Tiếp nhận tác vụ · {row[4]}</li>
          <li>2. Phân tích hợp đồng · {row[3]}</li>
          <li>3. Kết quả · {row[2]}</li>
        </ol>
        <p className="mt-4 border-t border-amber-200 pt-3 text-xs leading-5 text-amber-800">
          Mã lỗi, nguyên nhân và thao tác xử lý lại sẽ xuất hiện khi có API giám
          sát.
        </p>
      </section>
    );
}
