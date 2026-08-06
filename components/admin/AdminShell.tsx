"use client";

// AdminShell — grouped navigation rail, URL-state syncing, and the global
// action bank (rebuild content caches).
//
// Was: eleven flat tabs in one horizontally scrolling row. On a laptop the
// last three sat off-screen, so reaching Traffic meant scrolling a tab bar
// to find a tab. Now the eleven are grouped by what the operator came to do
// (Money, People, Catalog, Reach) in a persistent rail, which also gives the
// room to surface a count on the one item that can be behind: pending orders.
//
// The #tab=<id> deep links are unchanged, so existing bookmarks still land.

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ComponentType,
} from "react";
import { CommerceOverviewTab } from "./tabs/CommerceOverviewTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { SubscriptionsTab } from "./tabs/SubscriptionsTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { UsersHubTab } from "./tabs/UsersHubTab";
import { PushTab } from "./tabs/PushTab";
import { ShopHubTab } from "./tabs/ShopHubTab";
import { EikonBoxTab } from "./tabs/EikonBoxTab";
import { CommunityTab } from "./tabs/CommunityTab";
import { TrafficHubTab } from "./tabs/TrafficHubTab";
import { Toolbar, ToolbarButton } from "./primitives";

type TabId =
  | "overview"
  | "orders"
  | "revenue"
  | "subscriptions"
  | "messages"
  | "users"
  | "push"
  | "shop"
  | "eikon-box"
  | "community"
  | "traffic";

type Tab = {
  id: TabId;
  label: string;
  eyebrow: string;
  component: ComponentType;
};

// Grouped by the job, not by the team that built it. An operator opening
// the panel is either chasing money, chasing people, minding the catalog,
// or reaching out.
const GROUPS: { group: string; tabs: Tab[] }[] = [
  {
    group: "Money",
    tabs: [
      { id: "overview", label: "Overview", eyebrow: "Money at a glance", component: CommerceOverviewTab },
      { id: "orders", label: "Orders", eyebrow: "Every order", component: OrdersTab },
      { id: "revenue", label: "Revenue", eyebrow: "Shop, donations, subs", component: RevenueTab },
      { id: "subscriptions", label: "Subscriptions", eyebrow: "Plus and Pro", component: SubscriptionsTab },
    ],
  },
  {
    group: "People",
    tabs: [
      { id: "users", label: "Users", eyebrow: "Profiles and carts", component: UsersHubTab },
      { id: "messages", label: "Messages", eyebrow: "Support and shop", component: MessagesTab },
      { id: "community", label: "Community", eyebrow: "Campaigns and Trapeza moderation", component: CommunityTab },
    ],
  },
  {
    group: "Catalog",
    tabs: [
      { id: "shop", label: "Shop", eyebrow: "EIKON and marketplace", component: ShopHubTab },
      { id: "eikon-box", label: "EIKON Box", eyebrow: "Monthly drops and claims", component: EikonBoxTab },
    ],
  },
  {
    group: "Reach",
    tabs: [
      { id: "push", label: "Push", eyebrow: "Broadcast notifications", component: PushTab },
      { id: "traffic", label: "Traffic", eyebrow: "Site analytics", component: TrafficHubTab },
    ],
  },
];

const TABS: Tab[] = GROUPS.flatMap((g) => g.tabs);

function isTabId(s: string | null): s is TabId {
  return Boolean(s && TABS.some((t) => t.id === s));
}

