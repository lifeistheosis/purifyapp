/**
 * The admin's pages: what the rail lists, and the views each page holds.
 *
 * 1.8 admin silent patch (the owner, 2026-10-20: "as simplistic as his ...
 * ours is good. It just has a lot of clutter"). The rail used to list every
 * tab, 29 of them plus four owner tabs, each with a line under it. Now it
 * lists pages, and a page's views sit as tabs inside it, the way a reference
 * admin keeps Overview, Per listing and Services under one Costs.
 *
 * NOTHING WAS REMOVED. Every tab id is still a view of exactly one page, so
 * every #tab= bookmark still lands (pages.test.ts holds that). A page's id is
 * its first view's id, which lets the rail and the phone bar reuse the tab
 * icons and keeps the phone's four fixed slots on familiar ids.
 *
 * Pure and in lib/ so the mapping can be tested without rendering the shell.
 */

export type AdminPageView = { tab: string; label: string };

export type AdminPage = {
  /** Its first view's tab id. */
  id: string;
  label: string;
  /** One plain sentence under the title: what the page is for. */
  sentence: string;
  views: AdminPageView[];
};

export type AdminPageGroup = { group: string; mode: "ops" | "owner"; pages: AdminPage[] };

export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = [
  {
    group: "Today",
    mode: "ops",
    pages: [
      {
        id: "today",
        label: "Today",
        sentence: "What needs you now, and today's numbers.",
        views: [
          { tab: "today", label: "Today" },
          { tab: "goals", label: "Goals" },
          { tab: "calendar", label: "Calendar" },
        ],
      },
    ],
  },
  {
    group: "Money",
    mode: "ops",
    pages: [
      {
        id: "overview",
        label: "Money",
        sentence: "What came in, what went out, and who pays for Plus.",
        views: [
          { tab: "overview", label: "Overview" },
          { tab: "revenue", label: "Revenue" },
          { tab: "subscriptions", label: "Subscriptions" },
          { tab: "costs", label: "Costs" },
        ],
      },
      {
        id: "orders",
        label: "Orders",
        sentence: "Every order, and what still has to be posted.",
        views: [
          { tab: "orders", label: "Orders" },
          { tab: "fulfillment", label: "Fulfillment" },
        ],
      },
    ],
  },
  {
    group: "Shop",
    mode: "ops",
    pages: [
      {
        id: "shop",
        label: "Catalogue",
        sentence: "The pieces we sell, and whether their prices still work.",
        views: [
          { tab: "shop", label: "Products" },
          { tab: "sourcing", label: "Sourcing" },
        ],
      },
      {
        id: "eikon-box",
        label: "EIKON Box",
        sentence: "The monthly drops and who claimed them.",
        views: [{ tab: "eikon-box", label: "EIKON Box" }],
      },
    ],
  },
  {
    group: "People",
    mode: "ops",
    pages: [
      {
        id: "users",
        label: "Users",
        sentence: "Readers' accounts, blue check requests and badges.",
        views: [
          { tab: "users", label: "Users" },
          { tab: "verification", label: "Verification" },
          { tab: "badges", label: "Badges" },
        ],
      },
      {
        id: "messages",
        label: "Messages",
        sentence: "Support and shop questions waiting for an answer.",
        views: [{ tab: "messages", label: "Messages" }],
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
    ],
  },
  {
    group: "Publishing",
    mode: "ops",
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
        id: "traffic",
        label: "Traffic",
        sentence: "Who visits, how they found us, how the welcome questions go, and where readers leave.",
        views: [
          { tab: "traffic", label: "Traffic" },
          { tab: "onboarding", label: "Onboarding" },
          { tab: "screens", label: "Screens" },
        ],
      },
    ],
  },
  {
    group: "System",
    mode: "ops",
    pages: [
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

/** The page a tab id is a view of, or null for an id no page holds. */
export function pageOf(tab: string): AdminPage | null {
  return ADMIN_PAGES.find((p) => p.views.some((v) => v.tab === tab)) ?? null;
}

/** The group a page sits in. */
export function groupOf(pageId: string): AdminPageGroup | null {
  return ADMIN_PAGE_GROUPS.find((g) => g.pages.some((p) => p.id === pageId)) ?? null;
}

/** The view label for a tab id, for the breadcrumb and the usage readout. */
export function viewLabel(tab: string): string {
  for (const p of ADMIN_PAGES) {
    const v = p.views.find((x) => x.tab === tab);
    if (v) return p.views.length > 1 ? `${p.label}: ${v.label}` : p.label;
  }
  return tab;
}
