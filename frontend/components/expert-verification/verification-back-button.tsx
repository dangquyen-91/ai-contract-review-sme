"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationListNavigation } from "@/hooks/expert-verification/use-verification-list-navigation";

export function VerificationBackButton({ historical = false }: { historical?: boolean }) {
  const { back } = useVerificationListNavigation();
  return <Button variant="ghost" size="sm" className="px-0" onClick={() => back(historical)}><ArrowLeft aria-hidden="true" />Quay lại danh sách</Button>;
}
