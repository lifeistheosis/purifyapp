/**
 * The decisions a saint's page makes on a phone (1.7, the owner's note 19 of
 * 2026-10-16: "Clean, but it reads like the desktop page shrunk"), as plain
 * functions so they are tested without a browser.
 *
 * Imports nothing from lib/saints/saints.ts: a client file reaches this one,
 * and the registry must stay out of what the app reads to open
 * (lib/saints/__tests__/brief.test.ts).
 */

/**
 * The doors of a saint's page (1.8, round 3b D, "Fade and doors", the
 * owner's pick of 2026-10-27): Life, Writings, Web, Hymns, in that order.
 */
export type SaintDoor = "life" | "writings" | "web" | "hymns";

/**
 * The parts the doors switch between, below them. The Web door is not one:
 * it opens the saint web (app/(app)/saints/[slug]/web). His miracles, a part
 * of their own in 1.7, are read at the end of his Life now.
 */
export type SaintTab = Exclude<SaintDoor, "web">;

/**
 * The doors this saint has: the Life always, the Writings when there are
 * works on Purify or books in print, the Web when the app's data joins him to
 * another saint (lib/saints/web.ts), the Hymns when the library holds the
 * Church's hymns to him (lib/saints/hymns.ts) or an akathist. A door with
 * nothing behind it is left out, not shown empty, so a saint with his Life
 * alone has no doors at all.
 */
export function saintDoors(input: { works: number; licensed: number; web: boolean; hymns: number }): SaintDoor[] {
  const doors: SaintDoor[] = ["life"];
  if (input.works > 0 || input.licensed > 0) doors.push("writings");
  if (input.web) doors.push("web");
  if (input.hymns > 0) doors.push("hymns");
  return doors;
}

/** The doors that switch the page below them, in order. */
export function saintTabs(doors: readonly SaintDoor[]): SaintTab[] {
  return doors.filter((d): d is SaintTab => d !== "web");
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
