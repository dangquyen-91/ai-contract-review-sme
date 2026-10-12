import type * as React from "react";

function Table({ className = "", ...props }: React.ComponentProps<"table">) {
  return <div data-slot="table-container" className="relative w-full overflow-x-auto"><table data-slot="table" className={`w-full caption-bottom text-sm ${className}`} {...props} /></div>;
}

function TableHeader({ className = "", ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={`[&_tr]:border-b [&_tr]:border-[#e7ebf1] ${className}`} {...props} />;
}

function TableBody({ className = "", ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={`[&_tr:last-child]:border-0 ${className}`} {...props} />;
}

function TableRow({ className = "", ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={`border-b border-[#e7ebf1] transition-colors hover:bg-[#f8fafc] ${className}`} {...props} />;
}

function TableHead({ className = "", ...props }: React.ComponentProps<"th">) {
  return <th data-slot="table-head" className={`h-11 px-5 text-left align-middle font-semibold whitespace-nowrap text-[#64748b] ${className}`} {...props} />;
}

function TableCell({ className = "", ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={`px-5 py-3 align-middle ${className}`} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
