/**
 * The admin's pages: what the rail lists, and the views each page holds.
 *
 * 1.8 admin silent patch (the owner, 2026-10-20: "as simplistic as his ...
 * ours is good. It just has a lot of clutter"). The rail used to list every
 * tab, 29 of them plus four owner tabs, each with a line under it. Now it
 * lists pages, and a page's views sit under it.
 *
 * NOTHING WAS REMOVED. Every tab id is a view of exactly one page, or a
 * retired id that lands on one (RETIRED_VIEWS below), so every #tab= bookmark
 * still lands (pages.test.ts holds that). A page's id is its first view's id,
 * which lets the rail and the phone bar reuse the tab icons and keeps the
 * phone's slots on familiar ids.
 *
 * ONE HOME (the owner's pick A, 2026-10-28). His own log of 21 to 27 Oct
 * showed Today was a doorway (40 of 42 visits left within 5 seconds, 22 of
 * them straight to Money) and that Traffic and Money were what he read. So
 * Today became Home, and the operations groups below are the rail as he
 * picked it: Daily, When needed, and the pages he never opens folded into one
 * quiet Tools line. They are the rail's starting order. lib/admin/rail.ts
 * re-sorts the same pages by his use as the log grows, and never drops one.
 *
 * THE QUIETER RAIL (the owner's pick A on sheet r3-15, 2026-10-30: "do A for
 * the rail"). Each Daily page carries the one figure he opens it for (its
 * `figure`), and the open page unfolds its views under it in the rail, so
 * there are no tabs inside tabs: one level of views. Traffic's six panels
 * became its views (Time-series into Overview, Audience into Map, Engagement
 * into Screens). Users became one directory of readers with the reader's card
 * (his pick C), so Verification and Badges are retired ids that land on it
 * with a filter on; Live carts and Abandoned checkouts stay in Users as views
 * while his answer on them is open.
 *
 * Pure and in lib/ so the mapping can be tested without rendering the shell.
 */

export type AdminPageView = {
  tab: string;
  label: string;
  /**
   * The heading the page shows while this view is open, when it is not the
   * page's own name: Users opens on "Readers", Traffic's Map on "Map".
   */
  title?: string;
  /** The sentence under that heading, when it is not the page's. */
  sentence?: string;
};

/**
 * The one figure a Daily page carries in the rail (pick A): Home how many
 * things wait on him, Traffic who is on the site now, Money what came in
 * today, Users how many readers joined today. The shell reads the numbers;
 * lib/admin/railFigures.ts writes them.
 */
export type AdminFigure = "waiting" | "live" | "revenue" | "signups";

export type AdminPage = {
  /** Its first view's tab id. */
  id: string;
  label: string;
  /** One plain sentence under the title: what the page is for. */
  sentence: string;
  views: AdminPageView[];
  figure?: AdminFigure;
};

export type AdminPageGroup = {
  group: string;
  mode: "ops" | "owner";
  pages: AdminPage[];
  /** Drawn as one quiet line of links rather than a list: the rail's Tools. */
  quiet?: boolean;
};

