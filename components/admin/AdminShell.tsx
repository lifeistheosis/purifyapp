"use client";

// AdminShell — tab navigation + URL-state syncing + global header with
// adminEmail, last-updated indicator, and a small bank of global actions
// (Rebuild caches across content surfaces).

import { useEffect, useState, useTransition, type ComponentType } from "react";
import { OverviewTab } from "./tabs/OverviewTab";
import { LiveTab } from "./tabs/LiveTab";
import { TrafficTab } from "./tabs/TrafficTab";
import { AudienceTab } from "./tabs/AudienceTab";
import { ContentTab } from "./tabs/ContentTab";
import { UsersTab } from "./tabs/UsersTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { Toolbar, ToolbarButton } from "./primitives";

type TabId =
  | "overview"
  | "live"
  | "traffic"
  | "audience"
  | "content"
  | "users"
  | "security";

const TABS: { id: TabId; label: string; eyebrow: string; component: ComponentType }[] = [
  { id: "overview", label: "Overview", eyebrow: "At a glance", component: OverviewTab },
  { id: "live", label: "Live", eyebrow: "Right now", component: LiveTab },
  { id: "traffic", label: "Traffic", eyebrow: "Time-series", component: TrafficTab },
  { id: "audience", label: "Audience", eyebrow: "Who's reading", component: AudienceTab },
  { id: "content", label: "Content", eyebrow: "What's working", component: ContentTab },
  { id: "users", label: "Users", eyebrow: "Profiles", component: UsersTab },
  { id: "security", label: "Security", eyebrow: "Perimeter", component: SecurityTab },
];

function isTabId(s: string | null): s is TabId {
  return Boolean(s && TABS.some((t) => t.id === s));
}

export function AdminShell({ adminEmail }: { adminEmail: string }) {
  // Sync the active tab with the URL hash (#tab=content). Lets admins
  // bookmark or share a deep link to a specific section.
  const [active, setActive] = useState<TabId>("overview");
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function readHash() {
      const h = window.location.hash.replace(/^#/, "");
      const m = new URLSearchParams(h).get("tab");
      if (isTabId(m)) setActive(m);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  // Push the active tab into the URL hash when it changes, without
  // adding a new history entry (replace, not push).
  useEffect(() => {
    const next = `#tab=${active}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [active]);

  async function rebuild(target: "saints" | "councils" | "home" | "all") {
    setRebuildStatus("Rebuilding…");
    try {
      const r = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cache-rebuild", target }),
      });
      if (r.ok) {
        setRebuildStatus(`Rebuilt: ${target}`);
        setTimeout(() => setRebuildStatus(null), 2500);
      } else {
        setRebuildStatus("Failed");
      }
    } catch {
      setRebuildStatus("Failed");
    }
    startTransition(() => {});
  }

  const Current = TABS.find((t) => t.id === active)?.component ?? OverviewTab;
  const currentMeta = TABS.find((t) => t.id === active);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            Admin · {currentMeta?.eyebrow}
          </p>
          <h1 className="font-sans text-[32px] md:text-[40px] font-bold text-paper tracking-[-0.02em]">
            {currentMeta?.label}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Toolbar>
            <ToolbarButton onClick={() => rebuild("all")} title="Revalidate all content surfaces">
              ↻ Rebuild caches
            </ToolbarButton>
            <ToolbarButton onClick={() => rebuild("saints")} title="Revalidate /saints + every saint page">
              Saints
            </ToolbarButton>
            <ToolbarButton onClick={() => rebuild("councils")} title="Revalidate /councils">
              Councils
            </ToolbarButton>
            <ToolbarButton onClick={() => rebuild("home")} title="Revalidate /">
              Home
            </ToolbarButton>
          </Toolbar>
          <p className="font-sans text-[12px] text-paper/40">
            {rebuildStatus ?? adminEmail}
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-paper/10 overflow-x-auto -mx-1">
        <ul className="flex items-stretch gap-0 min-w-max px-1">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActive(t.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "px-4 py-2.5 font-sans text-[13px] font-semibold transition-colors relative " +
                    (isActive
                      ? "text-gold"
                      : "text-paper/55 hover:text-paper")
                  }
                >
                  {t.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-3 right-3 -bottom-px h-[2px] bg-gold rounded-full"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Active tab content — keyed so it remounts on tab switch and the
          fade-in animation replays for every section open. */}
      <div key={active} className="admin-fade-in">
        <Current />
      </div>
    </div>
  );
}
