import type { VerificationQueueItem } from "@/types/verification-workspace";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
export function filterVerificationQueue(
  items: VerificationQueueItem[],
  search: string,
  type: string,
  sort: "oldest" | "newest",
) {
  const query = normalize(search.trim());
  return items
    .filter(
      (item) =>
        (!query || normalize(item.contractId?.title ?? "").includes(query)) &&
        (!type || item.contractId?.type === type),
    )
    .sort((left, right) => {
      const a = Date.parse(left.requestedAt),
        b = Date.parse(right.requestedAt);
      const time = (Number.isFinite(a) ? a : 0) - (Number.isFinite(b) ? b : 0);
      return (
        (time || left._id.localeCompare(right._id)) *
        (sort === "newest" ? -1 : 1)
      );
    });
}
