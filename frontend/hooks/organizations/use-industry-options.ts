"use client";

import { useContractProfiles } from "@/hooks/contracts/use-contracts";

export type IndustryOption = { code: string; name: string };

export function useIndustryOptionsQuery() {
  const query = useContractProfiles();
  const options = new Map<string, string>();
  for (const profile of query.data ?? []) {
    for (const industry of profile.industries ?? [])
      options.set(industry.code, industry.name);
  }
  const industries: IndustryOption[] = [...options].map(([code, name]) => ({ code, name }));
  return { ...query, industries };
}

export function useIndustryOptions(): IndustryOption[] {
  return useIndustryOptionsQuery().industries;
}
