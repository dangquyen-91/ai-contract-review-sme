"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

export function useVerificationQueueFilter(initial: VerificationQueueFilter) {
  return useQueryState("status", parseAsStringLiteral(["all", "requested", "in_progress"] as const).withDefault(initial).withOptions({ history: "push", clearOnDefault: false }));
}