export function AdminShell({ adminEmail }: { adminEmail: string }) {
  const [active, setActive] = useState<TabId>("overview");
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Sync the active tab with the URL hash (#tab=orders). Lets an admin
  // bookmark or share a deep link to a specific section.
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

  useEffect(() => {
    const next = `#tab=${active}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [active]);

  // One number on the rail: orders sitting unpaid. It is the only count in
  // the panel that means "someone is waiting", so it is the only one that
  // earns a badge. Failing quietly is correct here; a broken badge must
  // never take the panel down with it.
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.ordersPending === "number") {
          setPendingOrders(d.ordersPending);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const select = useCallback((id: TabId) => {
    setActive(id);
    setNavOpen(false);
  }, []);

  async function rebuild(target: "saints" | "councils" | "home" | "all") {
    setRebuildStatus("Rebuilding");
    try {
      const r = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cache-rebuild", target }),
      });
      if (r.ok) {
        setRebuildStatus(`Rebuilt ${target}`);
        setTimeout(() => setRebuildStatus(null), 2500);
      } else {
        setRebuildStatus("Rebuild failed");
      }
    } catch {
      setRebuildStatus("Rebuild failed");
    }
    startTransition(() => {});
  }

  const currentMeta = TABS.find((t) => t.id === active);
  const Current = currentMeta?.component ?? CommerceOverviewTab;

  function NavItem({ t }: { t: Tab }) {
    const on = t.id === active;
    const badge = t.id === "orders" && pendingOrders ? pendingOrders : null;
    return (
      <li>
        <button
          type="button"
          onClick={() => select(t.id)}
          aria-current={on ? "page" : undefined}
          title={t.eyebrow}
          className="adm-rail-item flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-[7px] text-left font-sans text-[13px]"
          style={
            on
              ? {
                  background: "color-mix(in oklab, var(--adm-accent), transparent 88%)",
                  color: "var(--adm-accent)",
                  fontWeight: 600,
                }
              : { color: "var(--adm-ink-2)" }
          }
        >
          <span className="truncate">{t.label}</span>
          {badge ? (
            <span
              className="shrink-0 rounded px-1.5 py-px font-sans text-[11px] font-semibold"
              style={{
                background: "color-mix(in oklab, var(--adm-warn), transparent 82%)",
                color: "var(--adm-warn)",
              }}
              title={`${badge} order${badge === 1 ? "" : "s"} awaiting payment`}
            >
              {badge}
            </span>
          ) : null}
        </button>
      </li>
    );
  }

  const nav = (
    <nav aria-label="Admin sections" className="space-y-4">
      {GROUPS.map((g) => (
        <div key={g.group}>
          <p
            className="mb-1 px-2.5 font-sans text-[11.5px] font-medium"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {g.group}
          </p>
          <ul className="space-y-px">
            {g.tabs.map((t) => (
              <NavItem key={t.id} t={t} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="adm min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-5 md:px-6">
        {/* Rail. Sticky on desktop so navigation is always one glance away,
            even a thousand rows into an order list. */}
        <aside
          className="sticky top-5 hidden h-[calc(100dvh-40px)] w-[184px] shrink-0 overflow-y-auto rounded-xl border p-3 lg:block"
          style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
        >
          <p
            className="mb-4 px-2.5 font-sans text-[13px] font-semibold"
            style={{ color: "var(--adm-ink)" }}
          >
            Purify admin
          </p>
          {nav}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNavOpen((v) => !v)}
                  aria-expanded={navOpen}
                  aria-label="Toggle sections"
                  className="rounded-md border px-2 py-1 font-sans text-[12.5px] lg:hidden"
                  style={{
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  }}
                >
                  Sections
                </button>
                <h1
                  className="truncate font-sans text-[22px] font-semibold tracking-[-0.02em]"
                  style={{ color: "var(--adm-ink)" }}
                >
                  {currentMeta?.label}
                </h1>
              </div>
              <p
                className="mt-0.5 font-sans text-[12.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                {currentMeta?.eyebrow}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Toolbar>
                <ToolbarButton onClick={() => rebuild("all")} title="Revalidate every content surface">
                  Rebuild caches
                </ToolbarButton>
                <ToolbarButton onClick={() => rebuild("saints")} title="Revalidate /saints and every saint page">
                  Saints
                </ToolbarButton>
                <ToolbarButton onClick={() => rebuild("councils")} title="Revalidate /councils">
                  Councils
                </ToolbarButton>
                <ToolbarButton onClick={() => rebuild("home")} title="Revalidate the home page">
                  Home
                </ToolbarButton>
              </Toolbar>
              <p
                aria-live="polite"
                className="font-sans text-[12px]"
                style={{
                  color: rebuildStatus?.includes("failed")
                    ? "var(--adm-critical)"
                    : "var(--adm-ink-3)",
                }}
              >
                {rebuildStatus ?? adminEmail}
              </p>
            </div>
          </header>

          {navOpen && (
            <div
              className="adm-panel-enter mb-5 rounded-xl border p-3 lg:hidden"
              style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
            >
              {nav}
            </div>
          )}

          {/* Keyed so the panel remounts on section change and its entrance
              replays. One 180ms move, not a staggered cascade: the operator
              chose this section and does not need to watch it assemble. */}
          <div key={active} className="adm-panel-enter">
            <Current />
          </div>
        </div>
      </div>
    </div>
  );
}
