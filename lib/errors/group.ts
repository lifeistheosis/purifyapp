/**
 * The admin's list of errors readers hit (A10): many reports of one fault
 * folded into one line, the most frequent first.
 *
 * One fault is one line: a server error by the route that threw and its
 * message (so /bible/john/1 and /bible/mark/2 failing in the same chapter page
 * are one fault, not two), anything else by its page and its message. Each
 * line says how often, since when, until when, on what and in which versions.
 *
 * Pure. Tested in lib/errors/__tests__/group.test.ts.
 */

export type ErrorRow = {
  at: string;
  source: string;
  page: string | null;
  message: string | null;
  route: string | null;
  status: number | null;
  app_version: string | null;
  platform: string | null;
};

export type ErrorGroup = {
  source: string;
  /** The page of the newest report in the group. */
  page: string | null;
  message: string | null;
  route: string | null;
  status: number | null;
  count: number;
  firstAt: string;
  lastAt: string;
  /** Reports by the kind of device. */
  platforms: Record<string, number>;
  /** The app versions it was seen in, newest first. */
  versions: string[];
};

const keyOf = (r: ErrorRow) =>
  r.source === "server" && r.route ? `server|${r.route}|${r.message ?? ""}` : `${r.source}|${r.page ?? ""}|${r.message ?? ""}`;

const byVersionDesc = (a: string, b: string) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

export function groupErrors(rows: readonly ErrorRow[], limit = 100): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  for (const r of rows) {
    const k = keyOf(r);
    let g = groups.get(k);
    if (!g) {
      g = {
        source: r.source,
        page: r.page,
        message: r.message,
        route: r.route,
        status: r.status,
        count: 0,
        firstAt: r.at,
        lastAt: r.at,
        platforms: {},
        versions: [],
      };
      groups.set(k, g);
    }
    g.count += 1;
    if (r.at < g.firstAt) g.firstAt = r.at;
    if (r.at > g.lastAt) {
      g.lastAt = r.at;
      g.page = r.page;
      g.status = r.status;
    }
    if (r.platform) g.platforms[r.platform] = (g.platforms[r.platform] ?? 0) + 1;
    if (r.app_version && !g.versions.includes(r.app_version)) g.versions.push(r.app_version);
  }
  const out = [...groups.values()];
  for (const g of out) g.versions.sort(byVersionDesc);
  out.sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1));
  return out.slice(0, limit);
}

/** "server error", "screen", "failed call": what each source is called on the page. */
export const SOURCE_WORD: Record<string, string> = {
  server: "On the server",
  screen: "On a reader's screen",
  request: "A call that failed",
};
