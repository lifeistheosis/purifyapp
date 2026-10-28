// The Screens view's sums (1.8). Pure, so the sums are tested directly
// (lib/admin/__tests__/screensSummary.test.ts); the route that reads the rows
// is app/api/admin/screens/route.ts.
//
// The owner's ask, 2026-10-28: "a system that tracks the user's usage on each
// screen. So we have like a retention-based system, so we know which screens
// they close the app, leave, whatever".
//
// Two sources, summed apart:
//
//   THE PAGE VIEWS the site has always kept (analytics_pageviews: a tab's id,
//   an address, a time), read into visits. Nothing new is collected for them.
//   For each screen (lib/analytics/screens.ts): how often it was opened, how
//   often a visit ended on it, the median time on it, and where readers went
//   next.
//
//   THE SCREENS' OWN COUNTS in analytics_events (lib/analytics/screenCounting.ts),
//   which name no reader: the screen showing when the app was put away, and
//   how many new devices came back after a day, a week and a month.
//
// ── What a view, a visit and the time on a screen are ──────────────────────
//
// The tracker pings every 20 seconds while a page stays open on screen
// (components/analytics/AnalyticsTracker.tsx), and each ping is a page view
// row with the same address. So a VIEW is a run of rows of one address in one
// tab, and the pings in it are not views.
//
// A tab's id lives as long as the tab, and in the apps that can be days. So a
// VISIT ends when 30 minutes pass with nothing from the tab: the pings stop
// when the page is put away, so a 30 minute silence is the app in a pocket or
// the tab closed. A visit that ends on a screen is a reader who LEFT from it.
// A visit whose last word came in the last 30 minutes may still be going, and
// is not counted as left anywhere.
//
// The TIME ON A SCREEN runs from opening it to opening the next screen in the
// same visit, capped at 30 minutes. A screen a reader left from has no next
// screen, so it has no time and is not in the median.

import { SCREENS, screenOf, type ScreenKey } from "@/lib/analytics/screens";
import { CAME_BACK_DAYS, OPEN_SPANS, type CameBackDay, type OpenSpan } from "@/lib/analytics/screenCounting";

/** The admin's names for the screens: English, like the rest of the admin. */
export const SCREEN_NAMES: Record<ScreenKey, string> = {
  today: "Today (the home page)",
  bible: "The Bible's books",
  discover: "Discover",
  prayers: "Prayers",
  you: "You (the account page)",
  "bible-chapter": "A Bible chapter",
  "bible-verses": "Several verses at once",
  "reading-plans": "Reading plans",
  "reading-plan": "A reading plan",
  walkthroughs: "Walkthroughs",
  walkthrough: "A book's walkthrough",
  "walkthrough-chapter": "A chapter's walkthrough",
  "prayers-today": "Today's prayer",
  "morning-prayers": "The morning prayers",
  "evening-prayers": "The evening prayers",
  prayer: "A prayer",
  "own-rule": "Your own rule",
  hours: "The Hours",
  hour: "One of the Hours",
  akathists: "Akathists",
  akathist: "An akathist",
  "learning-to-pray": "Learning to pray",
  "prayer-lesson": "A lesson on prayer",
  chants: "Chants",
  chant: "A chant",
  campaigns: "Prayer campaigns",
  campaign: "A prayer campaign",
  "campaign-new": "Starting a prayer campaign",
  saints: "Saints",
  saint: "A saint's page",
  "saint-work": "A saint's writing",
  "saint-web": "A saint's web",
  calendar: "The calendar",
  fasting: "Fasting",
  councils: "Councils",
  council: "A council",
  "council-document": "A council's document",
  history: "History",
  "history-entry": "A moment in history",
  heresies: "Heresies",
  heresy: "A heresy",
  theology: "Theology",
  doctrine: "Doctrine",
  "theology-topic": "A theology topic",
  topics: "Topics",
  topic: "A topic",
  apologetics: "Apologetics",
  "apologetics-answer": "An apologetics answer",
  "fathers-on": "The Fathers on struggles",
  "fathers-on-struggle": "The Fathers on one struggle",
  florilegium: "The florilegium",
  dictionary: "The dictionary",
  catechism: "Today's catechism",
  "catechism-collections": "Catechism collections",
  "catechism-collection": "A catechism collection",
  "who-said-it": "Who said it",
  reading: "Reading",
  "reading-collection": "A reading collection",
  "reading-paths": "Reading paths",
  "reading-path": "A reading path",
  start: "Start here",
  "first-liturgy": "Your first Liturgy",
  "account-settings": "An account setting",
  saved: "Saved",
  journal: "The journal",
  settings: "Settings",
  profile: "A reader's profile",
  community: "Community",
  parishes: "Parishes",
  "sign-in": "Signing in",
  plus: "Purify Plus",
  "whats-new": "What's new",
  about: "About Purify",
  faq: "Questions and answers",
  legal: "Privacy or terms",
  support: "Support",
  "language-editor": "The language editor",
  "email-lists": "Leaving an email list",
  shop: "The shop",
  "shop-item": "An icon in the shop",
  "shop-category": "A shop category",
  "shop-store": "A store",
  cart: "The cart",
  checkout: "Checkout",
  "shop-other": "Another shop page",
  seller: "Selling in the shop",
  other: "Another page",
};

