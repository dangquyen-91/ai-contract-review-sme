"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ContractTable } from "@/components/contract/contract-table";
import { OrganizationContractsView } from "@/components/contract/organization-contracts-view";

export function OrganizationContractList({ workspace, expertMode = false, managerMode = false }: {
  workspace: OrganizationWorkflow;
  expertMode?: boolean;
  managerMode?: boolean;
}) {
  const { data, contractFilter, searchParams, selectTab, access, reviewExisting, isReviewing } = workspace;
  if (!data) return null;
  return <OrganizationContractsView key={JSON.stringify(contractFilter) + (searchParams.get("search") ?? "")} orgId={data.organization.id} filter={contractFilter} expertMode={expertMode} managerMode={managerMode} onFilter={(filter) => selectTab("contracts", filter)} renderContracts={(contracts, onDeleted) => <ContractTable highlightId={searchParams.get("uploaded") ?? undefined} contracts={contracts} onDeleted={onDeleted} canDelete={["administrator", "owner", "manager", "staff"].includes(data.role)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing}/>} />;
}