export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = [
  {
    group: "Daily",
    mode: "ops",
    pages: [
      {
        id: "today",
        label: "Home",
        sentence: "What changed since you last looked, and the numbers you read.",
        figure: "waiting",
        views: [
          { tab: "today", label: "Today" },
          { tab: "goals", label: "Goals" },
          { tab: "calendar", label: "Calendar" },
        ],
      },
      {
        id: "traffic",
        label: "Traffic",
        sentence: "Who visits, from where, and how they found us.",
        figure: "live",
        views: [
          { tab: "traffic", label: "Overview" },
          {
            tab: "traffic-map",
            label: "Map",
            title: "Map",
            sentence: "Where readers are, by country and by region.",
          },
          { tab: "sources", label: "Sources", title: "Sources", sentence: "Where each visit came from, and what it was read on." },
          { tab: "onboarding", label: "Onboarding" },
          { tab: "screens", label: "Screens" },
        ],
      },
      {
        id: "overview",
        label: "Money",
        sentence: "What came in, what went out, and who pays for Plus.",
        figure: "revenue",
        views: [
          { tab: "overview", label: "Overview" },
          { tab: "revenue", label: "Revenue" },
          { tab: "subscriptions", label: "Subscriptions" },
          { tab: "costs", label: "Costs" },
        ],
      },
      {
        id: "users",
        label: "Users",
        sentence: "Every account. Find one, then do everything from their card.",
        figure: "signups",
        views: [
          {
            tab: "users",
            label: "Readers",
            title: "Readers",
            sentence: "Every account. Find one, then do everything from their card.",
          },
          { tab: "carts", label: "Live carts", sentence: "Carts with something in them, guests included." },
          { tab: "abandoned", label: "Abandoned checkouts", sentence: "Checkouts that were started and not paid." },
        ],
      },
    ],
  },
  {
    group: "When needed",
    mode: "ops",
    pages: [
      {
        // One view since the owner's r3-16 pick B (2026-10-30): a list where
        // each order opens as its whole story. Fulfillment's tiles and board
        // retired into it, and #tab=fulfillment lands here (RETIRED_VIEWS
        // below).
        id: "orders",
        label: "Orders",
        sentence: "Every order, and what still has to be posted.",
        views: [{ tab: "orders", label: "Orders" }],
      },
      {
        id: "messages",
        label: "Messages",
        sentence: "Support and shop questions waiting for an answer.",
        views: [{ tab: "messages", label: "Messages" }],
      },
      {
        // One view since the owner's r3-16 pick A (2026-10-30): the shelf of
        // photo cards, with Sourcing and the hub's other parts in one quiet
        // line above it. #tab=sourcing lands here and opens Sourcing
        // (RETIRED_VIEWS below, ShopHubTab).
        id: "shop",
        label: "Catalogue",
        sentence: "The pieces we sell, and whether their prices still work.",
        views: [{ tab: "shop", label: "Catalogue" }],
      },
    ],
  },
  {
    group: "Tools",
    mode: "ops",
    quiet: true,
    pages: [
      {
        id: "drop",
        label: "Releases",
        sentence: "Everything that tells readers about an update.",
        views: [
          { tab: "drop", label: "Drop" },
          { tab: "patch-notes", label: "Patch notes" },
          { tab: "push", label: "Push" },
          { tab: "email", label: "Email" },
        ],
      },
      {
        id: "content",
        label: "Content",
        sentence: "What readers open, the daily catechism, and the store ratings.",
        views: [
          { tab: "content", label: "Reading" },
          { tab: "catechism", label: "Catechism" },
          { tab: "ratings", label: "Ratings" },
        ],
      },
      {
        id: "community",
        label: "Community",
        sentence: "Campaigns, the Kitchen, and the readers who share the shop.",
        views: [
          { tab: "community", label: "Community" },
          { tab: "ambassadors", label: "Ambassadors" },
        ],
      },
      {
        id: "eikon-box",
        label: "EIKON Box",
        sentence: "The monthly drops and who claimed them.",
        views: [{ tab: "eikon-box", label: "EIKON Box" }],
      },
      {
        id: "health",
        label: "Services",
        sentence: "Whether the services we rely on answer, and what the library holds.",
        views: [
          { tab: "health", label: "Services" },
          { tab: "content-health", label: "Library files" },
        ],
      },
      {
        id: "audit",
        label: "Audit log",
        sentence: "Who did what in the admin, and how the admin is used.",
        views: [
          { tab: "audit", label: "Audit log" },
          { tab: "usage", label: "Your use" },
        ],
      },
    ],
  },
  {
    group: "Strategy",
    mode: "owner",
    pages: [
      {
        id: "owner-today",
        label: "Where we are",
        sentence: "Counted, not assumed.",
        views: [{ tab: "owner-today", label: "Where we are" }],
      },
      {
        id: "owner-model",
        label: "Projection",
        sentence: "What the assumptions say.",
        views: [{ tab: "owner-model", label: "Projection" }],
      },
      {
        id: "owner-markets",
        label: "Markets",
        sentence: "Where the reach could come from.",
        views: [{ tab: "owner-markets", label: "Markets" }],
      },
      {
        id: "owner-investors",
        label: "Investors",
        sentence: "The plan against what happened.",
        views: [{ tab: "owner-investors", label: "Investors" }],
      },
    ],
  },
];