export const SPAN_WORDS: Record<OpenSpan, string> = {
  "under-10s": "under 10 seconds",
  "10s-1m": "10 seconds to a minute",
  "1m-5m": "1 to 5 minutes",
  "over-5m": "over 5 minutes",
};

const MINUTE = 60_000;
const DAY = 86_400_000;
/** Nothing from a tab for this long ends its visit. */
export const VISIT_GAP_MS = 30 * MINUTE;
/** The time on a screen is cut here. */
export const TIME_CAP_MS = 30 * MINUTE;
/** A leave rate is only named in a sentence for a screen opened this often. */
export const RATE_FLOOR = 30;

/** Where it was read: everywhere, the apps (iPhone, Android, Windows) or the website. */
export const WHERES = ["all", "apps", "web"] as const;
export type Where = (typeof WHERES)[number];

// ── The page views ─────────────────────────────────────────────────────────

/** One page view row of one tab: its address and its time, in ms. */
export type Step = { path: string; at: number };

type ScreenCounts = { views: number; exits: number; times: number[]; next: Map<ScreenKey, number> };

/** The running sums for one place it was read. Fill with tallyTab, read with finishViews. */
export type ViewTally = {
  views: number;
  visits: number;
  exits: number;
  /** Visits that may still be going. */
  open: number;
  screens: Map<ScreenKey, ScreenCounts>;
  /** Each address's screen, worked out once. */
  named: Map<string, ScreenKey>;
};

export function newViewTally(): ViewTally {
  return { views: 0, visits: 0, exits: 0, open: 0, screens: new Map(), named: new Map() };
}

function screenFor(t: ViewTally, path: string): ScreenKey {
  let s = t.named.get(path);
  if (!s) {
    s = screenOf(path);
    t.named.set(path, s);
  }
  return s;
}

function countsFor(t: ViewTally, screen: ScreenKey): ScreenCounts {
  let c = t.screens.get(screen);
  if (!c) {
    c = { views: 0, exits: 0, times: [], next: new Map() };
    t.screens.set(screen, c);
  }
  return c;
}

/**
 * Add one tab's page views, oldest first, to the sums. `now` decides whether
 * the tab's last visit may still be going.
 */
export function tallyTab(t: ViewTally, steps: readonly Step[], now: number): void {
  if (!steps.length) return;
  // The views: runs of one address, cut where a visit ends.
  const views: { screen: ScreenKey; at: number; visit: number }[] = [];
  let visit = 0;
  let lastPath: string | null = null;
  let lastAt = steps[0].at;
  for (const s of steps) {
    if (lastPath !== null && s.at - lastAt > VISIT_GAP_MS) {
      visit += 1;
      lastPath = null;
    }
    if (s.path !== lastPath) views.push({ screen: screenFor(t, s.path), at: s.at, visit });
    lastPath = s.path;
    lastAt = s.at;
  }
  const stillGoing = now - lastAt < VISIT_GAP_MS;

  t.visits += visit + 1;
  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const c = countsFor(t, v.screen);
    c.views += 1;
    t.views += 1;
    const after = views[i + 1];
    if (after && after.visit === v.visit) {
      c.next.set(after.screen, (c.next.get(after.screen) ?? 0) + 1);
      c.times.push(Math.min(after.at - v.at, TIME_CAP_MS));
    } else if (v.visit === visit && stillGoing) {
      t.open += 1;
    } else {
      c.exits += 1;
      t.exits += 1;
    }
  }
}

