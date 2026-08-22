"use client";

// AdminShell — one panel, two modes, a live rail, and the hero above the tab.
//
// Was: eleven flat tabs in one horizontally scrolling row, then eleven tabs
// grouped in a rail, and a separate product at /owner that you reached by
// knowing the URL. Switching between the two was a page load and a link hunt,
// which is what "I dont like switching between /owner and /admin" was about.
//
// v4 makes the switch a control instead of a navigation. The rail carries a
// segmented Operations | Owner, and flipping it swaps the nav list underneath.
// Same shell, same chrome, same theme, no page load.
//
// THREE THINGS IN HERE ARE LOAD-BEARING AND EASY TO BREAK.
//
// 1. This file must stay at components/admin/AdminShell.tsx and must contain
//    the string "<TabBoundary". lib/admin/__tests__/fetchGuards.test.ts finds
//    it by path suffix and asserts the boundary is INSIDE the shell, wrapped
//    around the active panel only, so a crashing tab cannot take the rail
//    down with it. Move or rename this file and that test fails on undefined
//    before it ever reaches the string check.
//
// 2. Owner tab ids are namespaced (owner-today, not a second parameter). The
//    hash writer below replaces the whole fragment, so a #panel=owner&tab=x
//    scheme would need that rewritten; one tab= parameter needs nothing.
//
// 3. Owner content is NOT imported here. See components/admin/OwnerSection.tsx
//    for why a static import would ship the projection engine to every admin.
//
// The #tab=<id> deep links are unchanged, so existing bookmarks still land.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { CommerceOverviewTab } from "./tabs/CommerceOverviewTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { SustainabilityTab } from "./tabs/SustainabilityTab";
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
import { OwnerSection } from "./OwnerSection";
import { HeroRow } from "./HeroRow";
import { SectionHead, type PeriodId } from "./hero";
import { Freshness } from "./Freshness";
import { TabSearch } from "./TabSearch";
import { useLiveData } from "@/lib/admin/useLiveData";
import {
  isOwnerTab,
  modeOf,
  ownerPanelOf,
  resolveTab,
  type AdminMode as Mode,
  type OwnerTabId,
} from "@/lib/admin/tabs";

type OpsTabId =
  | "overview"
  | "orders"
  | "revenue"
  | "costs"
  | "subscriptions"
  | "messages"
  | "users"
  | "push"
  | "shop"
  | "eikon-box"
  | "community"
  | "traffic";

type TabId = OpsTabId | OwnerTabId;

type Tab = {
  id: TabId;
  label: string;
  eyebrow: string;
  component?: ComponentType;
};

type Group = { group: string; mode: Mode; tabs: Tab[] };

// Grouped by the job, not by the team that built it. An operator opening
// the panel is either chasing money, chasing people, minding the catalog,
// or reaching out.
//
// The rail budget note further down says four groups fit and a fifth spills.
// Owner did NOT spend that slot: it is a separate mode, so its group is never
// on screen at the same time as these four. The fifth remains free.
const GROUPS: Group[] = [
  {
    group: "Money",
    mode: "ops",
    tabs: [
      { id: "overview", label: "Overview", eyebrow: "Money at a glance", component: CommerceOverviewTab },
      { id: "orders", label: "Orders", eyebrow: "Every order", component: OrdersTab },
      { id: "revenue", label: "Revenue", eyebrow: "Shop, donations, subs", component: RevenueTab },
      { id: "costs", label: "Costs", eyebrow: "What we spend, and what /support publishes", component: SustainabilityTab },
      { id: "subscriptions", label: "Subscriptions", eyebrow: "Plus and Pro", component: SubscriptionsTab },
    ],
  },
  {
    group: "People",
    mode: "ops",
    tabs: [
      { id: "users", label: "Users", eyebrow: "Profiles and carts", component: UsersHubTab },
      { id: "messages", label: "Messages", eyebrow: "Support and shop", component: MessagesTab },
      { id: "community", label: "Community", eyebrow: "Campaigns and Trapeza moderation", component: CommunityTab },
    ],
  },
  {
    group: "Catalog",
    mode: "ops",
    tabs: [
      { id: "shop", label: "Shop", eyebrow: "EIKON and marketplace", component: ShopHubTab },
      { id: "eikon-box", label: "EIKON Box", eyebrow: "Monthly drops and claims", component: EikonBoxTab },
    ],
  },
  {
    group: "Reach",
    mode: "ops",
    tabs: [
      { id: "push", label: "Push", eyebrow: "Broadcast notifications", component: PushTab },
      { id: "traffic", label: "Traffic", eyebrow: "Site analytics", component: TrafficHubTab },
    ],
  },
  {
    group: "Strategy",
    mode: "owner",
    tabs: [
      // No `component`. These render through OwnerSection, which gates on a
      // request before it imports anything.
      { id: "owner-today", label: "Where we are", eyebrow: "Counted, not assumed" },
      { id: "owner-model", label: "Projection", eyebrow: "What the assumptions say" },
      { id: "owner-markets", label: "Markets", eyebrow: "Where the reach could come from" },
    ],
  },
];

