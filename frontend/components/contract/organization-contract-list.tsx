"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ContractTable } from "@/components/contract/contract-table";
import { OrganizationContractsView } from "@/components/contract/organization-contracts-view";

export function OrganizationContractList({ workspace, reviewerMode = false, managerMode = false }: {
  workspace: OrganizationWorkflow;
  reviewerMode?: boolean;
  managerMode?: boolean;
}) {
  const { data, contractFilter, searchParams, selectTab, access, reviewExisting, isReviewing } = workspace;
  if (!data) return null;
  return <OrganizationContractsView key={JSON.stringify(contractFilter) + (searchParams.get("search") ?? "")} orgId={data.organization.id} filter={contractFilter} reviewerMode={reviewerMode} managerMode={managerMode} onFilter={(filter) => selectTab("contracts", filter)} renderContracts={(contracts, onDeleted) => <ContractTable highlightId={searchParams.get("uploaded") ?? undefined} contracts={contracts} onDeleted={onDeleted} canDelete={["administrator", "owner", "manager"].includes(data.role)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing}/>} />;
}