/** The middle of a list of times, in whole seconds, or null for none. */
export function medianSeconds(times: readonly number[]): number | null {
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const ms = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(ms / 1000);
}

export type ScreenRow = {
  screen: ScreenKey;
  views: number;
  /** Visits that ended on it. */
  exits: number;
  /** Views that went on to a next screen in the same visit: the median's base. */
  wentOn: number;
  medianSeconds: number | null;
  /** The three screens most often opened next, most first. */
  next: { screen: ScreenKey; count: number }[];
};

export type ViewSums = {
  views: number;
  visits: number;
  exits: number;
  /** Visits that may still be going, not counted as left anywhere. */
  open: number;
  /** Over every view that went on. */
  medianSeconds: number | null;
  /** Most opened first. */
  screens: ScreenRow[];
};

export function finishViews(t: ViewTally): ViewSums {
  const all: number[] = [];
  const screens: ScreenRow[] = [];
  for (const [screen, c] of t.screens) {
    for (const x of c.times) all.push(x);
    screens.push({
      screen,
      views: c.views,
      exits: c.exits,
      wentOn: c.times.length,
      medianSeconds: medianSeconds(c.times),
      next: [...c.next.entries()]
        .sort((a, b) => b[1] - a[1] || SCREENS.indexOf(a[0]) - SCREENS.indexOf(b[0]))
        .slice(0, 3)
        .map(([s, count]) => ({ screen: s, count })),
    });
  }
  screens.sort((a, b) => b.views - a.views || SCREENS.indexOf(a.screen) - SCREENS.indexOf(b.screen));
  return { views: t.views, visits: t.visits, exits: t.exits, open: t.open, medianSeconds: medianSeconds(all), screens };
}

// ── The screens' own counts ────────────────────────────────────────────────

export type EventRow = { name: string; props: Record<string, unknown>; ts: string };

export type EventSums = {
  /** Times the app was put away or the page closed. */
  closes: number;
  /** By the screen that was showing, most first. */
  closedOn: { screen: ScreenKey; count: number }[];
  /** How long the screen had been showing. */
  spans: Record<OpenSpan, number>;
  /** New devices, in the window. */
  firstOpens: number;
  /** Came back a day, a week, a month or more after a first open: the count, and of how many could have. */
  cameBack: Record<CameBackDay, { count: number; of: number }>;
};

/** The kind of device a count names, as a place it was read, or null. */
function whereOfPlatform(platform: unknown): Exclude<Where, "all"> | null {
  if (platform === "ios" || platform === "android" || platform === "desktop") return "apps";
  if (platform === "web") return "web";
  return null;
}

function emptyEvents(): EventSums & { byScreen: Map<ScreenKey, number> } {
  return {
    closes: 0,
    closedOn: [],
    byScreen: new Map(),
    spans: Object.fromEntries(OPEN_SPANS.map((s) => [s, 0])) as Record<OpenSpan, number>,
    firstOpens: 0,
    cameBack: Object.fromEntries(CAME_BACK_DAYS.map((d) => [d, { count: 0, of: 0 }])) as EventSums["cameBack"],
  };
}

/**
 * Sum the screens' counts of the last `days` days before `now`, for each
 * place it was read. Rows from the 30 days before the window may be passed
 * too: first opens from then are what a return in the window is measured
 * against ("of how many could have"), the onboarding's rule.
 */
