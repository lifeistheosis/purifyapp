"use client";

// AdminShell: one panel, two modes, the quieter rail, and the open page.
//
// Was: eleven flat tabs in one horizontally scrolling row, then eleven tabs
// grouped in a rail, and a separate product at /owner that you reached by
// knowing the URL. The rail carries a segmented Operations | Owner, and
// flipping it swaps the nav list underneath. Same shell, no page load.
//
// THE QUIETER RAIL (the owner's pick A on sheet r3-15, 2026-10-30: "do A for
// the rail"). The rail stays on the left and never moves. Each Daily page
// carries the one figure he opens it for (4 waiting, 37 now, $96, +58), the
// open page is lit, and its views unfold under it in the rail, so the tabs
// inside tabs are gone: one level of views. On the phone the bar keeps Home,
// Traffic, Money and Users, More becomes rows (When needed, Tools, You) in a
// sheet above the bar, and the open page's views are a switch under its name.
//
// THREE THINGS IN HERE ARE LOAD-BEARING AND EASY TO BREAK.
//
// 1. This file must stay at components/admin/AdminShell.tsx and must contain
//    the string "<TabBoundary". lib/admin/__tests__/fetchGuards.test.ts finds
//    it by path suffix and asserts the boundary is INSIDE the shell, wrapped
//    around the active panel only, so a crashing tab cannot take the rail
//    down with it.
//
// 2. Owner tab ids are namespaced (owner-today, not a second parameter). The
//    hash writer below replaces the whole fragment, so a #panel=owner&tab=x
//    scheme would need that rewritten; one tab= parameter needs nothing. A
//    view that needs more than its id (the readers' waiting filter) takes it
//    through lib/admin/viewIntent.ts, not through the address.
//
// 3. Owner content is NOT imported here. See components/admin/OwnerSection.tsx
//    for why a static import would ship the projection engine to every admin.
//
// The #tab=<id> deep links are unchanged, and a retired id lands on the view
// that replaced it (lib/admin/pages.ts RETIRED_VIEWS), so old bookmarks land.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { MoneyOverviewTab } from "./tabs/MoneyOverviewTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { AmbassadorsTab } from "./tabs/AmbassadorsTab";
import { SustainabilityTab } from "./tabs/SustainabilityTab";
import { GoalsTab } from "./tabs/GoalsTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { CatechismTab } from "./tabs/CatechismTab";
import { FulfillmentTab } from "./tabs/FulfillmentTab";
import { InsightsProvider } from "@/lib/admin/insights/store";
import { SubscriptionsTab } from "./tabs/SubscriptionsTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { UsersTab } from "./tabs/UsersTab";
import { LiveCartsTab, AbandonedTab } from "./tabs/CartsTab";
import { PushTab } from "./tabs/PushTab";
import { DropTab } from "./tabs/DropTab";
import { ShopHubTab } from "./tabs/ShopHubTab";
import { EikonBoxTab } from "./tabs/EikonBoxTab";
import { CommunityTab } from "./tabs/CommunityTab";
import { ScreensView, TrafficMapTab, TrafficOverviewTab } from "./tabs/TrafficViews";
import { SourcesTab } from "./tabs/SourcesTab";
import { ContentTab } from "./tabs/ContentTab";
import { PatchNotesTab } from "./tabs/PatchNotesTab";
import { RatingsTab } from "./tabs/RatingsTab";
import { EmailTab } from "./tabs/EmailTab";
import { ContentHealthTab } from "./tabs/ContentHealthTab";
import { HealthTab } from "./tabs/HealthTab";
import { AuditLogTab } from "./tabs/AuditLogTab";
import { SourcingTab } from "./tabs/SourcingTab";
import { HomeTab } from "./tabs/HomeTab";
import { UsageTab } from "./tabs/UsageTab";
import { OnboardingTab } from "./tabs/OnboardingTab";
import { Segmented } from "./daily/parts";
import {
  ADMIN_PAGE_GROUPS,
  aliasesOf,
  headingOf,
  landingOf,
  pageOf,
  viewName,
  type AdminFigure,
  type AdminPage,
} from "@/lib/admin/pages";
import { decodeRail, encodeRail, railCookie, railDay, railFromUsage, type ViewUse } from "@/lib/admin/rail";
import { railFigure, type RailFigure } from "@/lib/admin/railFigures";
import { setViewIntent } from "@/lib/admin/viewIntent";
import { useUsageLog } from "@/lib/admin/useUsageLog";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { AdminSoundToggle } from "./AdminSoundToggle";
import { AdminMotionToggle } from "./AdminMotionToggle";
import { AdminStreamerToggle } from "./AdminStreamerToggle";
import { ActivityFeed } from "./ActivityFeed";
import { SENSITIVE, useStreamerOn } from "@/lib/admin/streamer";
import { AdminMobileNav, type MobileNavGroup } from "./AdminMobileNav";
import { installLarpWriteGuard, larpOn, setLarp, useLarpOn } from "@/lib/admin/larp";
import { TabBoundary } from "./TabBoundary";
import { OwnerSection } from "./OwnerSection";
import { AttentionStrip } from "./AttentionStrip";
import { useAttention } from "@/lib/admin/useAttention";
import { badgeFor } from "@/lib/admin/attention";
import { Freshness } from "./Freshness";
import { TabSearch } from "./TabSearch";
import { useLiveData } from "@/lib/admin/useLiveData";
import { markCountingOff } from "@/lib/onboarding/count";
import { StatusDot } from "./primitives";
import {
  isOwnerTab,
  modeOf,
  ownerPanelOf,
  resolveTab,
  type AdminMode as Mode,
  type OwnerTabId,
} from "@/lib/admin/tabs";

