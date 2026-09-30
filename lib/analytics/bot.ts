// Automation that names itself. Crawlers and headless browsers that render
// pages run the visit tracker like any reader, and 403 of the 10,970 sessions
// recorded 2026-09-10 to 2026-09-30 were them: HeadlessChrome, YandexBot,
// AdsBot-Google, Stripebot, DuckDuckBot, ClaudeBot and others. The same
// pattern matched no human user agent in those three weeks.
//
// This only catches automation that is honest about itself. A scraper that
// borrows a normal Chrome user agent passes it; the input gate in
// components/analytics/AnalyticsTracker.tsx is what stops that kind.
//
// No `server-only`: the tracker runs the same check in the browser.

const AUTOMATION =
  /headless|bot|crawl|spider|slurp|scrap|lighthouse|pagespeed|phantomjs|puppeteer|playwright|selenium|webdriver|python|curl\/|wget|go-http-client|node-fetch|undici|axios|okhttp|java\/|libwww|httpclient|facebookexternalhit|embedly|mediapartners|google-inspectiontool|googleother/i;

// "bot" alone would also match Cubot, an Android phone maker.
const PHONE_NAMES_WITH_BOT = /cubot/gi;

/**
 * True when a user agent, or the Sec-CH-UA brand list a Chromium browser sends
 * beside it, names a bot or a headless browser. A missing user agent counts as
 * automation: every browser and both native shells send one.
 */
export function isAutomatedAgent(
  userAgent: string | null | undefined,
  brands?: string | null,
): boolean {
  if (!userAgent?.trim()) return true;
  if (AUTOMATION.test(userAgent.replace(PHONE_NAMES_WITH_BOT, ""))) return true;
  return !!brands && AUTOMATION.test(brands);
}
