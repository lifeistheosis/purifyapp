/**
 * The decisions a saint's page makes on a phone (1.7, the owner's note 19 of
 * 2026-10-16: "Clean, but it reads like the desktop page shrunk"), as plain
 * functions so they are tested without a browser.
 *
 * Imports nothing from lib/saints/saints.ts: a client file reaches this one,
 * and the registry must stay out of what the app reads to open
 * (lib/saints/__tests__/brief.test.ts).
 */

/** The parts of a saint's page, in the order the switch shows them. */
export type SaintTab = "life" | "writings" | "miracles";

/**
 * The parts this saint has: the life always, the writings when there are
 * works on Purify or books in print, the miracles when there is a verbatim
 * public-domain account of them. A part with nothing in it is not offered,
 * so most saints have two and sixty have the life alone, with no switch.
 */
export function saintTabs(input: { works: number; licensed: number; miracles: boolean }): SaintTab[] {
  const tabs: SaintTab[] = ["life"];
  if (input.works > 0 || input.licensed > 0) tabs.push("writings");
  if (input.miracles) tabs.push("miracles");
  return tabs;
}

/**
 * The title on the line under the name: the first part of the epithet, which
 * is the saint's office or his place ("Archbishop of Constantinople", "Mother
 * of God", "Father of Monks"). The rest of the epithet is in his life.
 */
export function heroTitle(epithet: string): string {
  return (epithet.split("·")[0] ?? "").trim();
}

/**
 * The line under the request: the readers who asked, in words, and never a
 * bare 0. With nobody yet, an invitation instead of a count.
 */
export type AskLine = { key: "saints.ask.first" } | { key: "saints.ask.count"; count: number };

export function askLine(total: number): AskLine {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  return count === 0 ? { key: "saints.ask.first" } : { key: "saints.ask.count", count };
}
