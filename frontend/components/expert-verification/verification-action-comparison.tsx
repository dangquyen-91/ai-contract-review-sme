import { issueDisplay } from "@/config/issue-display";
import { ChevronDown } from "lucide-react";
import { verificationSnapshotChanges } from "@/lib/review/verification-findings";
import type {
  VerificationAction,
  VerificationFindingInput,
} from "@/types/verification-workspace";

function SnapshotValue({
  field,
  snapshot,
}: {
  field: keyof VerificationFindingInput;
  snapshot?: Partial<VerificationFindingInput> | null;
}) {
  const value = snapshot?.[field];
  if (value === undefined || value === null)
    return <p className="mb-0 mt-1 text-muted-foreground">Không có dữ liệu.</p>;
  if (Array.isArray(value))
    return value.length ? (
      <ul className="mb-0 mt-1 list-disc space-y-1 pl-4">
        {value.map((point, index) => (
          <li
            key={index}
            className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          >
            {point}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mb-0 mt-1 text-muted-foreground">Không có nội dung.</p>
    );
  const label =
    field === "checkGroup"
      ? (issueDisplay[value as keyof typeof issueDisplay]?.label ?? value)
      : value;
  return (
    <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {label}
    </p>
  );
}

export function VerificationActionComparison({
  action,
}: {
  action: VerificationAction;
}) {
  const changes = verificationSnapshotChanges(action.before, action.after);
  if (!action.before && !action.after)
    return (
      <p className="mb-0 mt-3 text-xs leading-5 text-[#8792a2]">
        Chưa có nội dung được lưu để đối chiếu cho thao tác này.
      </p>
    );
  if (!changes.length)
    return (
      <p className="mb-0 mt-3 text-xs leading-5 text-[#8792a2]">
        Nội dung vấn đề không thay đổi trong thao tác này.
      </p>
    );
  return (
    <details className="group/comparison mt-4 rounded-lg border border-[#e5eaf1] bg-[#fafbfd] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-xs font-semibold leading-5 text-[#315eac] focus-visible:outline-2 focus-visible:outline-[#315eac] [&::-webkit-details-marker]:hidden">
        <span>
          {action.action === "add"
            ? "Xem nội dung bổ sung"
            : action.action === "remove"
              ? "Xem nội dung đã xóa"
              : "Xem thay đổi trước / sau"}{" "}
          <span className="font-normal text-[#8792a2]">
            ({changes.length} mục)
          </span>
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 transition-transform group-open/comparison:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      {action.action === "add" && (
        <p className="mb-0 mt-3 text-xs leading-5 text-[#7a8698]">
          Vấn đề mới do chuyên gia bổ sung.
        </p>
      )}
      {action.action === "remove" && (
        <p className="mb-0 mt-3 text-xs leading-5 text-[#7a8698]">
          Vấn đề bổ sung đã bị xóa. Nội dung trước thao tác được giữ lại để đối
          chiếu.
        </p>
      )}
      <div className="mt-3 space-y-4">
        {changes.map(({ key, label }) => (
          <section key={key}>
            <h4 className="m-0 text-xs font-semibold text-[#526782]">
              {label}
            </h4>
            <div
              className={`mt-2 grid gap-2 text-sm leading-6 ${action.action !== "add" && action.action !== "remove" ? "md:grid-cols-2" : ""}`}
            >
              {action.action !== "add" && (
                <div className="min-w-0 rounded-lg border border-[#e5eaf1] bg-white p-3">
                  <p className="m-0 text-[11px] font-semibold text-[#8792a2]">
                    Trước
                  </p>
                  <SnapshotValue field={key} snapshot={action.before} />
                </div>
              )}
              {action.action !== "remove" && (
                <div className="min-w-0 rounded-lg border border-[#dce7f7] bg-[#f2f6fd] p-3 text-[#345681]">
                  <p className="m-0 text-[11px] font-semibold">Sau</p>
                  <SnapshotValue field={key} snapshot={action.after} />
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
