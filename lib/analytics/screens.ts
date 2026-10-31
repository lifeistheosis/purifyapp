/**
 * The screens of Purify: an address said as the kind of screen it is.
 *
 * The owner, 2026-10-28: "a system that tracks the user's usage on each
 * screen ... so we know which screens they close the app, leave, whatever".
 * /bible/john/3 and /bible/romans/8 are one screen, "A Bible chapter", and
 * /saints/john-chrysostom is "A saint's page". The admin's Screens view sums
 * page views by these (lib/admin/screensSummary.ts), and the count sent when
 * the app is put away names the screen by one of these words and never by its
 * address (lib/analytics/screenCount.ts), so a count cannot say which saint
 * or which reader's profile was open.
 *
 * ── The list only grows ─────────────────────────────────────────────────
 *
 * The apps carry this file in their bundle, and the server takes a screen
 * only from SCREENS (lib/security/schemas.ts). An app that is never updated
 * keeps sending the words it shipped with, so a word is never renamed or
 * removed: a new screen is a new word, and a word nobody sends any more is
 * harmless. lib/analytics/__tests__/screens.test.ts holds that every page the
 * app has today lands on a word of its own, so a new route that nobody named
 * fails there rather than hiding in "other".
 *
 * Pure, and safe in the browser: no names here. The admin's English names for
 * these words are SCREEN_NAMES in lib/admin/screensSummary.ts.
 */

export const SCREENS = [
  // The tabs.
  "today",
  "bible",
  "discover",
  "prayers",
  "you",
  // Scripture.
  "bible-chapter",
  "bible-verses",
  "reading-plans",
  "reading-plan",
  "walkthroughs",
  "walkthrough",
  "walkthrough-chapter",
  // Prayer.
  "prayers-today",
  "morning-prayers",
  "evening-prayers",
  "prayer",
  "own-rule",
  "hours",
  "hour",
  "akathists",
  "akathist",
  "learning-to-pray",
  "prayer-lesson",
  "chants",
  "chant",
  "campaigns",
  "campaign",
  "campaign-new",
  // The saints and the Church.
  "saints",
  "saint",
  "saint-work",
  "saint-web",
  "calendar",
  "fasting",
  "councils",
  "council",
  "council-document",
  "history",
  "history-entry",
  "heresies",
  "heresy",
  // Study.
  "theology",
  "doctrine",
  "theology-topic",
  "theology-step",
  "theology-reading",
  "topics",
  "topic",
  "apologetics",
  "apologetics-answer",
  "fathers-on",
  "fathers-on-struggle",
  "florilegium",
  "dictionary",
  "catechism",
  "catechism-collections",
  "catechism-collection",
  "who-said-it",
  "reading",
  "reading-collection",
  "reading-paths",
  "reading-path",
  "reading-councils",
  "reading-council",
  "start",
  "first-liturgy",
  // The reader's own.
  "account-settings",
  "saved",
  "journal",
  "settings",
  "profile",
  "community",
  "parishes",
  "sign-in",
  // Purify itself.
  "plus",
  "whats-new",
  "about",
  "faq",
  "legal",
  "support",
  "language-editor",
  "email-lists",
  // The shop.
  "shop",
  "shop-item",
  "shop-category",
  "shop-store",
  "cart",
  "checkout",
  "shop-other",
  "seller",
  // Anything else.
  "other",
] as const;

export type ScreenKey = (typeof SCREENS)[number];

/**
 * Patterns, the first that fits wins, so a fixed word comes before the
 * wildcard beside it (/prayers/morning before /prayers/*). "*" is one
 * segment of the address, "**" is one or more.
 */