type OpsTabId =
  | "today"
  | "usage"
  | "overview"
  | "orders"
  | "revenue"
  | "costs"
  | "subscriptions"
  | "messages"
  | "users"
  | "carts"
  | "abandoned"
  | "catechism"
  | "fulfillment"
  | "push"
  | "drop"
  | "email"
  | "shop"
  | "eikon-box"
  | "community"
  | "traffic"
  | "traffic-map"
  | "sources"
  | "onboarding"
  | "screens"
  | "goals"
  | "calendar"
  | "content"
  | "patch-notes"
  | "ratings"
  | "content-health"
  | "health"
  | "sourcing"
  | "ambassadors"
  | "audit";

type TabId = OpsTabId | OwnerTabId;

type Tab = {
  id: TabId;
  label: string;
  component?: ComponentType;
};

// WHICH COMPONENT DRAWS EACH VIEW. lib/admin/pages.ts groups the views into
// pages; this says what each one draws. Owner views have no component here on
// purpose: they render through OwnerSection, which gates on a request before
// it imports anything.
//
// pages.test.ts holds that every id here is a view of exactly one page, and
// rail.test.ts that every page stays in the rail however it is sorted.
//
// `today` keeps its id though the page is called Home now (the owner's pick
// A, 2026-10-28), so every #tab=today bookmark still lands on it.
const COMPONENTS: Partial<Record<TabId, ComponentType>> = {
  today: HomeTab,
  overview: MoneyOverviewTab,
  orders: OrdersTab,
  fulfillment: FulfillmentTab,
  revenue: RevenueTab,
  costs: SustainabilityTab,
  subscriptions: SubscriptionsTab,
  users: UsersTab,
  carts: LiveCartsTab,
  abandoned: AbandonedTab,
  messages: MessagesTab,
  community: CommunityTab,
  ambassadors: AmbassadorsTab,
  shop: ShopHubTab,
  "eikon-box": EikonBoxTab,
  sourcing: SourcingTab,
  drop: DropTab,
  push: PushTab,
  email: EmailTab,
  traffic: TrafficOverviewTab,
  "traffic-map": TrafficMapTab,
  sources: SourcesTab,
  onboarding: OnboardingTab,
  screens: ScreensView,
  goals: GoalsTab,
  calendar: CalendarTab,
  content: ContentTab,
  "patch-notes": PatchNotesTab,
  ratings: RatingsTab,
  catechism: CatechismTab,
  "content-health": ContentHealthTab,
  health: HealthTab,
  audit: AuditLogTab,
  usage: UsageTab,
};

// The per-tab list the hash reader, the tab boundary and the owner check use.
// The search box reads the rail itself, so it follows the rail's order.
const TABS: Tab[] = ADMIN_PAGE_GROUPS.flatMap((g) =>
  g.pages.flatMap((p) =>
    p.views.map((v) => ({
      id: v.tab as TabId,
      label: viewName(p, v),
      component: COMPONENTS[v.tab as TabId],
    })),
  ),
);

function isTabId(s: string | null): s is TabId {
  return Boolean(s && TABS.some((t) => t.id === s));
}

