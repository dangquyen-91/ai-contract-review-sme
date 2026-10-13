"use client";

import type { LegalSource } from "@/types/legal-sources";
import { Button } from "@/components/ui/button";

export function LegalSourceTable({ sources, deletePending, onDelete }: { sources: LegalSource[]; deletePending: boolean; onDelete: (source: LegalSource) => void }) {
  return (<div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Văn bản / nguồn",
                      "Loại nguồn",
                      "Cơ quan ban hành",
                      "Ngày hiệu lực",
                      "Đoạn tham chiếu",
                      "Thao tác",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-4 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((source) => (
                    <tr key={source._id} className="hover:bg-slate-50/70">
                      <td className="max-w-sm px-5 py-5">
                        <p className="font-medium leading-6">{source.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {source.citationLabel}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <span className="whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          {source.sourceType === "law"
                            ? "Văn bản pháp luật"
                            : "Mẫu hợp đồng"}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-slate-600">
                        {source.issuingBody || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                        {source.effectiveDate &&
                        !Number.isNaN(Date.parse(source.effectiveDate))
                          ? new Intl.DateTimeFormat("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                            }).format(new Date(source.effectiveDate))
                          : "—"}
                      </td>
                      <td className="px-5 py-5 font-mono tabular-nums text-slate-600">
                        {source.chunkCount}
                      </td>
                      <td className="px-5 py-5">
                        <Button variant="default" size="default"
                          type="button"
                          disabled={deletePending}
                          aria-label={`Xóa ${source.title}`}
                          onClick={() => onDelete(source)}
                          
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>);
}
