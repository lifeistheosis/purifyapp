"use client";

// The ••• over a campaign's page and the page itself (1.9.1). The button is
// the page's top bar's `trailing`, and a bar is mounted by the page's FILE,
// never by a component (lib/nav/__tests__/backBar.test.ts reads pages and
// layouts to know which routes bring their own bar). So the button cannot be
// handed the page's state: it asks, and the page answers, the way the works'
// reader's button asks for About this book (lib/saints/workNow.ts).

/** Dispatched on window to open the menu of the campaign on the screen. */
export const CAMPAIGN_MENU_EVENT = "purify:campaign-menu-open";

export function openCampaignMenu(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CAMPAIGN_MENU_EVENT));
}