const RULES: readonly (readonly [string, ScreenKey])[] = [
  ["/", "today"],
  ["/discover", "discover"],

  ["/bible", "bible"],
  ["/bible/multi", "bible-verses"],
  ["/bible/*/*", "bible-chapter"],
  ["/plans", "reading-plans"],
  ["/plans/*", "reading-plan"],
  ["/walkthroughs", "walkthroughs"],
  ["/walkthroughs/*", "walkthrough"],
  ["/walkthroughs/*/*", "walkthrough-chapter"],

  ["/prayers", "prayers"],
  ["/prayers/today", "prayers-today"],
  ["/prayers/morning", "morning-prayers"],
  ["/prayers/evening", "evening-prayers"],
  ["/prayers/personal", "own-rule"],
  ["/prayers/personal/*", "own-rule"],
  ["/prayers/hours", "hours"],
  ["/prayers/hours/*", "hour"],
  ["/prayers/akathists", "akathists"],
  ["/prayers/akathists/*", "akathist"],
  ["/prayers/learning", "learning-to-pray"],
  ["/prayers/learning/*", "prayer-lesson"],
  ["/prayers/*", "prayer"],
  ["/chants", "chants"],
  ["/chants/*", "chant"],
  ["/campaigns", "campaigns"],
  ["/campaigns/mine", "campaigns"],
  ["/campaigns/new", "campaign-new"],
  // /campaigns/detail?id= is the apps' way to a campaign; the website uses /campaigns/<id>.
  ["/campaigns/*", "campaign"],

  ["/saints", "saints"],
  ["/saints/*", "saint"],
  ["/saints/*/web", "saint-web"],
  ["/saints/*/*", "saint-work"],
  ["/calendar", "calendar"],
  ["/fasting", "fasting"],
  ["/councils", "councils"],
  ["/councils/*", "council"],
  ["/councils/*/*", "council-document"],
  ["/history", "history"],
  ["/history/*", "history-entry"],
  ["/heresies", "heresies"],
  ["/heresies/*", "heresy"],

  ["/theology", "theology"],
  ["/theology/doctrine", "doctrine"],
  ["/theology/*", "theology-topic"],
  ["/theology/path/*", "theology-step"],
  ["/theology/*/read", "theology-reading"],
  ["/topics", "topics"],
  ["/topics/*", "topic"],
  ["/apologetics", "apologetics"],
  ["/apologetics/*", "apologetics-answer"],
  ["/fathers-on", "fathers-on"],
  ["/fathers-on/*", "fathers-on-struggle"],
  ["/florilegium", "florilegium"],
  ["/florilegium/*", "florilegium"],
  ["/dictionary", "dictionary"],
  ["/catechism", "catechism"],
  ["/catechism/collections", "catechism-collections"],
  ["/catechism/collections/*", "catechism-collection"],
  ["/who-said-it", "who-said-it"],
  ["/reading", "reading"],
  ["/reading/collections/*", "reading-collection"],
  ["/reading/paths", "reading-paths"],
  ["/reading/paths/*", "reading-path"],
  ["/reading/councils", "reading-councils"],
  ["/reading/councils/*", "reading-council"],
  ["/start", "start"],
  ["/start/first-liturgy", "first-liturgy"],

  ["/account", "you"],
  ["/account/**", "account-settings"],
  ["/saved", "saved"],
  ["/journal", "journal"],
  ["/settings", "settings"],
  ["/u/*", "profile"],
  ["/community", "community"],
  ["/community/**", "community"],
  ["/parishes", "parishes"],
  ["/signin", "sign-in"],
  ["/signup", "sign-in"],
  ["/signout", "sign-in"],
  ["/forgot", "sign-in"],
  ["/reset", "sign-in"],
  ["/set-password", "sign-in"],

  ["/premium", "plus"],
  ["/pricing", "plus"],
  // "Your plan": the reader's own subscription, not a reading plan.
  ["/plan", "plus"],
  ["/whats-new", "whats-new"],
  ["/about", "about"],
  ["/faq", "faq"],
  ["/privacy", "legal"],
  ["/terms", "legal"],
  ["/support", "support"],
  ["/support/**", "support"],
  ["/language-editor", "language-editor"],
  ["/email/unsubscribe", "email-lists"],

  ["/shop", "shop"],
  ["/shop/icons/*", "shop-item"],
  ["/shop/category/*", "shop-category"],
  ["/shop/stores", "shop-store"],
  ["/shop/cart", "cart"],
  ["/shop/checkout/**", "checkout"],
  ["/shop/sell", "seller"],
  ["/shop/sell/**", "seller"],
  ["/shop/seller", "seller"],
  ["/shop/seller/**", "seller"],
  ["/shop/ambassador", "shop-other"],
  ["/shop/policies", "shop-other"],
  ["/shop/support", "shop-other"],
  ["/shop/request", "shop-other"],
  ["/shop/requests", "shop-other"],
  ["/shop/orders", "shop-other"],
  ["/shop/orders/**", "shop-other"],
  ["/shop/messages", "shop-other"],
  ["/shop/messages/**", "shop-other"],
  // A seller's storefront: /shop/<store>, after every fixed word above.
  ["/shop/*", "shop-store"],
];

const COMPILED = RULES.map(([pattern, screen]) => ({ parts: pattern.split("/").filter(Boolean), screen }));

/**
 * The address as a reader would say it: no fragment, no query, one trailing
 * slash dropped, so /prayers/evening/ (the apps' export writes the slash) and
 * /prayers/evening are one page. The same rule as cleanPath() in
 * lib/admin/rollups.ts, which is server-only.
 */
export function screenPath(path: string | null | undefined): string {
  let p = (path || "/").split("#")[0].split("?")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function fits(parts: readonly string[], segs: readonly string[]): boolean {
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "**") return segs.length > i;
    if (i >= segs.length) return false;
    if (parts[i] !== "*" && parts[i] !== segs[i]) return false;
  }
  return parts.length === segs.length;
}

/** The screen an address shows. Anything this does not know is "other". */
export function screenOf(path: string | null | undefined): ScreenKey {
  const segs = screenPath(path).toLowerCase().split("/").filter(Boolean);
  for (const rule of COMPILED) if (fits(rule.parts, segs)) return rule.screen;
  return "other";
}

export function isScreen(word: unknown): word is ScreenKey {
  return typeof word === "string" && (SCREENS as readonly string[]).includes(word);
}
