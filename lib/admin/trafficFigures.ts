/**
 * Traffic's four numbers and the lines under them, as the owner picked them
 * on sheet r3-15 (Traffic A, 2026-10-30): on the site now, the visitors in
 * the period, the share of website visits that came from search, and the
 * share read in the apps.
 *
 * Counted from what the routes already answer: /api/admin/sources for a
 * window of days, the stats poll's live sessions for Now, and the daily
 * series for the visitors. Pure.
 */

export type Period = "now" | "1d" | "7d" | "30d";

export const PERIODS: readonly (readonly [Period, string])[] = [
  ["now", "Now"],
  ["1d", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
];

/** What a period is called in a sentence: "visits now", "no visits today". */
export const PERIOD_WORD: Record<Period, string> = {
  now: "now",
  "1d": "today",
  "7d": "in 7 days",
  "30d": "in 30 days",
};

export type Tally = { key: string; label: string; count: number };

/** A share in words, never a bare zero for something that happened: "31%", "under 1%". */
export function share(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return "0%";
  const p = Math.round((part / whole) * 100);
  return p < 1 ? "under 1%" : `${p}%`;
}

/** The days of a daily series in the period, and the same number of days before them. */
export function periodSums(
  points: readonly { visitors: number }[],
  days: number,
): { now: number; before: number; complete: boolean } {
  const n = Math.max(1, Math.floor(days));
  const now = points.slice(-n).reduce((a, p) => a + p.visitors, 0);
  const before = points.slice(-2 * n, -n).reduce((a, p) => a + p.visitors, 0);
  return { now, before, complete: points.length >= 2 * n };
}

const APP_SHORT: Record<string, string> = {
  "android-app": "Android",
  "ios-app": "iPhone",
  "desktop-app": "Windows",
};

/** "Android 41%, iPhone 17%, Windows 1%": the apps, the most read first, each as a share of every visit. */
export function appsLine(platforms: readonly Tally[], total: number): string {
  const apps = platforms
    .filter((p) => APP_SHORT[p.key] && p.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((p) => `${APP_SHORT[p.key]} ${share(p.count, total)}`);
  return apps.length > 0 ? apps.join(", ") : "none in the apps";
}

/** The search engine that sent the most website visits, by name, or null. */
export function topSearch(places: readonly (Tally & { kind: string })[]): string | null {
  const s = places.filter((p) => p.kind === "search" && p.count > 0).sort((a, b) => b.count - a.count)[0];
  return s ? s.label : null;
}

export type LiveSession = { fromKind?: string; onKind?: string; from?: string };

/**
 * The same figures for the readers on the site now, from the live sessions:
 * how many are on the website, how many of those came from search, and how
 * many are in each app.
 */
export function liveFigures(sessions: readonly LiveSession[]): {
  total: number;
  website: number;
  search: number;
  topSearch: string | null;
  platforms: Tally[];
} {
  const isApp = (k?: string) => k === "android-app" || k === "ios-app" || k === "desktop-app";
  const byPlatform = new Map<string, number>();
  const searchNames = new Map<string, number>();
  let website = 0;
  let search = 0;
  for (const s of sessions) {
    if (s.onKind) byPlatform.set(s.onKind, (byPlatform.get(s.onKind) ?? 0) + 1);
    if (isApp(s.onKind)) continue;
    website += 1;
    if (s.fromKind === "search") {
      search += 1;
      if (s.from) searchNames.set(s.from, (searchNames.get(s.from) ?? 0) + 1);
    }
  }
  const top = [...searchNames.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    total: sessions.length,
    website,
    search,
    topSearch: top ? top[0] : null,
    platforms: [...byPlatform.entries()].map(([key, count]) => ({ key, label: key, count })),
  };
}