// One check that the two lists agree. The pages are the rail's copy and
// lib/admin/tabs.ts is the permission layer's; if a fourth owner tab is added
// to one and not the other, the mismatch surfaces here at import time rather
// than as a section that renders but never gates.
if (
  process.env.NODE_ENV !== "production" &&
  ADMIN_PAGE_GROUPS.filter((g) => g.mode === "owner")
    .flatMap((g) => g.pages.flatMap((p) => p.views))
    .some((v) => !isOwnerTab(v.tab))
) {
  throw new Error("An owner-mode tab is missing from OWNER_TAB_IDS in lib/admin/tabs.ts");
}

type Badge = { count: number; title: string };

// Module scope, deliberately. Declared inside AdminShell's body it would be a
// NEW component type on every render, and React would unmount and remount
// every row whenever a poll landed, dropping keyboard focus mid-walk.
function NavItem({
  page,
  on,
  activeTab,
  figure,
  badge,
  viewBadge,
  onSelect,
}: {
  /** A page: the rail lists pages, and selecting one opens its first view. */
  page: AdminPage;
  on: boolean;
  activeTab: string;
  /** The page's one figure (pick A), or null when it has none or it could not be read. */
  figure: RailFigure | null;
  /**
   * A count of people waiting behind this page, or null. From badgeFor in
   * lib/admin/attention.ts, which returns null for zero AND for a source that
   * did not answer: a badge is a claim that somebody is waiting.
   */
  badge: Badge | null;
  viewBadge: (tab: string) => Badge | null;
  onSelect: (id: string) => void;
}) {
  const unfold = on && page.views.length > 1;
  return (
    <li>
      {/* A word per page, the open page solid ink and lit, its figure a quiet
          mono number at the end of the row. A page that has a figure and
          also has people waiting wears a ring before the figure, so a queue
          is still seen while the page is closed. */}
      <button
        type="button"
        onClick={() => onSelect(page.id)}
        aria-current={on ? "page" : undefined}
        aria-expanded={page.views.length > 1 ? on : undefined}
        className="adm-control flex min-h-[33px] w-full items-center gap-2 rounded-[var(--adm-radius-sm)] px-2.5 text-left font-sans text-[13.5px]"
        style={
          on
            ? ({
                "--_bg": "var(--adm-accent)",
                "--_bg-hover": "var(--adm-accent)",
                color: "var(--adm-on-accent)",
                fontWeight: 600,
                boxShadow: "var(--adm-lit)",
              } as React.CSSProperties)
            : ({
                "--_bg": "transparent",
                "--_bg-hover": "var(--adm-hover)",
                color: "var(--adm-ink-2)",
              } as React.CSSProperties)
        }
      >
        <span className="min-w-0 flex-1 truncate">{page.label}</span>
        {figure && badge && !on ? (
          <span title={badge.title} className="inline-flex">
            <StatusDot tone="wait" />
          </span>
        ) : null}
        {figure ? (
          <span
            className={"shrink-0 whitespace-nowrap font-mono text-[11.5px] font-medium " + (figure.sensitive ? SENSITIVE : "")}
            style={{ color: on ? "var(--adm-on-accent)" : "var(--adm-ink-3)", opacity: on ? 0.6 : 1 }}
            title={figure.title}
          >
            {figure.text}
          </span>
        ) : badge ? (
          <span
            className="shrink-0 font-mono text-[11.5px] font-medium"
            style={{ color: on ? "var(--adm-on-accent)" : "var(--adm-ink-3)", opacity: on ? 0.6 : 1 }}
            title={badge.title}
          >
            {badge.count}
          </span>
        ) : null}
      </button>
      {unfold ? (
        <ul className="adm-rail-views" aria-label={`${page.label} views`}>
          {page.views.map((v) => {
            const b = viewBadge(v.tab);
            return (
              <li key={v.tab}>
                <button
                  type="button"
                  onClick={() => onSelect(v.tab)}
                  aria-current={v.tab === activeTab ? "page" : undefined}
                  className="adm-rail-view font-sans"
                >
                  <span className="min-w-0 flex-1 truncate">{v.label}</span>
                  {b ? (
                    <span className="font-mono text-[11px] font-medium" style={{ color: "var(--adm-ink-3)" }} title={b.title}>
                      {b.count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * The Tools line: the pages he barely opens, folded into one quiet line of
 * links (the owner's pick A). Each link still opens its page and every view
 * under it, so nothing went away; it only stopped asking to be looked at. A
 * page with somebody waiting keeps its count beside its name.
 */
function ToolsLine({
  pages,
  activeId,
  badgeOf,
  onSelect,
}: {
  pages: AdminPage[];
  activeId: string;
  badgeOf: (p: AdminPage) => Badge | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul
      className="flex flex-wrap px-2.5 py-1 font-sans text-[12px] leading-[1.8]"
      style={{ color: "var(--adm-ink-3)" }}
    >
      {pages.map((p, i) => {
        const on = p.id === activeId;
        const badge = badgeOf(p);
        return (
          <li key={p.id} className="whitespace-nowrap">
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              aria-current={on ? "page" : undefined}
              title={badge?.title}
              className="rounded-[var(--adm-radius-xs)] underline-offset-[3px] hover:text-[color:var(--adm-ink)] hover:underline"
              style={on ? { color: "var(--adm-ink)", fontWeight: 600 } : undefined}
            >
              {p.label}
              {badge ? (
                <span className="ml-1 font-mono text-[10.5px]" style={{ color: "var(--adm-ink-2)" }}>
                  {badge.count}
                </span>
              ) : null}
            </button>
            {i < pages.length - 1 ? (
              <span aria-hidden className="mr-1" style={{ opacity: 0.6 }}>
                ,
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Operations | Owner. It replaces a link to another route, so it reads as a
 * place you are rather than a place you go: the switch every period in the
 * panel is, the half you are in solid.
 */
function ModeSwitch({ mode, onChange, tall = false }: { mode: Mode; onChange: (m: Mode) => void; tall?: boolean }) {
  return (
    <Segmented<Mode>
      label="Panel"
      options={[
        ["ops", "Operations"],
        ["owner", "Owner"],
      ]}
      value={mode}
      onChange={onChange}
      stretch
      tall={tall}
    />
  );
}

// A neutral mark, not an accented one: the rail's one lit thing is the open
// page, and a branded tile would be a second one competing for the same eye.
function Wordmark({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-2 px-1.5 py-[3px]">
      <span
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]"
        style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}
        aria-hidden
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M8 2.2v11.6M5.9 4.4h4.2M4.2 7.1h7.6M6.1 10.6l3.8-1.1" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        Purify
      </span>
      {/* The role, not a plan tier: which of the two gates this session
          cleared. A quiet outlined label, because a fill here would mean
          chosen, and the tag is a fact. */}
      <span
        className="shrink-0 rounded-[var(--adm-radius-xs)] border px-1.5 font-sans text-[11px]"
        style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
      >
        {isOwner ? "Owner" : "Admin"}
      </span>
    </div>
  );
}

type OverviewPayload = {
  /** null when the count could not be taken. */
  ordersPending: number | null;
  /** null when shop_orders could not be read. */
  revenueTodayCents: number | null;
  revenueSeries: number[];
  /** Which ledger the revenue fields came from. Absent on older payloads. */
  revenueSource?: "stripe" | "shop";
  /** True when the money fields above are unmeasured rather than zero. */
  ordersDegraded: boolean;
  paidPlus: number;
  paidPro: number;
};

/** What the rail's Traffic and Users figures read: the stats poll the bell already runs. */
type StatsPayload = {
  liveCount: number | null;
  today?: { signups: number | null } | null;
};

export function AdminShell({
  adminEmail,
  isOwner = false,
  savedRail = null,
}: {
  adminEmail: string;
  /** Resolved server-side by getOwnerUser(). Controls whether the Owner
      segment renders. It is NOT the data gate: see OwnerSection.tsx. */
  isOwner?: boolean;
  /**
   * The rail's order as this browser last worked it out from the usage log,
   * read by the server from the adm_rail cookie (lib/admin/rail.ts says why
   * a cookie) so the rail is drawn in that order from the first paint.
   * Absent or unreadable: the rail as the owner picked it.
   */
  savedRail?: string | null;
}) {
  // Two names on purpose. `requested` is whatever the hash or a click asked
  // for; `active` is what this account may actually see. Deriving the second
  // from the first during render keeps a non-owner off an owner tab without
  // an effect that calls setState.
  const [requested, setActive] = useState<TabId>("today");
  // Only for the rail's title attribute, which CSS cannot blur. Everything
  // else that hides on stream does it with .adm-sensitive.
  const streaming = useStreamerOn();

  // LARP MODE. Type the word anywhere in the panel that is not a text field.
  // A key sequence rather than a control, because it is a demo switch and a
  // button for it would sit in the toolbar inviting a mis-click on a real
  // dashboard.
  const larp = useLarpOn();
  // Installed unconditionally and consulted per request, so it is already in
  // place the moment the mode is switched on. See lib/admin/larp.ts.
  useEffect(() => installLarpWriteGuard(), []);
  // A device the admin is opened on is the owner's or the team's: its own
  // walks through the onboarding are kept out of the onboarding's totals
  // from now on (lib/onboarding/count.ts).
  useEffect(() => markCountingOff(), []);
  useEffect(() => {
    let buf = "";
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-4);
      if (buf === "larp") {
        buf = "";
        const next = !larpOn();
        setLarp(next);
        // Reload rather than refetch by hand. Every tab reads through
        // adminJson, and the inflation happens there.
        window.location.reload();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bumped by the tab boundary's Try again, so a recovered panel re-mounts and
  // re-fetches instead of needing a page reload.
  const [reloadKey, setReloadKey] = useState(0);

  // One overview poll for the whole shell: the rail's Money figure, the
  // freshness line and the attention summary all read it. liveStore runs one
  // timer per URL, so the other subscribers to it cost nothing.
  const overview = useLiveData<OverviewPayload>("/api/admin/overview", 60_000);
  // The stats poll the bell in the top bar already runs (ActivityFeed, 20s):
  // who is on the site now and how many joined today, the rail's Traffic and
  // Users figures. Same URL and interval, so the same one timer.
  const stats = useLiveData<StatsPayload>("/api/admin/stats", 20_000);

  // "Is anything wrong", derived once for the whole shell. The strip above
  // every tab, the Home's to-do and the rail all read this one summary.
  const attention = useAttention();

  const active = resolveTab(requested, isOwner) as TabId;
  const mode = modeOf(active);
  // The page the open view belongs to: the rail lights it, the header names
  // it, and its views unfold under it.
  const page: AdminPage = pageOf(active) ?? ADMIN_PAGE_GROUPS[0].pages[0];
  const heading = headingOf(page, active);

  // The hash is the source of truth for which tab is open, but it can only be
  // read on the client. Read in an effect, and hold the WRITER back until that
  // read has happened, so the first commit's default cannot overwrite an
  // incoming deep link. Effects run in declaration order.
  const bootstrapped = useRef(false);

  useEffect(() => {
    function readHash() {
      const h = window.location.hash.replace(/^#/, "");
      const to = landingOf(new URLSearchParams(h).get("tab") ?? "");
      if (to && isTabId(to.tab)) {
        setViewIntent(to.tab, to.intent);
        setActive(to.tab);
      }
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

  // Every way of opening a view comes through here: the rail, the phone bar,
  // search, the strip and a page's own links. A retired id lands on the view
  // that replaced it, with what it asked for.
  const select = useCallback((id: string) => {
    const to = landingOf(id);
    if (!to || !isTabId(to.tab)) return;
    setViewIntent(to.tab, to.intent);
    setActive(to.tab);
  }, []);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    const first = ADMIN_PAGE_GROUPS.find((g) => g.mode === m)?.pages[0];
    if (first) select(first.id);
  };

  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  // THE RAIL, SORTED BY HIS USE (the owner's pick A, 2026-10-28). Decoded from
  // what the server read, so the first paint is already in that order, and
  // fixed for the whole visit: moving a rail under the pointer that is
  // reaching for it is worse than a rail that never moves.
  const rail = decodeRail(savedRail);

  // ...and the NEXT visit's order, worked out at most once a day from the
  // route the "Your use" readout already reads, and left in the cookie for
  // the server. A log that does not answer leaves the rail as it is.
  useEffect(() => {
    const today = railDay(new Date());
    if (rail.day === today) return;
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/admin/usage", { cache: "no-store" });
        if (!alive || !r.ok) return;
        const body = (await r.json()) as { views?: ViewUse[] };
        if (!alive || !Array.isArray(body.views)) return;
        document.cookie = railCookie(
          encodeRail(railFromUsage(body.views), today),
          window.location.protocol === "https:",
        );
      } catch {
        // Offline, or a body that is not JSON: no new order this time.
      }
    })();
    return () => {
      alive = false;
    };
  }, [rail.day]);

  const visiblePageGroups =
    mode === "ops"
      ? rail.groups.filter((g) => g.pages.length > 0)
      : ADMIN_PAGE_GROUPS.filter((g) => g.mode === "owner" && isOwner);
  // Group, page, view; a step that repeats the one before it is left out, so
  // Messages reads "When needed / Messages" and not "... / Messages / Messages".
  const crumbs = [
    visiblePageGroups.find((g) => g.pages.some((p) => p.id === page.id))?.group,
    page.label,
    page.views.length > 1 ? page.views.find((v) => v.tab === active)?.label : undefined,
  ].filter((c, i, all): c is string => Boolean(c) && c !== all[i - 1]);

  // A view's badge counts what its own id counts and what every retired id
  // that lands on it counted (the readers' view still counts the blue check
  // requests Verification used to); a page's badge is the first of its views'.
  const viewBadge = (tab: string): Badge | null =>
    [tab, ...aliasesOf(tab)].map((t) => badgeFor(attention.summary, t)).find((b) => b !== null) ?? null;
  const pageBadge = (p: AdminPage): Badge | null =>
    p.views.map((v) => viewBadge(v.tab)).find((b) => b !== null) ?? null;

  // The one figure each Daily page carries (pick A, lib/admin/railFigures.ts).
  const todo = attention.summary.faults.length + attention.summary.queues.length;
  const readings = {
    waiting: attention.summary.state === "checking" && todo === 0 ? null : todo,
    live: stats.data?.liveCount ?? null,
    revenueTodayCents:
      overview.data && !overview.data.ordersDegraded ? (overview.data.revenueTodayCents ?? null) : null,
    signupsToday: stats.data?.today?.signups ?? null,
  };
  const figureOf = (f: AdminFigure | undefined): RailFigure | null => (f ? railFigure(f, readings) : null);

  // How the admin is used, for admin accounts only (lib/admin/useUsageLog.ts).
  useUsageLog(active);

  const nav = (
    <nav aria-label="Admin sections">
      {visiblePageGroups.map((g, i) => (
        // Three groups with a quiet name each, set apart by room rather than
        // rules, as the design draws them.
        <div key={g.group} className={i === 0 ? "" : "mt-4"}>
          {/* A group of one page with its own name needs no heading. */}
          {g.pages.length === 1 && g.pages[0].label === g.group ? null : (
            <p className="mb-1 px-2.5 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
              {g.group}
            </p>
          )}
          {g.quiet ? (
            <ToolsLine pages={g.pages} activeId={page.id} badgeOf={pageBadge} onSelect={select} />
          ) : (
            <ul className="space-y-px">
              {g.pages.map((p) => (
                <NavItem
                  key={p.id}
                  page={p}
                  on={p.id === page.id}
                  activeTab={active}
                  figure={figureOf(p.figure)}
                  badge={pageBadge(p)}
                  viewBadge={viewBadge}
                  onSelect={select}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );

  // The switches, folded under Settings: one row until it is opened.
  const settings = (
    <details className="group">
      <summary
        className="adm-control flex min-h-[40px] w-full cursor-pointer list-none items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 font-sans text-[12.5px] [&::-webkit-details-marker]:hidden"
        style={
          {
            color: "var(--adm-ink-2)",
            "--_bg": "transparent",
            "--_bg-hover": "var(--adm-hover)",
          } as React.CSSProperties
        }
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <path d="M3 6h9M15 6h2M3 14h2M8 14h9" />
          <circle cx="13.5" cy="6" r="1.8" />
          <circle cx="6.5" cy="14" r="1.8" />
        </svg>
        <span className="flex-1">Settings</span>
        <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-1 flex flex-col gap-1">
        <div className="grid grid-cols-3 gap-1">
          <AdminThemeToggle />
          <AdminSoundToggle />
          <AdminMotionToggle />
        </div>
        <a
          href="/signout"
          className="adm-control flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
          style={
            {
              color: "var(--adm-ink-2)",
              "--_bg": "transparent",
              "--_bg-hover": "var(--adm-hover)",
            } as React.CSSProperties
          }
        >
          <SignOutGlyph />
          <span>Sign out</span>
        </a>
      </div>
    </details>
  );

  // Identity, freshness, and the settings, at the foot of the rail.
  const railFooter = (
    <div className="mt-2 shrink-0 border-t pt-2.5" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 py-[7px]" style={{ background: "var(--adm-panel-2)" }}>
        <span
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-sans text-[11px] font-semibold uppercase"
          style={{ background: "var(--adm-accent)", color: "var(--adm-on-accent)" }}
          aria-hidden
        >
          {adminEmail.slice(0, 1)}
        </span>
        {/* The signed-in address, a real person's, on every screen. The title
            is dropped under streamer mode, or the tooltip would hand back
            exactly what the blur is covering. */}
        <span
          className="adm-sensitive min-w-0 flex-1 truncate font-sans text-[11.5px]"
          style={{ color: "var(--adm-ink-2)" }}
          title={streaming ? undefined : adminEmail}
        >
          {adminEmail}
        </span>
      </div>
      {/* When the rail's numbers were last true. A live panel that cannot
          tell you it has gone stale is worse than a static one. */}
      <div className="px-2 pb-1 pt-2">
        <Freshness lastSynced={overview.lastSynced} failing={overview.failing} onRefresh={overview.refresh} />
      </div>
      {settings}
    </div>
  );

  // The phone's You rows (More's third group): who is signed in and when the
  // numbers were true, the Operations | Owner switch, Settings, Sign out.
  const phoneYou = (
    <div className="space-y-2.5">
      <div className="rounded-[12px] border px-3.5 py-3" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full font-sans text-[12px] font-semibold uppercase"
            style={{ background: "var(--adm-accent)", color: "var(--adm-on-accent)" }}
            aria-hidden
          >
            {adminEmail.slice(0, 1)}
          </span>
          <span className="adm-sensitive min-w-0 flex-1 truncate font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
            {adminEmail}
          </span>
        </div>
        <div className="mt-1.5 pl-[36px]">
          <Freshness lastSynced={overview.lastSynced} failing={overview.failing} onRefresh={overview.refresh} />
        </div>
        {isOwner ? (
          <div className="mt-3">
            <ModeSwitch mode={mode} onChange={switchMode} tall />
          </div>
        ) : null}
      </div>
      <div className="rounded-[12px] border px-2 py-1" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        {settings}
      </div>
    </div>
  );

  const Current = current.component;

  // The phone's sheet: the rail's groups, each page with its sentence and
  // whoever waits behind it.
  const mobileGroups: MobileNavGroup[] = visiblePageGroups.map((g) => ({
    group: g.group,
    quiet: g.quiet,
    tabs: g.pages.map((p) => {
      const b = pageBadge(p);
      return { id: p.id, label: p.label, sentence: p.sentence, badge: b ? { count: b.count, title: b.title } : null };
    }),
  }));

  return (
    // The insights engine wraps the WHOLE shell, not one tab: a report
    // imported on one page is still there on the next, and the goals and the
    // dashboard read the same grades. Mounted per tab, every navigation would
    // throw the state away.
    <InsightsProvider>
      <div className="adm adm-page min-h-[100dvh]">
        {/* The rail. Fixed to the viewport so it reaches its full height and
            the canvas keeps the rest of the width. Only the nav region
            scrolls, which keeps the identity block pinned. */}
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[var(--adm-rail-w)] flex-col border-r px-3 pb-3 pt-3.5 lg:flex"
          style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}
        >
          <Wordmark isOwner={isOwner} />
          {isOwner ? (
            <div className="mb-1 mt-2.5">
              <ModeSwitch mode={mode} onChange={switchMode} />
            </div>
          ) : null}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{nav}</div>
          {railFooter}
        </aside>

        {/* The canvas. pl clears the fixed rail and nothing else constrains
            the width. min-w-0 is load-bearing: without it a wide table would
            push this track past the viewport instead of scrolling inside its
            own box. */}
        <div className="min-w-0 lg:pl-[var(--adm-rail-w)]">
          {/* TOP BAR: the path, the bell, search and the stream eye, on one
              centre line. Sticky so search stays in reach a thousand rows into
              an order list. z-scale: content 0-10, rail 30, bar 40, Modal 100. */}
          <div
            className="adm-topbar sticky top-0 z-40 border-b"
            style={{ background: "var(--adm-bg)", borderColor: "var(--adm-line)" }}
          >
            <div className="mx-auto flex w-full max-w-[var(--adm-content-max)] items-center justify-end gap-2 px-4 py-3 md:px-6">
              <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 md:block">
                <ol className="flex min-w-0 items-center gap-1.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {crumbs.map((c, i) => (
                    <li key={c + i} className="flex min-w-0 items-center gap-1.5">
                      {i > 0 ? <span aria-hidden>/</span> : null}
                      <span className="truncate" style={i === crumbs.length - 1 ? { color: "var(--adm-ink)" } : undefined}>
                        {c}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
              <ActivityFeed strip={false} />
              {/* Every view of every page in the rail, under the rail's own
                  group names, so a view folded into Tools is still one search
                  away. */}
              <TabSearch
                tabs={visiblePageGroups.flatMap((g) =>
                  g.pages.flatMap((p) =>
                    p.views.map((v) => ({
                      id: v.tab,
                      label: viewName(p, v),
                      eyebrow: headingOf(p, v.tab).sentence,
                      group: g.group,
                    })),
                  ),
                )}
                onSelect={select}
              />
              <AdminStreamerToggle compact />
            </div>
          </div>

          {/* CONTENT. isolation, not a z-index: this wrapper is a stacking
              context unconditionally, so a menu inside a tab can never climb
              out and tie the bar. The bottom clearance for the phone's bar is
              set by .adm-canvas in admin-theme.css. */}
          <div
            className="adm-canvas mx-auto w-full max-w-[var(--adm-content-max)] px-4 pt-5 md:px-7"
            style={{ isolation: "isolate" }}
          >
            {larp ? (
              /* A warning, not a failure, so its box is DASHED: what is on
                 screen is not the books. */
              <div
                role="status"
                className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--adm-radius)] border border-dashed px-3 py-2"
                style={{
                  borderColor: "var(--adm-warn)",
                  background: "color-mix(in oklab, var(--adm-warn), transparent 94%)",
                }}
              >
                <span className="font-sans text-caption font-semibold text-[color:var(--adm-warn)]">Larp mode</span>
                <span className="font-sans text-detail text-paper/80">
                  Numbers here are inflated for design work, not your real revenue, users, or sales. A few fields stay
                  true, so read none of them as fact. Saving is disabled while this is on.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLarp(false);
                    window.location.reload();
                  }}
                  className="ml-auto rounded-pill border px-2.5 py-1 font-sans text-caption font-semibold text-paper/85"
                  style={{ borderColor: "var(--adm-line-strong)" }}
                >
                  Turn off
                </button>
              </div>
            ) : null}
            {/* "Is anything wrong", on every page but Home, whose list of what
                needs him is this same summary in full. Only while there is
                something to say. */}
            {active === "today" ? null : (
              <AttentionStrip
                summary={attention.summary}
                isOverview={mode === "ops" && active === "overview"}
                onOpenTab={select}
                onRetry={attention.refresh}
              />
            )}
            {/* Every page opens the same way: its name and one sentence of
                what it is for. On the desktop its views are in the rail; on a
                phone they are the switch under the name. */}
            <header className="mb-5">
              <h1
                className="font-sans text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[27px]"
                style={{ color: "var(--adm-ink)" }}
              >
                {heading.title}
              </h1>
              <p className="mt-1 font-sans text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {heading.sentence}
              </p>
              {page.views.length > 1 ? (
                <div className="mt-3.5 lg:hidden">
                  <Segmented<string>
                    label={`${page.label} views`}
                    options={page.views.map((v) => [v.tab, v.label] as const)}
                    value={active}
                    onChange={select}
                    scroll
                    tall
                  />
                </div>
              ) : null}
            </header>

            {/* Keyed so the panel remounts on a change of view and its
                entrance replays: one 180ms move, not a cascade. The boundary
                sits here, inside the shell and around the open view only, so
                a view that throws cannot take the rail down with it. */}
            <div key={active} className="adm-panel-enter">
              <TabBoundary label={current.label} onRetry={() => setReloadKey((n) => n + 1)}>
                {Current ? (
                  <Current key={reloadKey} />
                ) : (
                  <OwnerSection key={reloadKey} ownerEmail={adminEmail} panel={ownerPanelOf(active)} />
                )}
              </TabBoundary>
            </div>
          </div>
        </div>
      </div>
      {/* Below lg the rail is gone and this is the whole navigation. It gates
          itself with lg:hidden, and the canvas above reserves the space it
          takes so a fixed bar never sits on the last table row. */}
      <AdminMobileNav
        groups={mobileGroups}
        // The bar's slots are the rail's Daily: Home and the three pages read
        // most. Owner mode has no Daily and keeps More alone.
        primary={mode === "ops" ? (visiblePageGroups[0]?.pages.map((p) => p.id) ?? []) : []}
        active={page.id}
        onSelect={select}
        you={phoneYou}
      />
    </InsightsProvider>
  );
}

function SignOutGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 17.2H4.6a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8H8" />
      <path d="M12.8 13.6 16.4 10l-3.6-3.6M16.4 10H7.4" />
    </svg>
  );
}
