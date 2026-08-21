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
import { AdminThemeToggle } from "./AdminThemeToggle";
import { ADMIN_TAB_ICONS, ADMIN_TAB_ICON_FALLBACK } from "./nav-icons";
import { TabBoundary } from "./TabBoundary";

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

// Module scope, deliberately. This used to be declared inside AdminShell's
// body, which made it a NEW component type on every render: React unmounted
// and remounted all eleven buttons whenever pendingOrders resolved or navOpen
// flipped, and a keyboard operator lost focus mid-tab-walk when the badge
// fetch landed.
function NavItem({
  t,
  on,
  badge,
  onSelect,
}: {
  t: Tab;
  on: boolean;
  badge: number | null;
  onSelect: (id: TabId) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(t.id)}
        aria-current={on ? "page" : undefined}
        title={t.eyebrow}
        className="adm-rail-item flex w-full items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 py-[5px] text-left font-sans text-[13px]"
        style={
          on
            ? {
                // The surface carries the state. The old treatment was a 12%
                // accent wash behind amber text: a tinted fill fighting a
                // tinted label, which is why it read as muddy. Now the label
                // is full-contrast ink (13.8:1 in both themes).
                //
                // There was a 2px accent bar down the left edge here too.
                // Removed at the owner's request: with the raised surface,
                // the weight change and the tinted icon all saying the same
                // thing, a fourth marker was one too many.
                background: "var(--adm-nav-active-bg)",
                color: "var(--adm-nav-active-fg)",
                fontWeight: 600,
              }
            : { color: "var(--adm-ink-2)" }
        }
      >
        <span
          className="grid shrink-0 place-items-center"
          style={{ color: on ? "var(--adm-nav-bar)" : "var(--adm-ink-3)" }}
        >
          {ADMIN_TAB_ICONS[t.id] ?? ADMIN_TAB_ICON_FALLBACK}
        </span>
        <span className="min-w-0 flex-1 truncate">{t.label}</span>
        {badge ? (
          <span
            className="shrink-0 rounded-[var(--adm-radius-pill)] px-1.5 py-px font-sans text-[11px] font-semibold"
            style={{
              background: "var(--adm-badge-bg)",
              color: "var(--adm-badge-fg)",
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

// A neutral mark, not an accented one. The rail is allowed exactly two spots
// of colour, the active row and the orders badge, and a branded tile would be
// a third competing for the same eye.
function Wordmark() {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--adm-radius-sm)]"
        style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}
        aria-hidden
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M8 2.2v11.6M5.9 4.4h4.2M4.2 7.1h7.6M6.1 10.6l3.8-1.1" />
        </svg>
      </span>
      <span className="min-w-0 truncate font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        Purify{" "}
        <span className="font-medium" style={{ color: "var(--adm-ink-3)" }}>
          admin
        </span>
      </span>
    </div>
  );
}

export function AdminShell({ adminEmail }: { adminEmail: string }) {
  const [active, setActive] = useState<TabId>("overview");
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  // Bumped by the tab boundary's Try again, so a recovered panel re-mounts and
  // re-fetches instead of needing a page reload.
  const [reloadKey, setReloadKey] = useState(0);

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
  }

  const currentMeta = TABS.find((t) => t.id === active);
  const Current = currentMeta?.component ?? CommerceOverviewTab;
  const current = currentMeta ?? TABS[0];

  const nav = (
    <nav aria-label="Admin sections">
      {GROUPS.map((g, i) => (
        // A real hairline between groups, not whitespace. Group boundaries
        // used to exist only as vertical gaps, which is the density problem
        // this rail was built to fix, one layer down. A fifth group would
        // have blurred the four into one long list.
        <div
          key={g.group}
          className={i === 0 ? "" : "mt-2 border-t pt-2"}
          style={i === 0 ? undefined : { borderColor: "var(--adm-line)" }}
        >
          {/* Sentence case. primitives.tsx bans tracked uppercase labels
              ("when everything is a heading, the eye has nothing to skip
              to"), and the rail should not contradict the panel below it. */}
          <p
            className="mb-1 px-2 font-sans text-[11.5px] font-medium"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {g.group}
          </p>
          <ul className="space-y-px">
            {g.tabs.map((t) => (
              <NavItem
                key={t.id}
                t={t}
                on={t.id === active}
                badge={t.id === "orders" && pendingOrders ? pendingOrders : null}
                onSelect={select}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  // Identity, theme, and the way out. adminEmail previously appeared nowhere
  // but as the FALLBACK of the rebuild-status line, so the operator's own
  // account vanished from the UI for 2.5s on every cache rebuild, and
  // permanently after a failed one.
  //
  // Sign out is a plain link because app/(auth)/signout/page.tsx is already a
  // real route the account menus navigate to. No new auth code here.
  const railFooter = (
    <div
      className="mt-2 shrink-0 border-t pt-2"
      style={{ borderColor: "var(--adm-line)" }}
    >
      <div className="mb-1 flex items-center gap-2 px-1">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--adm-radius-pill)] font-sans text-[11px] font-semibold uppercase"
          style={{ background: "var(--adm-accent)", color: "var(--adm-on-accent)" }}
          aria-hidden
        >
          {adminEmail.slice(0, 1)}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-sans text-[11.5px]"
          style={{ color: "var(--adm-ink-2)" }}
          title={adminEmail}
        >
          {adminEmail}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <AdminThemeToggle />
        <a
          href="/signout"
          className="adm-control flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
          style={
            {
              color: "var(--adm-ink-2)",
              "--_bg": "transparent",
              "--_bg-hover": "var(--adm-hover)",
            } as React.CSSProperties
          }
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 17.2H4.6a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8H8" />
            <path d="M12.8 13.6 16.4 10l-3.6-3.6M16.4 10H7.4" />
          </svg>
          <span>Sign out</span>
        </a>
      </div>
    </div>
  );

  return (
    <div className="adm min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-5 md:px-6">
        {/* Rail. Sticky on desktop so navigation is always one glance away,
            even a thousand rows into an order list. */}
        {/* 200px, up from 184, to pay for the icon column. That leaves ~136px
            of label, and "Subscriptions" is ~86px at 13px DM Sans, so the
            truncate never fires on any current label.

            Only the NAV region scrolls now, not the whole rail. That is what
            keeps the identity block pinned no matter how many groups land.
            The budget at 1366x768 is tight on purpose: four groups fit with
            room to spare, and a fifth spills a few pixels into the nav
            scroller rather than pushing anything off the rail. py-[5px] on
            the nav items is load-bearing, not taste. A sixth group wants
            collapsible sections, not tighter padding. */}
        <aside
          className="sticky top-5 hidden h-[calc(100dvh-40px)] w-[200px] shrink-0 flex-col rounded-[var(--adm-radius-lg)] border p-3 lg:flex"
          style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
        >
          <Wordmark />
          <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
          {railFooter}
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
                  className="adm-control rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12.5px] lg:hidden"
                  style={
                    {
                      borderColor: "var(--adm-line-strong)",
                      color: "var(--adm-ink-2)",
                      "--_bg": "var(--adm-control)",
                      "--_bg-hover": "color-mix(in oklab, var(--adm-control), var(--adm-ink) 8%)",
                    } as React.CSSProperties
                  }
                >
                  Sections
                </button>
                <h1
                  className="truncate font-sans text-[20px] font-semibold tracking-[-0.01em]"
                  style={{ color: "var(--adm-ink)" }}
                >
                  {currentMeta?.label}
                </h1>
              </div>
              <p
                className="mt-1 font-sans text-[13px]"
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
              {/* Status only. The email moved to the rail footer, where it
                  stays put. min-h reserves the line so the toolbar does not
                  shift when a rebuild starts. "Rebuild failed" still never
                  auto-clears: the harm was that it HID the identity, not that
                  it persisted, and silently hiding an error is worse. */}
              <p
                aria-live="polite"
                className="min-h-[16px] font-sans text-[12px]"
                style={{
                  color: rebuildStatus?.includes("failed")
                    ? "var(--adm-critical)"
                    : "var(--adm-ink-3)",
                }}
              >
                {rebuildStatus}
              </p>
            </div>
          </header>

          {navOpen && (
            <div
              className="adm-panel-enter mb-5 rounded-[var(--adm-radius-lg)] border p-3 lg:hidden"
              style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
            >
              {nav}
              {railFooter}
            </div>
          )}

          {/* Keyed so the panel remounts on section change and its entrance
              replays. One 180ms move, not a staggered cascade: the operator
              chose this section and does not need to watch it assemble. */}
          {/* The boundary sits here, inside the shell and around the active
              panel only. A route-level app/admin/error.tsx would sit above the
              rail and take the whole panel down, which is the failure this is
              for. */}
          <div key={active} className="adm-panel-enter">
            <TabBoundary label={current.label} onRetry={() => setReloadKey((n) => n + 1)}>
              <Current key={reloadKey} />
            </TabBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
