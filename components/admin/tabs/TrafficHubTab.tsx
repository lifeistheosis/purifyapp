"use client";

// Traffic hub — folds the four site-analytics tabs (plus the original
// traffic-first Overview) behind one nav entry so the top-level hub stays
// commerce-focused. Each panel is the existing self-contained tab
// component, rendered unchanged; no query is rewritten.

import { useState } from "react";
import { SubTabs, Toolbar, ToolbarButton } from "../primitives";
import { OverviewTab } from "./OverviewTab";
import { LiveTab } from "./LiveTab";
import { TrafficTab } from "./TrafficTab";
import { AudienceTab } from "./AudienceTab";
import { EngagementTab } from "./EngagementTab";
import { setLatestDay, useLatestDay } from "@/lib/admin/latestDayPreference";

type Panel = "overview" | "live" | "traffic" | "audience" | "engagement";

const TABS = [
  ["overview", "At a glance"],
  ["live", "Live"],
  ["traffic", "Time-series"],
  ["audience", "Audience"],
  ["engagement", "Engagement"],
] as const;

/**
 * The two panels drawn from daily buckets, and so the only two the latest-day
 * toggle changes. It is not shown on Live, Audience or Engagement, because a
 * control that appears on a panel and does nothing there is a control that
 * teaches the operator to stop trusting controls.
 */
const DAILY_PANELS: readonly Panel[] = ["overview", "traffic"];

export function TrafficHubTab() {
  const [panel, setPanel] = useState<Panel>("overview");
  const latest = useLatestDay();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
        {DAILY_PANELS.includes(panel) ? (
          <div className="flex items-center gap-2">
            <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              Latest day
            </span>
            <Toolbar>
              <ToolbarButton
                variant={latest === "now" ? "primary" : "default"}
                onClick={() => setLatestDay("now")}
                title="End the charts on today, counted up to this moment"
              >
                Now
              </ToolbarButton>
              <ToolbarButton
                variant={latest === "complete" ? "primary" : "default"}
                onClick={() => setLatestDay("complete")}
                title="End the charts on yesterday, so every day shown is finished. Days close at midnight UTC."
              >
                Last night
              </ToolbarButton>
            </Toolbar>
          </div>
        ) : null}
      </div>
      {panel === "overview" && <OverviewTab />}
      {panel === "live" && <LiveTab />}
      {panel === "traffic" && <TrafficTab />}
      {panel === "audience" && <AudienceTab />}
      {panel === "engagement" && <EngagementTab />}
    </div>
  );
}
