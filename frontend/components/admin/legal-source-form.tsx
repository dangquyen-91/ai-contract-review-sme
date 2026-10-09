"use client";

import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api/client";

const field =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-blue-600";

export function LegalSourceForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const body = new FormData(event.currentTarget);
    const file = body.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("Vui lòng chọn tài liệu có nội dung.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Tệp không được vượt quá 20 MB.");
      return;
    }
    if (
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(file.type)
    ) {
      setError("Vui lòng chọn PDF, DOCX hoặc TXT.");
      return;
    }
    for (const key of [
      "title",
      "citationLabel",
      "issuingBody",
      "effectiveDate",
    ]) {
      const value = String(body.get(key) ?? "").trim();
      if (!value && (key === "issuingBody" || key === "effectiveDate"))
        body.delete(key);
      else body.set(key, value);
    }
    if (String(body.get("title")).length < 2 || !body.get("citationLabel")) {
      setError("Nhập tên nguồn ít nhất 2 ký tự và mã trích dẫn.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await apiClient.post("/admin/legal-sources", body, { timeout: 190000 });
      onSaved();
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "Không thể thêm nguồn pháp lý."} Nếu yêu cầu bị gián đoạn, hãy kiểm tra danh sách trước khi gửi lại.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Thêm nguồn pháp lý</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Tải văn bản để trích xuất nội dung và bổ sung nguồn tham chiếu cho AI.
      </p>
      <fieldset
        disabled={pending}
        className="mt-5 grid gap-4 disabled:opacity-60 sm:grid-cols-2"
      >
        <label className="grid gap-2 text-sm">
          Tên nguồn *
          <input
            autoFocus
            name="title"
            required
            minLength={2}
            maxLength={300}
            className={field}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Loại nguồn *
          <select name="sourceType" className={field}>
            <option value="law">Văn bản pháp luật</option>
            <option value="standard_template">Mẫu hợp đồng</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          Mã trích dẫn *
          <input
            name="citationLabel"
            required
            maxLength={100}
            placeholder="Ví dụ: 91/2015/QH13"
            className={field}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Cơ quan ban hành
          <input name="issuingBody" maxLength={200} className={field} />
        </label>
        <label className="grid gap-2 text-sm">
          Ngày hiệu lực
          <input name="effectiveDate" type="date" className={field} />
        </label>
        <label className="grid gap-2 text-sm">
          Tài liệu *
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.docx,.txt"
            className="block w-full rounded-lg border border-slate-200 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1"
          />
          <span className="text-xs text-slate-500">
            PDF, DOCX hoặc TXT · Tối đa 20 MB
          </span>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}
      {pending && (
        <p role="status" className="mt-4 text-sm text-blue-700">
          Đang tải và xử lý tài liệu. Vui lòng giữ trang mở.
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          disabled={pending}
          type="submit"
          className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Đang xử lý…" : "Thêm nguồn"}
        </button>
        <button
          disabled={pending}
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
