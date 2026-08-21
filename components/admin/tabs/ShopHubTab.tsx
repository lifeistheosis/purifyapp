"use client";

// Shop hub — the EIKON catalog/sourcing workbench (ShopTab) and the
// cross-seller governance console (MarketplaceTab), behind one nav entry.
// Orders and Messages are also promoted to their own top-level hub tabs;
// the fuller governance still lives here. Both panels render unchanged.

import { useState } from "react";
import { SubTabs } from "../primitives";
import { ShopTab } from "./ShopTab";
import { MarketplaceTab } from "./MarketplaceTab";

type Panel = "catalog" | "marketplace";

const TABS = [
  ["catalog", "EIKON catalog"],
  ["marketplace", "Marketplace governance"],
] as const;

export function ShopHubTab() {
  const [panel, setPanel] = useState<Panel>("catalog");
  return (
    <div className="space-y-6">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "catalog" && <ShopTab />}
      {panel === "marketplace" && <MarketplaceTab />}
    </div>
  );
}
