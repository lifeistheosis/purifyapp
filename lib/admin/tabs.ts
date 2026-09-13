/**
 * Which section is open, and which sections this account may open.
 *
 * Pure, and in lib/ rather than inside AdminShell, for one reason: the rule
 * below is a permission decision, and a permission decision that can only be
 * exercised by rendering a client component with twenty-three tab imports
 * behind it does not get tested. Here it is four lines and a test file.
 *
 * WHAT THIS IS AND IS NOT. resolveTab decides what the RAIL offers and what
 * the URL says. It is presentation. It is not what keeps owner data or the
 * projection engine away from a non-owner: that is the 403 in
 * app/api/owner/actuals/route.ts and the fetch-then-import() in
 * components/admin/OwnerSection.tsx. Someone who flips isOwner in devtools
 * gets an extra nav item and nothing behind it.
 */

export type AdminMode = "ops" | "owner";

export type OwnerTabId = "owner-today" | "owner-model" | "owner-markets";

export const OWNER_TAB_IDS: readonly OwnerTabId[] = [
  "owner-today",
  "owner-model",
  "owner-markets",
];

const OWNER_SET: ReadonlySet<string> = new Set(OWNER_TAB_IDS);

export const isOwnerTab = (id: string): boolean => OWNER_SET.has(id);

export const modeOf = (id: string): AdminMode => (isOwnerTab(id) ? "owner" : "ops");

/**
 * The tab actually shown, given the one asked for.
 *
 * An owner tab requested by an account the owner gate refuses resolves to
 * Overview. Derived during render rather than corrected in an effect: an
 * effect that calls setState on a value it also depends on is a cascading
 * render, which is the lint rule AdminThemeToggle and the projection chart's
 * tween both had to be rewritten for.
 */
export function resolveTab(requested: string, isOwner: boolean): string {
  return !isOwner && isOwnerTab(requested) ? "overview" : requested;
}

/** Which of the owner dashboard's three panels a tab id names. */
export function ownerPanelOf(id: string): "today" | "model" | "markets" {
  if (id === "owner-model") return "model";
  if (id === "owner-markets") return "markets";
  return "today";
}
