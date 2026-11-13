"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractDetailTabs, type ContractDetailTab } from "@/hooks/contracts/use-contract-detail-tab";

const tabLabels: Record<ContractDetailTab, string> = {
  overview: "Tổng quan",
  risks: "Rủi ro & văn bản",
  terms: "Thông tin chính",
  chat: "Hỏi đáp",
  versions: "Phiên bản",
};

export function ContractDetailTabs({ tab, onSelect, counts, panels }: {
  tab: ContractDetailTab;
  onSelect: (tab: ContractDetailTab) => void;
  counts: Partial<Record<ContractDetailTab, number>>;
  panels: Record<ContractDetailTab, () => ReactNode>;
}) {
  const [visited, setVisited] = useState<ContractDetailTab[]>([tab]);
  if (!visited.includes(tab)) setVisited([...visited, tab]);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Tabs value={tab} onValueChange={(value) => onSelect(value as ContractDetailTab)} className="gap-0">
        <div className="overflow-x-auto border-b border-border bg-muted/40 px-3">
          <TabsList variant="line" aria-label="Nội dung hợp đồng" className="h-12! gap-1">
            {contractDetailTabs.map((key) => (
              <TabsTrigger key={key} value={key} className="h-12 flex-none gap-1.5 px-3 text-ui font-semibold after:bg-primary group-data-[orientation=horizontal]/tabs:after:bottom-0 data-[state=active]:text-primary">
                {tabLabels[key]}
                {counts[key] !== undefined && (
                  <Badge variant={key === tab ? "info" : "neutral"} className="h-5 min-w-5 px-1.5 tabular-nums">
                    {counts[key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {contractDetailTabs.filter((key) => visited.includes(key)).map((key) => (
          <TabsContent key={key} value={key} forceMount className="data-[state=inactive]:hidden">
            {panels[key]()}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
