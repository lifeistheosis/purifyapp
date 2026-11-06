import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The clergy review list, ours only (1.9; editorial standards 27, the owner's
 * rule of 2026-11-06: "if it needs to be reviewed by [clergy], that's going to
 * be on our side. Don't allow that on their side").
 *
 * Every text the editorials wrote carries `review: { status:
 * "awaiting-clergy-review", ... }` in its data file, so a reviewer can find
 * all of it (the standing note, item 8). Readers never see that mark; this
 * list is where the team does: each marked file, its area (the folder under
 * data/), its title, since when, and what it rests on.
 *
 * The Bible's own folder is not read: Scripture is carried verbatim from its
 * editions and never marked, and it is 5,210 of the 5,687 files (2026-11-06).
 */

export const REVIEW_MARK = "awaiting-clergy-review";

export type ReviewItem = {
  /** The folder under data/: history, councils, chants, today... */
  area: string;
  /** The file, from the repository's root, to open in git. */
  file: string;
  title: string;
  /** When it was drafted or marked, as the file says it. */
  since: string | null;
  /** What it rests on, where the file says. */
  basis: string | null;
};

export type ReviewQueue = {
  total: number;
  areas: { area: string; count: number }[];
  items: ReviewItem[];
};

const SKIP = new Set(["bible"]);

/** One file's entry, or null when it is not marked. Pure. */
export function reviewItem(rel: string, doc: unknown): ReviewItem | null {
  if (!doc || typeof doc !== "object") return null;
  const o = doc as Record<string, unknown>;
  const review = o.review as Record<string, unknown> | undefined;
  if (!review || review.status !== REVIEW_MARK) return null;
  const parts = rel.split(/[\\/]/);
  const area = parts[0] === "data" ? (parts[1] ?? "data") : (parts[0] ?? "data");
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const fromSlug = (s: string) => s.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const stem = (parts[parts.length - 1] ?? "").replace(/\.json$/, "");
  const title = str(o.title) ?? str(o.name) ?? (str(o.slug) ? fromSlug(str(o.slug)!) : fromSlug(parts.slice(2).join(" ").replace(/\.json$/, "") || stem));
  return { area, file: rel, title, since: str(review.drafted) ?? str(review.since), basis: str(review.basis) };
}

/** Every marked file under data/, sorted by area, then title. */
export async function readReviewQueue(root: string): Promise<ReviewQueue> {
  const items: ReviewItem[] = [];
  const dataDir = path.join(root, "data");
  async function walk(dir: string, depth: number): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (depth === 0 && SKIP.has(e.name)) continue;
        await walk(full, depth + 1);
      } else if (e.isFile() && e.name.endsWith(".json")) {
        let raw: string;
        try {
          raw = await fs.readFile(full, "utf8");
        } catch {
          continue;
        }
        if (!raw.includes(REVIEW_MARK)) continue;
        try {
          const item = reviewItem(path.relative(root, full).split(path.sep).join("/"), JSON.parse(raw));
          if (item) items.push(item);
        } catch {
          // A file that does not parse is the library check's to report, not this list's.
        }
      }
    }
  }
  await walk(dataDir, 0);
  items.sort((a, b) => a.area.localeCompare(b.area) || a.title.localeCompare(b.title));
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.area, (counts.get(it.area) ?? 0) + 1);
  const areas = [...counts].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
  return { total: items.length, areas, items };
}
