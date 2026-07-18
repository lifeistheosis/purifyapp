"use client";

// Traffic hub — folds the four site-analytics tabs (plus the original
// traffic-first Overview) behind one nav entry so the top-level hub stays
// commerce-focused. Each panel is the existing self-contained tab
// component, rendered unchanged; no query is rewritten.

import { useState } from "react";
import { SubTabs } from "../primitives";
import { OverviewTab } from "./OverviewTab";
import { LiveTab } from "./LiveTab";
import { TrafficTab } from "./TrafficTab";
import { AudienceTab } from "./AudienceTab";
import { EngagementTab } from "./EngagementTab";

type Panel = "overview" | "live" | "traffic" | "audience" | "engagement";

const TABS = [
  ["overview", "At a glance"],
  ["live", "Live"],
  ["traffic", "Time-series"],
  ["audience", "Audience"],
  ["engagement", "Engagement"],
] as const;

export function TrafficHubTab() {
  const [panel, setPanel] = useState<Panel>("overview");
  return (
    <div className="space-y-5">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "overview" && <OverviewTab />}
      {panel === "live" && <LiveTab />}
      {panel === "traffic" && <TrafficTab />}
      {panel === "audience" && <AudienceTab />}
      {panel === "engagement" && <EngagementTab />}
    </div>
  );
}
