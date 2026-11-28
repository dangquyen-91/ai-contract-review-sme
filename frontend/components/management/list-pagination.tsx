import { Button } from "@/components/ui/button";
import styles from "@/styles/user_management/user-management.module.css";

/** "Hiển thị 1–20 trong 54 <unit>" with previous/next buttons, under a paginated list. */
export function ListPagination({
  page,
  total,
  limit,
  totalPages,
  busy,
  unit,
  label,
  note,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  totalPages: number;
  busy: boolean;
  /** What is counted, e.g. "giao dịch". */
  unit: string;
  /** Accessible name of the page navigation. */
  label: string;
  /** Extra text after the count, e.g. how often the list refreshes. */
  note?: string;
  onPageChange: (page: number) => void;
}) {
  const count = (value: number) => value.toLocaleString("vi-VN");
  return (
    <footer className={styles.footer}>
      <p role="status">
        {total > 0 ? (
          <>
            Hiển thị{" "}
            <strong>
              {count((page - 1) * limit + 1)}–{count(Math.min(page * limit, total))}
            </strong>{" "}
            trong <strong>{count(total)}</strong> {unit}
            {note ? ` · ${note}` : ""}
          </>
        ) : (
          `0 ${unit}`
        )}
      </p>
      <nav aria-label={label} className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => onPageChange(page - 1)}>
          Trước
        </Button>
        <span>
          Trang {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages || busy} onClick={() => onPageChange(page + 1)}>
          Sau
        </Button>
      </nav>
    </footer>
  );
}
