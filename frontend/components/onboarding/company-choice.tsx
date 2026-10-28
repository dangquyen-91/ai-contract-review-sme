"use client";

import { useState } from "react";
import { useOnboardingWorkflow } from "@/hooks/onboarding/use-onboarding-workflow";
import { OrganizationChoiceOptions } from "./organization-choice-options";
import { OrganizationCreateForm } from "./organization-create-form";

export function CompanyChoice() {
  const [view, setView] = useState<"choice" | "create">("choice");
  const [name, setName] = useState("");
  const workflow = useOnboardingWorkflow();
  return <div className="w-[min(610px,100%)] [@media_(max-width:_900px)]:max-w-[620px] [@media_(max-width:_900px)]:[margin-inline:auto] [@media_(max-width:_900px)]:border [@media_(max-width:_900px)]:[background:#ffffff] [@media_(max-width:_900px)]:shadow-[0_24px_60px_-44px_rgb(18_65_126_/_0.62)] [@media_(max-width:_900px)]:p-[30px] [@media_(max-width:_900px)]:rounded-[18px] [@media_(max-width:_900px)]:border-solid [@media_(max-width:_900px)]:border-[#dce5f0] [@media_(max-width:_520px)]:px-[18px] [@media_(max-width:_520px)]:py-[25px] [@media_(max-width:_520px)]:rounded-[15px]">
    {view === "choice" ? <OrganizationChoiceOptions isSubmitting={workflow.busy} error={workflow.error} onContinue={workflow.continueWithoutOrganization} onCreate={() => { if (!workflow.busy && !workflow.setupCompleted) setView("create"); }} />
      : <OrganizationCreateForm name={name} error={workflow.error} isSubmitting={workflow.busy} setupCompleted={workflow.setupCompleted}
          onNameChange={(value) => { setName(value); workflow.clearError(); }}
          onSubmit={(event) => { event.preventDefault(); void workflow.createOrganization(name); }}
          onBack={() => { if (!workflow.busy && !workflow.setupCompleted) { setView("choice"); workflow.clearError(); } }} />}
  </div>;
}