export function summarizeScreenEvents(rows: readonly EventRow[], now: Date, days: number): Record<Where, EventSums> {
  const since = now.getTime() - days * DAY;
  const out = { all: emptyEvents(), apps: emptyEvents(), web: emptyEvents() };

  for (const r of rows) {
    const t = Date.parse(r.ts);
    if (!Number.isFinite(t)) continue;
    const p = r.props ?? {};
    const place = whereOfPlatform(p.platform);
    const sums = place ? [out.all, out[place]] : [out.all];

    if (r.name === "first_open") {
      for (const d of CAME_BACK_DAYS) {
        const due = t + d * DAY;
        if (due <= now.getTime() && due >= since) for (const s of sums) s.cameBack[d].of += 1;
      }
    }
    if (t < since) continue;

    switch (r.name) {
      case "screen_closed": {
        const screen = SCREENS.includes(p.screen as ScreenKey) ? (p.screen as ScreenKey) : "other";
        const span = OPEN_SPANS.includes(p.open as OpenSpan) ? (p.open as OpenSpan) : null;
        for (const s of sums) {
          s.closes += 1;
          s.byScreen.set(screen, (s.byScreen.get(screen) ?? 0) + 1);
          if (span) s.spans[span] += 1;
        }
        break;
      }
      case "first_open":
        for (const s of sums) s.firstOpens += 1;
        break;
      case "came_back": {
        const d = p.day as CameBackDay;
        if (!CAME_BACK_DAYS.includes(d)) break;
        for (const s of sums) s.cameBack[d].count += 1;
        break;
      }
    }
  }

  const finish = ({ byScreen, ...s }: ReturnType<typeof emptyEvents>): EventSums => ({
    ...s,
    closedOn: [...byScreen.entries()]
      .sort((a, b) => b[1] - a[1] || SCREENS.indexOf(a[0]) - SCREENS.indexOf(b[0]))
      .map(([screen, count]) => ({ screen, count })),
  });
  return { all: finish(out.all), apps: finish(out.apps), web: finish(out.web) };
}

// ── In plain words ─────────────────────────────────────────────────────────

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
/** "A Bible chapter" in the middle of a sentence: "a Bible chapter". Names that are titles keep their capital. */
export const lowerName = (screen: ScreenKey) => {
  const name = SCREEN_NAMES[screen];
  return /^(A|An|The|Your|One|Several|Another|Signing|Leaving|Starting|Selling) /.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
};

/** A time in seconds, said shortly: "45 s", "2 min 10 s", "30 min". */
export function sayTime(seconds: number | null): string {
  if (seconds === null) return "";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

const num = (x: number) => x.toLocaleString("en-US");

/** The screen most visits end on, or null when none has ended. */
export function leftMost(v: ViewSums): ScreenRow | null {
  const top = [...v.screens].sort((a, b) => b.exits - a.exits)[0];
  return top?.exits ? top : null;
}

/** Of the screens opened RATE_FLOOR times or more, the one whose views most often end the visit. */
export function leaveSentence(v: ViewSums): string | null {
  const top = v.screens
    .filter((s) => s.views >= RATE_FLOOR && s.screen !== "other")
    .sort((a, b) => b.exits / b.views - a.exits / a.views)[0];
  if (!top?.exits) return null;
  return `Of the screens opened ${RATE_FLOOR} times or more, readers leave ${lowerName(top.screen)} most often: ${pct(top.exits, top.views)}% of its ${num(top.views)} views end the visit.`;
}

/** Where readers go from the most opened screen. */
export function onwardSentence(v: ViewSums): string | null {
  const top = v.screens[0];
  const next = top?.next[0];
  if (!top || !next) return null;
  const to = next.screen === top.screen ? "another one" : lowerName(next.screen);
  return `From ${lowerName(top.screen)}, the next screen is most often ${to} (${pct(next.count, top.views)}%).`;
}

/** The span a closed screen had most often been showing for. */
export function usualSpan(e: EventSums): OpenSpan | null {
  if (!e.closes) return null;
  return OPEN_SPANS.reduce((a, b) => (e.spans[b] > e.spans[a] ? b : a));
}

/** The window in words, the way the owner reads it. */
export function screenSentences(v: ViewSums, e: EventSums, days: number): string[] {
  const out: string[] = [];
  const span = days === 7 ? "this week" : `in the last ${days} days`;
  if (!v.views) {
    out.push(`No screens were opened ${span}.`);
  } else {
    out.push(`Readers opened ${plural(v.views, "screen", "screens")} in ${plural(v.visits, "visit", "visits")} ${span}.`);
    const left = leftMost(v);
    if (left) out.push(`Most visits end on ${lowerName(left.screen)}: ${num(left.exits)} of ${num(v.exits)}.`);
    const leave = leaveSentence(v);
    if (leave) out.push(leave);
    const onward = onwardSentence(v);
    if (onward) out.push(onward);
  }
  const closed = e.closedOn[0];
  const usual = usualSpan(e);
  if (closed && usual) {
    out.push(`The app was put away most on ${lowerName(closed.screen)} (${plural(closed.count, "time", "times")}), most often after ${SPAN_WORDS[usual]}.`);
  }
  const week = e.cameBack[7];
  if (week.of) out.push(`${num(week.count)} of ${plural(week.of, "new device", "new devices")} came back a week or more after the first open.`);
  return out;
}
