"use client";
import { Icon } from "@/components/ui/icon";

export function SectionTableFilters({ title, query, status, secondary, extra, sortDescending, statuses, secondaryLabel, secondaryOptions, extraLabel, extraOptions, onQueryChange, onStatusChange, onSecondaryChange, onExtraChange, onSortChange }: {
  title: string;
  query: string;
  status: string;
  secondary: string;
  extra: string;
  sortDescending: boolean;
  statuses: string[];
  secondaryLabel: string;
  secondaryOptions: string[];
  extraLabel: string;
  extraOptions: string[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onExtraChange: (value: string) => void;
  onSortChange: (descending: boolean) => void;
}) {
  return <div className="flex flex-wrap gap-2">
            <label className="relative">
              <span className="sr-only">
                Tìm kiếm {title.toLowerCase()}
              </span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => {
                  onQueryChange(event.target.value);
                }}
                placeholder="Tìm kiếm..."
                className="min-h-10 w-52 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label>
              <span className="sr-only">Lọc theo trạng thái</span>
              <select
                value={status}
                onChange={(event) => {
                  onStatusChange(event.target.value);
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả trạng thái</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">
                Lọc theo {secondaryLabel.toLowerCase()}
              </span>
              <select
                value={secondary}
                onChange={(event) => {
                  onSecondaryChange(event.target.value);
                }}
                className="min-h-10 max-w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả {secondaryLabel.toLowerCase()}</option>
                {secondaryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sắp xếp theo tên hoặc mã</span>
              <select
                value={sortDescending ? "desc" : "asc"}
                onChange={(event) => {
                  onSortChange(event.target.value === "desc");
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="asc">Tên / mã A–Z</option>
                <option value="desc">Tên / mã Z–A</option>
              </select>
            </label>
            <label>
              <span className="sr-only">
                Lọc theo {extraLabel.toLowerCase()}
              </span>
              <select
                value={extra}
                onChange={(event) => {
                  onExtraChange(event.target.value);
                }}
                className="min-h-10 max-w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả {extraLabel.toLowerCase()}</option>
                {extraOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>;
}
