"use client";

import { createParser, useQueryState } from "nuqs";

export const paginationPageParser = createParser({
  parse(value: string) {
    const page = Number(value);
    return Number.isSafeInteger(page) && page > 0 ? page : null;
  },
  serialize: String,
}).withDefault(1);

export function usePaginationPage() {
  return useQueryState("page", paginationPageParser.withOptions({ history: "push" }));
}