const TABS: Tab[] = GROUPS.flatMap((g) => g.tabs);

function isTabId(s: string | null): s is TabId {
  return Boolean(s && TABS.some((t) => t.id === s));
}

// One check that the two lists agree. GROUPS is the rail's copy and
// lib/admin/tabs.ts is the permission layer's; if a fourth owner tab is added
// to one and not the other, the mismatch surfaces here at import time rather
// than as a section that renders but never gates.
if (
  process.env.NODE_ENV !== "production" &&
  GROUPS.filter((g) => g.mode === "owner").flatMap((g) => g.tabs).some((t) => !isOwnerTab(t.id))
) {
  throw new Error("An owner-mode tab is missing from OWNER_TAB_IDS in lib/admin/tabs.ts");
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
                // accent wash behind accented text: a tinted fill fighting a
                // tinted label, which is why it read as muddy. Now the label
                // is full-contrast ink (14.05:1 in both themes).
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
            style={{ background: "var(--adm-badge-bg)", color: "var(--adm-badge-fg)" }}
            title={`${badge} order${badge === 1 ? "" : "s"} awaiting payment`}
          >
            {badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Operations | Owner.
 *
 * The whole merge is this control. It replaces a link to another route, so
 * it has to read as a place you are rather than a place you go: a filled
 * segment on a recessed track, the same idiom SubTabs uses one layer down.
 *
 * h-11 on the segments and not hit-44. The escape hatch grows an invisible
 * 44px box around a smaller control, and app/globals.css warns that where
 * two controls sit closer than 44px their hit areas overlap and the later
 * one in paint order silently wins. Two segments in a 200px rail are always
 * closer than that, so the height has to be real.
 */
function ModeSwitch({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Panel"
      className="mb-3 grid grid-cols-2 gap-0.5 rounded-[var(--adm-radius-sm)] p-0.5"
      style={{ background: "var(--adm-panel-2)" }}
    >
      {(["ops", "owner"] as const).map((m) => {
        const on = m === mode;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={on}
            className="adm-rail-item h-11 rounded-[calc(var(--adm-radius-sm)-2px)] font-sans text-[12.5px]"
            style={
              on
                ? {
                    background: "var(--adm-panel)",
                    color: "var(--adm-ink)",
                    fontWeight: 600,
                    boxShadow: "var(--adm-shadow-card)",
                  }
                : { background: "transparent", color: "var(--adm-ink-3)" }
            }
          >
            {m === "ops" ? "Operations" : "Owner"}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The rail's live section.
 *
 * The reference this was drawn from puts a watchlist under the nav: a few
 * rows that change on their own, so the rail is worth glancing at rather
 * than only clicking. Same idea here, and every row comes out of the single
 * /api/admin/overview poll the shell already runs. No second request.
 */
function RailLive({
  pending,
  revenueTodayCents,
  paidSubs,
  loading,
  onOpen,
}: {
  pending: number | null;
  revenueTodayCents: number | null;
  paidSubs: number | null;
  loading: boolean;
  onOpen: (id: TabId) => void;
}) {
  const rows: { id: TabId; label: string; value: string; alert?: boolean }[] = [
    {
      id: "orders",
      label: "Awaiting payment",
      value: loading ? "—" : String(pending ?? 0),
      alert: (pending ?? 0) > 0,
    },
    {
      id: "revenue",
      label: "Revenue today",
      value:
        loading || revenueTodayCents === null
          ? "—"
          : `$${(revenueTodayCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    },
    {
      id: "subscriptions",
      label: "Paid subscribers",
      value: loading ? "—" : String(paidSubs ?? 0),
    },
  ];

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--adm-line)" }}>
      <p className="mb-1 px-2 font-sans text-[11.5px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
        Right now
      </p>
      <ul className="space-y-px">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="adm-rail-item flex w-full items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 py-[5px] text-left"
              style={{ color: "var(--adm-ink-2)" }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-[var(--adm-radius-pill)]"
                style={{ background: r.alert ? "var(--adm-accent)" : "var(--adm-line-strong)" }}
              />
              <span className="min-w-0 flex-1 truncate font-sans text-[12px]">{r.label}</span>
              <span
                className="shrink-0 font-sans text-[12px] font-semibold tabular-nums"
                style={{ color: r.alert ? "var(--adm-ink)" : "var(--adm-ink-2)" }}
              >
                {r.value}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A neutral mark, not an accented one. The rail is allowed exactly two spots
// of colour, the active row and the orders badge, and a branded tile would be
// a third competing for the same eye.
function Wordmark({ isOwner }: { isOwner: boolean }) {
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
      <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        Purify
      </span>
      {/* The role, not a plan tier. It says which of the two gates this
          session cleared, which is the one fact about the account that
          changes what is on screen. */}
      <span
        className="shrink-0 rounded-[var(--adm-radius-pill)] px-1.5 py-px font-sans text-[10px] font-semibold uppercase tracking-wide"
        style={{
          background: isOwner ? "var(--adm-badge-bg)" : "var(--adm-panel-2)",
          color: isOwner ? "var(--adm-badge-fg)" : "var(--adm-ink-3)",
        }}
      >
        {isOwner ? "Owner" : "Admin"}
      </span>
    </div>
  );
}

type OverviewPayload = {
  ordersPending: number;
  revenueTodayCents: number;
  revenueSeries: number[];
  paidPlus: number;
  paidPro: number;
};

export function AdminShell({
  adminEmail,
  isOwner = false,
}: {
  adminEmail: string;
  /** Resolved server-side by getOwnerUser(). Controls whether the Owner
      segment renders. It is NOT the data gate: see OwnerSection.tsx. */
  isOwner?: boolean;
}) {
  // Two names on purpose. `requested` is whatever the hash or a click asked
  // for; `active` is what this account may actually see. Deriving the second
  // from the first during render is what keeps a non-owner off an owner tab
  // without an effect that calls setState, which React flags as a cascading
  // render and which AdminThemeToggle and useTween both learned the hard way.
  const [requested, setActive] = useState<TabId>("overview");
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodId>("30d");
  // Bumped by the tab boundary's Try again, so a recovered panel re-mounts and
  // re-fetches instead of needing a page reload.
  const [reloadKey, setReloadKey] = useState(0);

  // One overview poll for the whole shell: the rail's live rows, the orders
  // badge, and the hero's revenue card all read it. Three consumers, one
  // request. 60s because that is the floor useLiveData documents for a
  // route anything metered sits behind.
  const overview = useLiveData<OverviewPayload>("/api/admin/overview", 60_000);
  const pendingOrders = overview.data?.ordersPending ?? null;

  // A deep link to #tab=owner-model on an account the owner gate refuses
  // resolves to Overview rather than to a section the rail does not offer.
  // The hash writer below then rewrites the URL to match, so the address bar
  // never disagrees with the screen.
  const active = resolveTab(requested, isOwner) as TabId;
  const mode = modeOf(active);

  // The hash is the source of truth for which tab is open, but it can only be
  // read on the client. Reading it in a lazy useState initialiser would run
  // during SSR, where window does not exist.
  //
  // So: read in an effect, and hold the WRITER back until that read has
  // happened. Without the latch the writer fires on first commit with the
  // default "overview" still in state and overwrites an incoming deep link,
  // which is exactly how /owner?redirect#tab=owner-today would have lost its
  // fragment. Effects run in declaration order, so the reader below always
  // goes first.
  const bootstrapped = useRef(false);

  useEffect(() => {
    function readHash() {
      const h = window.location.hash.replace(/^#/, "");
      const m = new URLSearchParams(h).get("tab");
      if (isTabId(m)) setActive(m);
    }
    readHash();
    bootstrapped.current = true;
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    if (!bootstrapped.current) return;
    const next = `#tab=${active}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [active]);

  const select = useCallback((id: TabId) => {
    setActive(id);
    setNavOpen(false);
  }, []);

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      const first = GROUPS.find((g) => g.mode === m)?.tabs[0];
      if (first) select(first.id);
    },
    [mode, select],
  );

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
  const current = currentMeta ?? TABS[0];
  const currentGroup = GROUPS.find((g) => g.tabs.some((t) => t.id === active));

  const visibleGroups = useMemo(
    () => GROUPS.filter((g) => g.mode === mode && (g.mode !== "owner" || isOwner)),
    [mode, isOwner],
  );

  const nav = (
    <nav aria-label="Admin sections">
      {visibleGroups.map((g, i) => (
        // A real hairline between groups, not whitespace. Group boundaries
        // used to exist only as vertical gaps, which is the density problem
        // this rail was built to fix, one layer down.
        <div
          key={g.group}
          className={i === 0 ? "" : "mt-2 border-t pt-2"}
          style={i === 0 ? undefined : { borderColor: "var(--adm-line)" }}
        >
          {/* Sentence case. primitives.tsx bans tracked uppercase labels
              ("when everything is a heading, the eye has nothing to skip
              to"), and the rail should not contradict the panel below it. */}
          <p className="mb-1 px-2 font-sans text-[11.5px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
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

      {mode === "ops" ? (
        <RailLive
          pending={pendingOrders}
          revenueTodayCents={overview.data?.revenueTodayCents ?? null}
          paidSubs={
            overview.data ? overview.data.paidPlus + overview.data.paidPro : null
          }
          loading={overview.loading}
          onOpen={select}
        />
      ) : null}
    </nav>
  );

  // Identity, freshness, theme, and the way out.
  //
  // The "Owner dashboard" link that used to sit here is gone: it pointed at a
  // route that is now a redirect back into this shell, and the mode switch
  // above does the job without a navigation.
  const railFooter = (
    <div className="mt-2 shrink-0 border-t pt-2" style={{ borderColor: "var(--adm-line)" }}>
      <div
        className="mb-2 rounded-[var(--adm-radius-sm)] p-2"
        style={{ background: "var(--adm-panel-2)" }}
      >
        <div className="mb-1.5 flex items-center gap-2">
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
        {/* Says when the rail's numbers were last true. A live panel that
            cannot tell you it has gone stale is worse than a static one,
            because it looks current either way. */}
        <Freshness
          lastSynced={overview.lastSynced}
          failing={overview.failing}
          onRefresh={overview.refresh}
        />
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

  const railBody = (
    <>
      <Wordmark isOwner={isOwner} />
      {isOwner ? <ModeSwitch mode={mode} onChange={switchMode} /> : null}
    </>
  );

  const Current = current.component;

  return (
    <div className="adm min-h-[100dvh]">
        {/* Rail. Sticky on desktop so navigation is always one glance away,
            even a thousand rows into an order list.

            200px, up from 184, to pay for the icon column. That leaves ~136px
            of label, and "Subscriptions" is ~86px at 13px DM Sans, so the
            truncate never fires on any current label.

            Only the NAV region scrolls, not the whole rail. That is what keeps
            the identity block pinned no matter how many groups land, and it is
            what lets the live rows sit under the nav without pushing the
            footer off. The budget at 1366x768 is tight on purpose: four groups
            fit with room to spare, and a fifth spills a few pixels into the
            nav scroller rather than pushing anything off the rail. py-[5px] on
            the nav items is load-bearing, not taste. A sixth group wants
            collapsible sections, not tighter padding. */}
      {/* Fixed, not sticky. Sticky kept the rail inside the old centred
          max-w-[1400px] wrapper, which on a 1680px screen left 133px of dead
          margin on the left and 147px on the right, floated the rail 158px in
          from the edge, and squeezed the canvas to 1176px. Fixed anchors it to
          the viewport and hands those 284px back to the content.

          h-dvh, not h-[calc(100dvh-40px)]: the rail is flush now, so there is
          no inset to subtract. Only the NAV region scrolls, which is what keeps
          the identity block pinned however many groups land. */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[var(--adm-rail-w)] flex-col border-r p-3 lg:flex"
        style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
      >
        {railBody}
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        {railFooter}
      </aside>

      {/* The canvas. pl clears the fixed rail and nothing else constrains the
          width, so it grows with the viewport. min-w-0 is load-bearing: without
          it a wide DataTable would push this track past the viewport instead of
          scrolling inside its own box. */}
      <div className="min-w-0 lg:pl-[var(--adm-rail-w)]">
          {/* TOP BAR. Its own row, spanning the canvas, everything on one
              centre line.

              It used to share a row with the title under items-start, which put
              four elements on four different baselines: search at y=21, the
              eyebrow at 23, the toolbar at 29 and the title at 47. The toolbar
              landed between the eyebrow and the title, aligned to neither,
              which is what read as detached. Splitting the row means the bar
              aligns to itself and the title owns the line below.

              Sticky so the action bank and search stay reachable a thousand
              rows into an order list.

              ON THE Z-SCALE, because the obvious reading is wrong. TabSearch's
              listbox is z-30 but it is nested INSIDE this bar, so that number
              is scoped here and never competes with the bar itself. The one
              that does compete is SupportConsole's z-20 menu: the content
              wrapper below is only a stacking context while .adm-panel-enter
              is animating, and prefers-reduced-motion sets that animation to
              none, at which point the menu promotes to the root scale, ties a
              z-20 bar and wins on DOM order. So the wrapper isolates
              explicitly and the bar sits at 40. Scale: content 0-10, rail 30,
              bar 40, Modal 100. */}
          <div
            className="sticky top-0 z-40 border-b"
            style={{
              background: "color-mix(in oklab, var(--adm-bg), transparent 20%)",
              borderColor: "var(--adm-line)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* The bar's GROUND spans the canvas so the blur and the hairline
                reach both edges, but its CONTENTS are capped and centred on the
                same 1760 as the content below. Without the inner wrapper the
                search sits ~280px right of the content edge on a 2560 monitor,
                which is the same detachment this refactor set out to fix,
                relocated to a wider screen. */}
            <div className="mx-auto flex w-full max-w-[var(--adm-content-max)] flex-wrap items-center justify-end gap-2 px-4 py-3 md:px-6">
            <div className="mr-auto flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setNavOpen((v) => !v)}
                    aria-expanded={navOpen}
                    className="adm-control h-11 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
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
            </div>

                {/* Search and the one count that means someone is waiting.
                    Both sit left of the action bank so the row reads
                    identity, then find, then do. */}
                <TabSearch
                  tabs={visibleGroups.flatMap((g) =>
                    g.tabs.map((t) => ({
                      id: t.id,
                      label: t.label,
                      eyebrow: t.eyebrow,
                      group: g.group,
                    })),
                  )}
                  onSelect={(id) => isTabId(id) && select(id)}
                />
                <button
                  type="button"
                  onClick={() => select("orders")}
                  title={
                    pendingOrders
                      ? `${pendingOrders} order${pendingOrders === 1 ? "" : "s"} awaiting payment`
                      : "Nothing is waiting"
                  }
                  aria-label={
                    pendingOrders
                      ? `${pendingOrders} orders awaiting payment`
                      : "Nothing is waiting"
                  }
                  className="adm-control relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--adm-radius-sm)] border"
                  style={
                    {
                      borderColor: "var(--adm-line)",
                      color: "var(--adm-ink-2)",
                      "--_bg": "var(--adm-control)",
                      "--_bg-hover": "var(--adm-hover)",
                    } as React.CSSProperties
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M15.3 7.2a5.3 5.3 0 0 0-10.6 0c0 5-2 6.4-2 6.4h14.6s-2-1.4-2-6.4Z" />
                    <path d="M8.3 16.2a1.9 1.9 0 0 0 3.4 0" />
                  </svg>
                  {pendingOrders ? (
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-[var(--adm-radius-pill)] px-1 font-sans text-[10px] font-semibold tabular-nums"
                      style={{
                        background: "var(--adm-badge-bg)",
                        color: "var(--adm-badge-fg)",
                      }}
                    >
                      {pendingOrders}
                    </span>
                  ) : null}
                </button>
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
                {/* Status only. The email lives in the rail footer, where it
                    stays put. min-h reserves the line so the toolbar does not
                    shift when a rebuild starts. "Rebuild failed" still never
                    auto-clears: the harm was that it HID the identity, not
                    that it persisted, and silently hiding an error is
                    worse. */}
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

            {/* The drawer belongs to the bar, not to the content.

                Sections is pinned; the drawer used to render in flow further
                down the page, so tapping it eight hundred rows into Orders
                mounted a panel above the fold and the button read as dead.
                Anything triggered from a fixed element has to open against
                that element. */}
            {navOpen && (
              <div
                className="mx-auto w-full max-w-[var(--adm-content-max)] px-4 pb-3 md:px-6 lg:hidden"
              >
                <div
                  className="adm-panel-enter max-h-[70dvh] overflow-y-auto rounded-[var(--adm-radius-lg)] border p-3"
                  style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
                >
                  {railBody}
                  {nav}
                  {railFooter}
                </div>
              </div>
            )}
          </div>

          {/* CONTENT. The max-width lives here rather than on the shell, so the
              rail still reaches the viewport edge while prose and tables stop
              growing on an ultrawide monitor. 1760 binds only above roughly a
              2000px viewport and never on a 1680 screen, where it was the old
              1400 cap that was throwing away 280px.

              Measured before choosing: the widest prose line in the panel is
              198px, because the CARDS bound line length, not the page. So this
              is a guard against a 2560px monitor rather than the thing keeping
              text readable today. */}
          {/* isolation, not a z-index. This wrapper has to be a stacking
              context unconditionally, so that a z-20 menu inside a tab can
              never climb out and tie the bar. It used to be one only while
              its entrance animation ran, which made the layering correct or
              broken depending on the reader's motion preference. */}
          <div
            className="mx-auto w-full max-w-[var(--adm-content-max)] px-4 py-5 md:px-6"
            style={{ isolation: "isolate" }}
          >
            <header className="mb-5">
              <SectionHead
                eyebrow={currentGroup?.group}
                chip={current.eyebrow}
                title={current.label}
              />
            </header>

          {/* The hero is operations-only. Owner mode opens with its own
              measured/modelled split, and stacking a second set of headline
              numbers above it would put two different answers to "how are we
              doing" on one screen. */}
          {mode === "ops" ? (
            <HeroRow
              period={period}
              onPeriod={setPeriod}
              onOpenTab={(id) => isTabId(id) && select(id)}
              pendingOrders={pendingOrders}
              revenueSeries={overview.data?.revenueSeries ?? []}
              revenueLoading={overview.loading}
            />
          ) : null}

          {/* Keyed so the panel remounts on section change and its entrance
              replays. One 180ms move, not a staggered cascade: the operator
              chose this section and does not need to watch it assemble.

              The boundary sits here, inside the shell and around the active
              panel only. A route-level app/admin/error.tsx would sit above the
              rail and take the whole panel down, which is the failure this is
              for. */}
          <div key={active} className="adm-panel-enter">
            <TabBoundary label={current.label} onRetry={() => setReloadKey((n) => n + 1)}>
              {Current ? (
                <Current key={reloadKey} />
              ) : (
                <OwnerSection
                  key={reloadKey}
                  ownerEmail={adminEmail}
                  panel={ownerPanelOf(active)}
                />
              )}
            </TabBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
