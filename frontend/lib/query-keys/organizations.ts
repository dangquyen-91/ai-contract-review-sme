export const organizationKeys = {
  addressOptions: ["organization-address-options"] as const,
  all: ["organizations"] as const,
  lists: ["organizations", "list"] as const,
  list: (page: number, limit: number, filters: { search?: string; industry?: string } = {}) => ["organizations", "list", { page, limit, search: filters.search ?? "", industry: filters.industry ?? "" }] as const,
};

export const organizationMutationKeys = {
  all: ["organizations"] as const,
  create: ["organizations", "create"] as const,
};
