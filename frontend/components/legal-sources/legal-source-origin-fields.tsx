import { legalSourcePublishers } from "@/config/legal-source-display";
import { legalSourceFieldClass as field } from "./legal-source-file-fields";

type OriginDefaults = {
  originPublisher?: string;
  originUrl?: string;
  originRetrievedAt?: string;
  gazette?: string;
};

// Where the legal text was taken from: shown in citations so readers can open the official text.
export function LegalSourceOriginFields({
  defaults = {},
  required = false,
}: {
  defaults?: OriginDefaults;
  required?: boolean;
}) {
  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="mb-1 text-ui font-semibold">Nguồn văn bản</legend>
      <label className="grid gap-2 text-ui">
        Nơi lấy văn bản{required ? " *" : ""}
        <select
          name="originPublisher"
          required={required}
          defaultValue={defaults.originPublisher ?? ""}
          className={field}
        >
          <option value="">Chọn nơi lấy văn bản</option>
          {Object.entries(legalSourcePublishers).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-ui">
        Ngày truy cập
        <input
          name="originRetrievedAt"
          type="date"
          defaultValue={defaults.originRetrievedAt ?? ""}
          className={field}
        />
      </label>
      <label className="grid gap-2 text-ui sm:col-span-2">
        Đường link văn bản{required ? " *" : ""}
        <input
          name="originUrl"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://vbpl.vn/..."
          defaultValue={defaults.originUrl ?? ""}
          className={field}
        />
        <span className="text-ui-meta text-muted-foreground">
          Link tới văn bản gốc của luật hoặc nghị định, hiển thị kèm trích dẫn để người dùng đối chiếu.
        </span>
      </label>
      <label className="grid gap-2 text-ui sm:col-span-2">
        Số Công báo
        <input name="gazette" maxLength={200} defaultValue={defaults.gazette ?? ""} className={field} />
        <span className="text-ui-meta text-muted-foreground">
          Chỉ cần khi văn bản lấy từ Công báo bản in và không có đường link.
        </span>
      </label>
    </fieldset>
  );
}
