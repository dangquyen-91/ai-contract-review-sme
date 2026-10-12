import type * as React from "react";

function Pagination({ className = "", ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="Phân trang" data-slot="pagination" className={`flex w-full justify-center ${className}`} {...props} />;
}

function PaginationContent({ className = "", ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={`flex flex-row items-center gap-1 ${className}`} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({ className = "", isActive = false, type = "button", ...props }: React.ComponentProps<"button"> & { isActive?: boolean }) {
  return <button
    type={type}
    data-slot="pagination-link"
    aria-current={isActive ? "page" : undefined}
    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${isActive ? "border-[#d1def5] bg-[#eaf1ff] font-semibold text-[#2256b6]" : "border-transparent text-[#526178] hover:border-[#dbe3ed] hover:bg-[#f8fafc]"} ${className}`}
    {...props}
  />;
}

function PaginationPrevious({ children = "Trước", className = "", ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Trang trước" className={`gap-1 px-3 ${className}`} {...props}><span aria-hidden="true">‹</span>{children}</PaginationLink>;
}

function PaginationNext({ children = "Sau", className = "", ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Trang sau" className={`gap-1 px-3 ${className}`} {...props}>{children}<span aria-hidden="true">›</span></PaginationLink>;
}

function PaginationEllipsis(props: React.ComponentProps<"span">) {
  return <span data-slot="pagination-ellipsis" aria-hidden="true" className="flex h-9 w-9 items-center justify-center text-[#64748b]" {...props}>…</span>;
}

export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis };
