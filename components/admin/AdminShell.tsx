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
  useRef,
  useState,
  type ComponentType,
} from "react";
import { CommerceOverviewTab } from "./tabs/CommerceOverviewTab";
import { VerificationTab } from "./tabs/VerificationTab";
import { BadgesTab } from "./tabs/BadgesTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { AmbassadorsTab } from "./tabs/AmbassadorsTab";
import { SustainabilityTab } from "./tabs/SustainabilityTab";
import { GoalsTab } from "./tabs/GoalsTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { CatechismTab } from "./tabs/CatechismTab";
import { InsightsProvider } from "@/lib/admin/insights/store";
import { SubscriptionsTab } from "./tabs/SubscriptionsTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { UsersHubTab } from "./tabs/UsersHubTab";
import { PushTab } from "./tabs/PushTab";
import { DropTab } from "./tabs/DropTab";
import { ShopHubTab } from "./tabs/ShopHubTab";
import { EikonBoxTab } from "./tabs/EikonBoxTab";
import { CommunityTab } from "./tabs/CommunityTab";
import { TrafficHubTab } from "./tabs/TrafficHubTab";
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
import { ScreensTab } from "./tabs/ScreensTab";
import { SubTabs } from "./primitives";
import { ADMIN_PAGE_GROUPS, pageOf, viewName, type AdminPage } from "@/lib/admin/pages";
import { decodeRail, encodeRail, railCookie, railDay, railFromUsage, type ViewUse } from "@/lib/admin/rail";
import { useUsageLog } from "@/lib/admin/useUsageLog";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { AdminSoundToggle } from "./AdminSoundToggle";
import { AdminMotionToggle } from "./AdminMotionToggle";
import { AdminStreamerToggle } from "./AdminStreamerToggle";
import { ActivityFeed } from "./ActivityFeed";
import { useStreamerOn } from "@/lib/admin/streamer";
import { AdminMobileNav } from "./AdminMobileNav";
import { installLarpWriteGuard, larpOn, setLarp, useLarpOn } from "@/lib/admin/larp";
import { TabBoundary } from "./TabBoundary";
import { OwnerSection } from "./OwnerSection";
import { HeroRow } from "./HeroRow";
import { AttentionStrip } from "./AttentionStrip";
import { useAttention } from "@/lib/admin/useAttention";
import { badgeFor } from "@/lib/admin/attention";
import { type PeriodId } from "./hero";
import { Freshness } from "./Freshness";
import { TabSearch } from "./TabSearch";
import { useLiveData } from "@/lib/admin/useLiveData";
import { markCountingOff } from "@/lib/onboarding/count";
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
  | "catechism"
  | "fulfillment"
  | "push"
  | "drop"
  | "email"
  | "shop"
  | "eikon-box"
  | "community"
  | "verification"
  | "badges"
  | "traffic"
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
  eyebrow: string;
  component?: ComponentType;
};

type Group = { group: string; mode: Mode; tabs: Tab[] };

// WHICH COMPONENT DRAWS EACH VIEW. The rail no longer lists these one by one:
// lib/admin/pages.ts groups them into pages (1.8 admin silent patch, the
// owner's "as simplistic as his"), and a page's views are the tabs under its
// title. Owner views have no component here on purpose: they render through
// OwnerSection, which gates on a request before it imports anything.
//
// Library files, Services and Content were once dropped from the rail by a
// restructure that never finished (c0d7994a); they are views of pages in the
// Tools line now, so they cannot go missing that way again. pages.test.ts
// holds that every id here is a view of exactly one page, and rail.test.ts
// that every page stays in the rail however it is sorted.
//
// `today` keeps its id though the page is called Home now (the owner's pick
// A, 2026-10-28), so every #tab=today bookmark still lands on it.
const COMPONENTS: Partial<Record<TabId, ComponentType>> = {
  today: HomeTab,
  overview: CommerceOverviewTab,
  orders: OrdersTab,
  revenue: RevenueTab,
  costs: SustainabilityTab,
  subscriptions: SubscriptionsTab,
  users: UsersHubTab,
  verification: VerificationTab,
  badges: BadgesTab,
  messages: MessagesTab,
  community: CommunityTab,
  ambassadors: AmbassadorsTab,
  shop: ShopHubTab,
  "eikon-box": EikonBoxTab,
  sourcing: SourcingTab,
  drop: DropTab,
  push: PushTab,
  email: EmailTab,
  traffic: TrafficHubTab,
  onboarding: OnboardingTab,
  screens: ScreensTab,
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
// Label is the view's own name; eyebrow is its page's sentence. The search box
// reads the rail itself, so it follows the rail's order and group names.
const GROUPS: Group[] = ADMIN_PAGE_GROUPS.map((g) => ({
  group: g.group,
  mode: g.mode,
  tabs: g.pages.flatMap((p) =>
    p.views.map((v) => ({
      id: v.tab as TabId,
      label: viewName(p, v),
      eyebrow: p.sentence,
      component: COMPONENTS[v.tab as TabId],
    })),
  ),
}));

const TABS: Tab[] = GROUPS.flatMap((g) => g.tabs);

function isTabId(s: string | null): s is TabId {
  return Boolean(s && TABS.some((t) => t.id === s));
}

// Tabs that no longer exist, and where their bookmarks should land instead.
// Without this a #tab= link to a removed tab silently opens Overview, which
// reads as the panel ignoring the link.
const RETIRED_TABS: Record<string, TabId> = {
  growth: "traffic",
  // Fulfillment's tiles and board retired into Orders (the owner's r3-16
  // pick B, 2026-10-30): every order opens there as its whole story.
  fulfillment: "orders",
};

/** A tab id from a URL, following a retired id to its replacement. */
function resolveHashTab(s: string | null): TabId | null {
  if (isTabId(s)) return s;
  const moved = s ? RETIRED_TABS[s] : undefined;
  return moved ?? null;
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
  /** A page: the rail lists pages, and selecting one opens its first view. */
  t: AdminPage;
  on: boolean;
  /**
   * A count of people waiting behind this tab, or null. From badgeFor in
   * lib/admin/attention.ts, which returns null for zero AND for a source
   * that did not answer: a badge is a claim that somebody is waiting, and a
   * failed read cannot make it.
   */
  badge: { count: number; title: string } | null;
  onSelect: (id: TabId) => void;
}) {
  return (
    <li>
      {/* The owner's pick A, as drawn: a word per page, no glyph, the open
          page solid (the panel's one meaning for a fill is "chosen"), and a
          count of who is waiting as a quiet figure at the end of the row. The
          phone bar keeps its glyphs, where a word alone is too small to hit. */}
      <button
        type="button"
        onClick={() => onSelect(t.id as TabId)}
        aria-current={on ? "page" : undefined}
        className="adm-control flex w-full items-center justify-between gap-2 rounded-[var(--adm-radius-sm)] px-2.5 py-[7px] text-left font-sans text-[13.5px]"
        style={
          on
            ? ({
                "--_bg": "var(--adm-accent)",
                "--_bg-hover": "var(--adm-accent)",
                color: "var(--adm-on-accent)",
                fontWeight: 600,
              } as React.CSSProperties)
            : ({
                "--_bg": "transparent",
                "--_bg-hover": "var(--adm-hover)",
                color: "var(--adm-ink-2)",
              } as React.CSSProperties)
        }
      >
        <span className="min-w-0 flex-1 truncate">{t.label}</span>
        {badge ? (
          <span
            className="shrink-0 font-mono text-[10.5px] font-normal"
            style={{ color: on ? "var(--adm-on-accent)" : "var(--adm-ink-3)", opacity: on ? 0.7 : 1 }}
            title={badge.title}
          >
            {badge.count}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * The Tools line: the pages he barely opens, folded into one quiet line of
 * links (the owner's pick A). Each link still opens its page and every view
 * under it, so nothing went away; it only stopped asking to be looked at. A
 * page with somebody waiting keeps its count beside its name, so a queue
 * that lands in here is still seen.
 */
function ToolsLine({
  pages,
  activeId,
  badgeOf,
  onSelect,
}: {
  pages: AdminPage[];
  activeId: string;
  badgeOf: (p: AdminPage) => { count: number; title: string } | null;
  onSelect: (id: TabId) => void;
}) {
  return (
    <ul
      className="flex flex-wrap px-2.5 py-1 font-sans text-[12px] leading-[1.7]"
      style={{ color: "var(--adm-ink-3)" }}
    >
      {pages.map((p, i) => {
        const on = p.id === activeId;
        const badge = badgeOf(p);
        return (
          <li key={p.id} className="whitespace-nowrap">
            <button
              type="button"
              onClick={() => onSelect(p.id as TabId)}
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
 * Operations | Owner.
 *
 * The whole merge is this control. It replaces a link to another route, so
 * it has to read as a place you are rather than a place you go: one outlined
 * box with a hairline between its two halves and the half you are in filled,
 * the same switch PeriodChips is.
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
      className="mb-3 grid grid-cols-2 overflow-hidden rounded-[var(--adm-radius-sm)] border"
      style={{ borderColor: "var(--adm-line-strong)" }}
    >
      {(["ops", "owner"] as const).map((m) => {
        const on = m === mode;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={on}
            className="adm-control h-11 border-l font-sans text-[12.5px] font-medium first:border-l-0"
            style={
              on
                ? ({
                    "--_bg": "var(--adm-accent)",
                    "--_bg-hover": "var(--adm-accent)",
                    borderColor: "var(--adm-accent)",
                    color: "var(--adm-on-accent)",
                  } as React.CSSProperties)
                : ({
                    "--_bg": "transparent",
                    "--_bg-hover": "var(--adm-panel-2)",
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  } as React.CSSProperties)
            }
          >
            {m === "ops" ? "Operations" : "Owner"}
          </button>
        );
      })}
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
          changes what is on screen.

          A quiet outlined label, the same for both roles. It was a filled
          capsule in capitals, and a fill here means chosen or do-this: the
          tag is neither, it is a fact. Grey, not ink: a word in a box of
          full ink is the panel's mark for a failure (Pill, rose). */}
      <span
        className="shrink-0 rounded-[var(--adm-radius-xs)] border px-1.5 font-sans text-[11px] font-medium"
        style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
      >
        {isOwner ? "Owner" : "Admin"}
      </span>
    </div>
  );
}

type OverviewPayload = {
  /** null when the count could not be taken. Rendered as a dash, never as 0. */
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
  // from the first during render is what keeps a non-owner off an owner tab
  // without an effect that calls setState, which React flags as a cascading
  // render and which AdminThemeToggle and useTween both learned the hard way.
  const [requested, setActive] = useState<TabId>("today");
  const [navOpen, setNavOpen] = useState(false);
  // Only for the rail's title attribute, which CSS cannot blur. Everything
  // else that hides on stream does it with .adm-sensitive.
  const streaming = useStreamerOn();

  // LARP MODE. Type the word anywhere in the panel that is not a text field.
  // A key sequence rather than a control, because it is a demo switch and a
  // button for it would sit in the toolbar inviting a mis-click on a real
  // dashboard. Typing into an input is excluded, or searching for "larp" in
  // Users would flip the books.
  const larp = useLarpOn();
  // Installed unconditionally and consulted per request, so it is already in
  // place the moment the mode is switched on, including in the tab that just
  // switched it. See the note at the foot of lib/admin/larp.ts.
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
        // adminJson, and the inflation happens there, so the honest way to get
        // a consistent panel is to read everything again.
        window.location.reload();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const navTriggerRef = useRef<HTMLButtonElement | null>(null);

  // THE MOBILE DRAWER'S KEYBOARD CONTRACT, which it did not have.
  //
  // No Escape: the only way to dismiss it was to point at the scrim, which is
  // a control with no visible bounds. And closing it dropped focus entirely,
  // because every path that closes it (the scrim, Escape, and select() on a
  // nav item) unmounts the element that was focused, which leaves focus on
  // <body> and sends the next Tab back to the top of the document.
  //
  // The cleanup runs on every close, not only on Escape, which is why the
  // focus return lives there rather than in the key handler.
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    // Copied out of the ref now, because by cleanup time the ref may point
    // somewhere else. The trigger is the same node either way, but the rule
    // that flags this is right in general and the copy costs nothing.
    const trigger = navTriggerRef.current;
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [navOpen]);
  const [period, setPeriod] = useState<PeriodId>("30d");
  // Bumped by the tab boundary's Try again, so a recovered panel re-mounts and
  // re-fetches instead of needing a page reload.
  const [reloadKey, setReloadKey] = useState(0);

  // One overview poll for the whole shell: the rail's live rows, the orders
  // badge, and the hero's revenue card all read it. Three consumers, one
  // request. 60s because that is the floor useLiveData documents for a
  // route anything metered sits behind.
  const overview = useLiveData<OverviewPayload>("/api/admin/overview", 60_000);

  // "Is anything wrong", derived once for the whole shell. The strip above
  // every tab, the Waiting-on-you card on Overview and the rail badges all
  // read this one summary, so they cannot disagree. It subscribes to the same
  // overview URL as the line above; liveStore dedupes that into one timer.
  const attention = useAttention();

  // A deep link to #tab=owner-model on an account the owner gate refuses
  // resolves to Overview rather than to a section the rail does not offer.
  // The hash writer below then rewrites the URL to match, so the address bar
  // never disagrees with the screen.
  const active = resolveTab(requested, isOwner) as TabId;
  const mode = modeOf(active);
  // The page the open view belongs to: the rail lights it, the header names
  // it, and its views are the tabs under the title.
  const page: AdminPage = pageOf(active) ?? ADMIN_PAGE_GROUPS[0].pages[0];


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
      const m = resolveHashTab(new URLSearchParams(h).get("tab"));
      if (m) setActive(m);
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

  // Plain functions and values, not useCallback/useMemo: the React compiler
  // memoises this component itself, and hand-written memos over `mode` here
  // made it give up on the whole component.
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    const first = GROUPS.find((g) => g.mode === m)?.tabs[0];
    if (first) select(first.id);
  };


  const currentMeta = TABS.find((t) => t.id === active);
  const current = currentMeta ?? TABS[0];

  // THE RAIL, SORTED BY HIS USE (the owner's pick A, 2026-10-28). Daily, When
  // needed, and the quiet Tools line, in the order the usage log last put
  // them in. Decoded from what the server read, so the first paint is already
  // in that order, and fixed for the whole visit: moving a rail under the
  // pointer that is reaching for it is worse than a rail that never moves.
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
  // Home reads "Daily / Home" and not "Daily / Home / Home".
  const crumbs = [
    visiblePageGroups.find((g) => g.pages.some((p) => p.id === page.id))?.group,
    page.label,
    page.views.length > 1 ? page.views.find((v) => v.tab === active)?.label : undefined,
  ].filter((c, i, all): c is string => Boolean(c) && c !== all[i - 1]);
  // A page's badge is the first of its views that has people waiting.
  const pageBadge = (p: AdminPage) =>
    p.views.map((v) => badgeFor(attention.summary, v.tab)).find((b) => b !== null) ?? null;

  // How the admin is used, for admin accounts only (lib/admin/useUsageLog.ts).
  // After the memos above: the compiler treats a value handed to a hook as
  // possibly changed afterwards, and would skip the memos that read it.
  useUsageLog(active);

  const nav = (
    <nav aria-label="Admin sections">
      {visiblePageGroups.map((g, i) => (
        // Three groups with a quiet name each, set apart by room rather than
        // rules, as the design draws them. The hairlines were for six groups
        // of near-equal weight; these three already differ in kind.
        <div key={g.group} className={i === 0 ? "" : "mt-4"}>
          {/* Sentence case. primitives.tsx bans tracked uppercase labels
              ("when everything is a heading, the eye has nothing to skip
              to"), and the rail should not contradict the panel below it. */}
          {/* A group of one page with its own name needs no heading. */}
          {g.pages.length === 1 && g.pages[0].label === g.group ? null : (
            <p className="mb-1 px-2.5 font-sans text-[11px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
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
                  t={p}
                  on={p.id === page.id}
                  badge={pageBadge(p)}
                  onSelect={select}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
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
          {/* The signed-in address, which is a real person's and sits in the
              rail on every screen. The title is dropped under streamer mode,
              or the tooltip hands back exactly what the blur is covering.

              That was already the stated intent here and was not what the code
              did: title was set unconditionally, so hovering the blurred rail
              printed the address in a native tooltip that no filter touches. */}
          <span
            className={`adm-sensitive min-w-0 flex-1 truncate font-sans text-[11.5px]`}
            style={{ color: "var(--adm-ink-2)" }}
            title={streaming ? undefined : adminEmail}
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
      {/* The switches fold under Settings, one row until it is opened: the
          rail used to end in a 2x2 grid of toggles and a sign out, which was
          most of what made its foot feel crowded. Streamer mode is in the top
          bar, where it is seen before anything is shown. */}
      <details className="group">
        <summary
          className="adm-control flex h-10 w-full cursor-pointer list-none items-center gap-2 rounded-[var(--adm-radius-sm)] px-2 font-sans text-[12.5px] [&::-webkit-details-marker]:hidden"
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
          className="adm-control flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
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
      </details>
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
    // The insights engine wraps the WHOLE shell, not the Growth tab, and that
    // placement is the feature. A report imported on Growth is still there
    // when the operator opens Goals, the dashboard widget reads the same
    // grades the goals page computes, and raising a target on one page moves
    // the grade on the other with nothing to refresh. Mounted at the tab
    // level, every navigation would throw the state away.
    <InsightsProvider>
    <div className="adm adm-page min-h-[100dvh]">
        {/* Rail. Sticky on desktop so navigation is always one glance away,
            even a thousand rows into an order list.

            The rows are words only since the owner's pick A (2026-10-28), so
            the label has the whole width; the longest, "Catalogue", is far
            inside it.

            Only the NAV region scrolls, not the whole rail. That is what keeps
            the identity block pinned no matter how many groups land, and it is
            what lets the live rows sit under the nav without pushing the
            footer off. Seven rows and the Tools line fit a 1366x768 screen
            with room to spare at py-[7px]; if the rail ever grows past that,
            it wants a fold, not tighter padding. */}
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
            className="adm-topbar sticky top-0 z-40 border-b"
            // The ground itself, opaque, with a hairline under it. It was a
            // translucent ground over a backdrop blur, so rows slid under it
            // as a smear; the board's bar simply covers what scrolls beneath.
            style={{ background: "var(--adm-bg)", borderColor: "var(--adm-line)" }}
          >
            {/* The bar's GROUND spans the canvas so the hairline reaches both
                edges, but its CONTENTS are capped and centred on the
                same 1760 as the content below. Without the inner wrapper the
                search sits ~280px right of the content edge on a 2560 monitor,
                which is the same detachment this refactor set out to fix,
                relocated to a wider screen. */}
            {/* no flex-wrap below lg. Wrapping is what produced the 113px
                three-row bar; with the action bank gone the three survivors are
                Sections, search and the bell, and search is the one that flexes
                so the row holds down to 320px instead of breaking at 360. */}
            <div className="mx-auto flex w-full max-w-[var(--adm-content-max)] items-center justify-end gap-2 px-4 py-3 md:px-6">
              {/* Where you are, as a path: the group, the page, and the view
                  when the page has more than one. The 1.8 bar is this, search,
                  the stream eye and the bell; the activity strip that used to
                  run across the middle is in the bell. */}
              <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 md:block">
                <ol className="flex min-w-0 items-center gap-1.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {crumbs.map((c, i) => (
                    <li key={c + i} className="flex min-w-0 items-center gap-1.5">
                      {i > 0 ? <span aria-hidden>/</span> : null}
                      <span
                        className="truncate"
                        style={i === crumbs.length - 1 ? { color: "var(--adm-ink)" } : undefined}
                      >
                        {c}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
            <div className="hidden">
                  <button
                    type="button"
                    ref={navTriggerRef}
                    onClick={() => setNavOpen((v) => !v)}
                    aria-expanded={navOpen}
                    aria-controls="adm-mobile-nav"
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

                {/* Activity first, then search. The strip takes the free
                    space in the middle of the bar and the bell lands
                    immediately left of the search box, which is where the
                    owner asked for it.

                    Order matters here and is not cosmetic: the strip is
                    flex-1, so it absorbs the slack. Putting it after the
                    search would push the search off to the left edge and
                    strand the bell in the far corner. */}
                <ActivityFeed strip={false} />
                {/* Search and the one count that means someone is waiting.
                    Both sit left of the action bank so the row reads
                    identity, then find, then do. */}
                {/* Every view of every page in the rail, under the rail's
                    own group names, so a view folded into Tools is still
                    one search away. */}
                <TabSearch
                  tabs={visiblePageGroups.flatMap((g) =>
                    g.pages.flatMap((p) =>
                      p.views.map((v) => ({
                        id: v.tab,
                        label: viewName(p, v),
                        eyebrow: p.sentence,
                        group: g.group,
                      })),
                    ),
                  )}
                  onSelect={(id) => isTabId(id) && select(id)}
                />
                <AdminStreamerToggle compact />
            </div>

            {/* The drawer belongs to the bar, not to the content.

                Sections is pinned; the drawer used to render in flow further
                down the page, so tapping it eight hundred rows into Orders
                mounted a panel above the fold and the button read as dead.
                Anything triggered from a fixed element has to open against
                that element. */}
            {/* Tap-anywhere-else to close. Without it the only way out is the
                Sections button, which the open drawer has usually scrolled
                away from. z-index sits below the bar's 40 so the trigger stays
                clickable, and above the canvas so nothing behind it is. */}
            {navOpen && (
              <button
                type="button"
                aria-label="Close sections"
                onClick={() => setNavOpen(false)}
                className="fixed inset-0 z-[35] cursor-default lg:hidden"
              />
            )}
            {navOpen && (
              <div
                id="adm-mobile-nav"
                className="relative z-[36] mx-auto w-full max-w-[var(--adm-content-max)] px-4 pb-3 md:px-6 lg:hidden"
              >
                <div
                  // overscroll-contain stops the scroll chaining out of the
                  // drawer into the page once it hits its end. The
                  // overscroll-behavior in globals.css is set on html/body and
                  // does nothing for a nested scroller like this one.
                  className="adm-panel-enter max-h-[70dvh] overflow-y-auto overscroll-contain rounded-[var(--adm-radius-lg)] border p-3"
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
            // NO pb-* HERE. The bottom clearance is set by .adm-canvas in
            // admin-theme.css, which is unlayered and therefore beats any
            // Tailwind utility on this element no matter what it says. Two
            // utilities used to sit here claiming to do it; they were dead,
            // and reading them was why the panel looked like it already had
            // 88px of clearance while computing 0.
            className="adm-canvas mx-auto w-full max-w-[var(--adm-content-max)] px-4 pt-5 md:px-6"
            style={{ isolation: "isolate" }}
          >
            {larp ? (
              /* A warning, not a failure, so its box is DASHED: with one ink
                 that is how the panel tells the two apart, and "Larp mode" is
                 the word that goes with it. A solid ink box would say
                 something is broken; nothing is. This is a caution that what
                 is on screen is not the books. */
              <div
                role="status"
                className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--adm-radius)] border border-dashed px-3 py-2"
                style={{
                  borderColor: "var(--adm-warn)",
                  background: "color-mix(in oklab, var(--adm-warn), transparent 94%)",
                }}
              >
                <span className="font-sans text-caption font-semibold text-[color:var(--adm-warn)]">
                  Larp mode
                </span>
                <span className="font-sans text-detail text-paper/80">
                  Numbers here are inflated for design work, not your real
                  revenue, users, or sales. A few fields stay true, so read none
                  of them as fact. Saving is disabled while this is on.
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
            {/* "Is anything wrong", on every tab, both modes. In flow rather
                than sticky so --adm-topbar-h and its two consumers are
                untouched, and outside the keyed wrapper below so it does not
                remount and replay on every section change. It is the one
                outlined status box on the page, and only while there is
                something to say. */}
            {/* Not on Home: its to-do list is this same summary, in full. */}
            {active === "today" ? null : (
            <AttentionStrip
              summary={attention.summary}
              isOverview={mode === "ops" && active === "overview"}
              onOpenTab={(id) => isTabId(id) && select(id)}
              onRetry={attention.refresh}
            />
            )}
            {/* Every page opens the same way (1.8 admin silent patch): its
                name, one sentence of what it is for, and its views as tabs.
                Smaller than the old 46px head with an ink rule under it: the
                page's content is what should take the eye. */}
            <header className="mb-6">
              <h1
                className="font-sans text-[26px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]"
                style={{ color: "var(--adm-ink)" }}
              >
                {page.label}
              </h1>
              <p className="mt-1 font-sans text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {page.sentence}
              </p>
              {page.views.length > 1 ? (
                <div className="mt-4">
                  <SubTabs
                    tabs={page.views.map((v) => [v.tab as TabId, v.label] as const)}
                    active={active}
                    onChange={select}
                  />
                </div>
              ) : null}
            </header>

          {/* OVERVIEW ONLY, and operations only.
              Operations only because Owner mode opens with its own
              measured/modelled split, and stacking a second set of headline
              numbers above it would put two different answers to "how are we
              doing" on one screen.
              Overview only because it was doing exactly that everywhere else:
              the row rode along above Traffic, Revenue, Users and the rest, so
              a screen devoted to one metric opened with four other headline
              figures competing with it. Traffic was the worst of them, since
              the hero IS traffic and the reader met the same numbers twice in
              one scroll. */}
          {mode === "ops" && active === "overview" ? (
            <HeroRow
              period={period}
              onPeriod={setPeriod}
              onOpenTab={(id) => isTabId(id) && select(id)}
              summary={attention.summary}
              onRetry={attention.refresh}
              revenueSeries={overview.data?.revenueSeries ?? []}
              revenueTodayCents={overview.data?.revenueTodayCents ?? null}
              // Measured means the route answered AND its orders read was
              // sound. "Not degraded" alone was standing in for this, and a
              // route that never answered is not degraded, so the hero
              // printed $0 over an empty series it had never been given.
              revenueMeasured={overview.data !== null && !overview.data.ordersDegraded}
              revenueLoading={overview.loading}
              revenueSource={overview.data?.revenueSource ?? "shop"}
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
    {/* Below lg the rail is gone and this is the whole navigation. It gates
        itself with lg:hidden, and the canvas above reserves the space it
        occupies so a fixed bar never sits on top of the last table row. */}
    <AdminMobileNav
      // Pages, the same list as the rail. A page id is its first view's id.
      groups={visiblePageGroups.map((g) => ({
        group: g.group,
        quiet: g.quiet,
        tabs: g.pages.map((p) => ({ id: p.id, label: p.label })),
      }))}
      // The bar's slots are the rail's Daily: Home and the three pages read
      // most (the owner's pick A; it was Today, Orders, Messages and Shop,
      // and he pressed More every time to reach Traffic and Money). Owner
      // mode has no Daily and keeps More alone, as it always did.
      primary={mode === "ops" ? (visiblePageGroups[0]?.pages.map((p) => p.id) ?? []) : []}
      active={page.id}
      onSelect={(id) => isTabId(id) && select(id)}
      footer={
        <>
          {/* The ModeSwitch, which below lg lives nowhere else: it sits in
              railBody, and railBody renders only in the desktop aside. Without
              this an owner on a phone cannot reach Strategy at all, and opening
              /admin#tab=owner-today puts them in owner mode with no control on
              screen to leave it. */}
          {isOwner ? <ModeSwitch mode={mode} onChange={switchMode} /> : null}
          {railFooter}
        </>
      }
    />
    </InsightsProvider>
  );
}
