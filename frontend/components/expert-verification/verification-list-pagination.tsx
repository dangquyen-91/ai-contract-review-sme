import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function VerificationListPagination({
  total,
  page,
  pages,
  limit,
  label,
  unit,
  disabled,
  onPage,
}: {
  total: number;
  page: number;
  pages: number;
  limit: number;
  label: string;
  unit: string;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  const visiblePages = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <p
        role="status"
        className="m-0 text-xs leading-5 tabular-nums text-[#6b778a]"
      >
        Hiển thị{" "}
        <strong className="font-semibold text-[#4c5c73]">
          {first}–{last}
        </strong>{" "}
        trong số {total} {unit}
      </p>
      <Pagination aria-label={label} className="w-auto justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={disabled || page <= 1}
              onClick={() => onPage(page - 1)}
              className="text-xs"
            />
          </PaginationItem>
          <PaginationItem className="px-2 text-xs tabular-nums text-[#6b778a] sm:hidden">
            Trang {page}/{pages}
          </PaginationItem>
          {visiblePages.map((value, index) => (
            <PaginationItem key={value} className="hidden items-center sm:flex">
              {index > 0 && value - visiblePages[index - 1] > 1 && (
                <PaginationEllipsis className="w-6" />
              )}
              <PaginationLink
                aria-label={`Trang ${value}`}
                isActive={value === page}
                disabled={disabled}
                onClick={() => onPage(value)}
                className="text-xs"
              >
                {value}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={disabled || page >= pages}
              onClick={() => onPage(page + 1)}
              className="text-xs"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
