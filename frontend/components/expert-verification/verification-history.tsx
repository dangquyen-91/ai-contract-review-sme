import type { VerificationAction } from "@/types/verification-workspace";
import { verificationDate } from "@/lib/review/verification-display";
import { VerificationActionComparison } from "./verification-action-comparison";

const actions = { confirm: "Xác nhận rủi ro", adjust: "Điều chỉnh rủi ro", reject: "Bác bỏ rủi ro", add: "Bổ sung rủi ro", remove: "Xóa rủi ro bổ sung" };

export function VerificationHistory({ history }: { history: VerificationAction[] }) {
  return (
    <details className="rounded-lg border border-border bg-card p-4 text-ui">
      <summary className="cursor-pointer font-semibold text-primary">Lịch sử thao tác ({history.length})</summary>
      {!history.length ? <p className="mb-0 mt-3 text-muted-foreground">Chưa có thao tác xác minh.</p> : <ol className="mb-0 mt-3 max-h-80 list-none space-y-3 overflow-y-auto p-0">
        {[...history].reverse().map((action) => (
          <li key={action._id} className="border-b border-border pb-3 last:border-0">
            <p className="m-0 font-medium">{actions[action.action]} · Lần gửi {action.attempt}</p>
            <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{verificationDate(action.createdAt)}{typeof action.expertId === "object" ? ` · ${action.expertId.name}` : ""}</p>
            {(action.after?.title || action.before?.title) && <p className="mb-0 mt-1 break-words">{action.after?.title || action.before?.title}</p>}
            {action.reason && <p className="mb-0 mt-1 whitespace-pre-wrap break-words">{action.reason}</p>}
            <VerificationActionComparison action={action} />
          </li>
        ))}
      </ol>}
    </details>
  );
}
