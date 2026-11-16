export const studioLawKeys = {
  list: (q: string, page: number, ids?: string[], templateCode?: string) =>
    [
      "studio-laws",
      "list",
      q,
      page,
      ids ?? null,
      templateCode ?? null,
    ] as const,
  preview: (id: string) => ["studio-laws", "preview", id] as const,
};
