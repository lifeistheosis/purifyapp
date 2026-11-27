// Which tab the bar lights (components/nav/MobileTabBar.tsx).
//
// Most pages belong to one tab. A page with two homes is claimed by both, and
// lights the tab the reader came from: the journal is opened from the Bible's
// study row and from You ("Your journal", 1.9), and lit the Bible even when the
// reader came from You (seen 2026-11-23 on main's export). With no tab to go by
// (the app opened straight onto it), the first tab that claims it, as before.
//
// Pure, so it is tested directly (lib/nav/__tests__/tabLit.test.ts).

/** The keys of the tabs that claim this page, in the bar's order, and the last tab a page of one home lit. */
export function tabLit(claims: readonly string[], last: string | null): string | null {
  if (claims.length > 1 && last && claims.includes(last)) return last;
  return claims[0] ?? null;
}
