export function AuditEventInsight({ row }: { row: readonly string[] }) {
return (
    <section className="mt-6 rounded-xl bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-900">Dấu vết quản trị</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {row[0]} thực hiện “{row[1]}” với {row[2]}. Kết quả:{" "}
        {row[3].toLowerCase()}. Khi có API, nơi này sẽ có mã sự kiện và thông
        tin thay đổi trước/sau.
      </p>
    </section>
  );
}