export const ADMIN_PAGES: AdminPage[] = ADMIN_PAGE_GROUPS.flatMap((g) => g.pages);

/** Every tab id some page holds. */
export const ADMIN_VIEW_TABS: string[] = ADMIN_PAGES.flatMap((p) => p.views.map((v) => v.tab));

/**
 * Ids that are no longer views, and where their bookmarks land. `intent` is
 * handed to the view it lands on (lib/admin/viewIntent.ts), so an old link to
 * Verification opens the readers who are waiting on him, not the whole list.
 *
 * Every entry must land on a view some page holds; pages.test.ts holds that,
 * and that no retired id is also a live view.
 */
export const RETIRED_VIEWS: Record<string, { tab: string; intent?: string }> = {
  // The Traffic tab's old name, from before the 1.8 patch.
  growth: { tab: "traffic" },
  // Users became one directory (the owner's pick C on sheet r3-15): the blue
  // check queue is its "Waiting on you" filter, and badges are given from a
  // reader's card.
  verification: { tab: "users", intent: "waiting" },
  badges: { tab: "users", intent: "badges" },
  // Fulfillment's tiles and board retired into Orders (the owner's r3-16
  // pick B), and Sourcing into the Catalogue, which opens Sourcing when the
  // admin was opened on its old address (lib/admin/handoff.ts).
  fulfillment: { tab: "orders" },
  sourcing: { tab: "shop" },
};

/** Where an id lands: itself when it is a view, its replacement when it is retired, null otherwise. */
export function landingOf(tab: string): { tab: string; intent?: string } | null {
  if (ADMIN_VIEW_TABS.includes(tab)) return { tab };
  return Object.prototype.hasOwnProperty.call(RETIRED_VIEWS, tab) ? RETIRED_VIEWS[tab] : null;
}

/** The page a tab id is a view of, or null for an id no page holds. */
export function pageOf(tab: string): AdminPage | null {
  return ADMIN_PAGES.find((p) => p.views.some((v) => v.tab === tab)) ?? null;
}

/**
 * The page an id opens, retired ids included: the usage log keeps the ids
 * he used before they were retired, and his time on Verification is still
 * time on Users.
 */
export function pageOfAny(tab: string): AdminPage | null {
  const to = landingOf(tab);
  return to ? pageOf(to.tab) : null;
}

/** The retired ids that land on a view, so its badge can count what they counted. */
export function aliasesOf(tab: string): string[] {
  return Object.entries(RETIRED_VIEWS)
    .filter(([, to]) => to.tab === tab)
    .map(([id]) => id);
}

/** The group a page starts in. The rail may have moved it since (lib/admin/rail.ts). */
export function groupOf(pageId: string): AdminPageGroup | null {
  return ADMIN_PAGE_GROUPS.find((g) => g.pages.some((p) => p.id === pageId)) ?? null;
}

/**
 * A view's full name: its page's, then its own when the page holds more than
 * one view and the two differ, so a page of one view reads "Messages" and not
 * "Messages: Messages".
 */
export function viewName(page: AdminPage, view: AdminPageView): string {
  return page.views.length > 1 && view.label !== page.label ? `${page.label}: ${view.label}` : page.label;
}

/** The view label for a tab id, for the search box and the usage readout. */
export function viewLabel(tab: string): string {
  for (const p of ADMIN_PAGES) {
    const v = p.views.find((x) => x.tab === tab);
    if (v) return viewName(p, v);
  }
  const to = Object.prototype.hasOwnProperty.call(RETIRED_VIEWS, tab) ? RETIRED_VIEWS[tab] : null;
  return to ? viewLabel(to.tab) : tab;
}

/**
 * What the page says at its head while a view is open: the view's own title
 * and sentence when it has them, else the page's name and sentence.
 */
export function headingOf(page: AdminPage, tab: string): { title: string; sentence: string } {
  const v = page.views.find((x) => x.tab === tab);
  return { title: v?.title ?? page.label, sentence: v?.sentence ?? page.sentence };
}
