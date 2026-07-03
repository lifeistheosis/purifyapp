// Content repository — the single seam between pages and storage.
//
// Pages call these methods and never decide between local files, Supabase, or
// an API themselves. Core Orthodox content is local-first: it is read straight
// from the on-device SQLite content tables (imported from the package), so it
// resolves instantly and works in airplane mode. Content is refreshed in bulk
// through the package-update system (see manifest.ts), not per item, so the
// getters are pure local reads — no per-call network branch.
//
// Returns null when an item isn't installed; the caller shows a calm
// "Connect to download" state (components/offline) rather than a blank page.

import type { ContentStore } from "./storage/types";
import type { ContentType } from "./schema";

// Structural shapes (kept here so the repository never imports the server-only
// lib/*/load.ts modules). They mirror the verbatim records in the package.
export type RepoVerse = { n: number; text: string; tokens?: unknown[] };
export type RepoChapter = {
  book: string;
  name: string;
  chapter: number;
  verses: RepoVerse[];
  source: string;
};
export type RepoFeast = {
  date: string; // "MM-DD"
  name: string;
  kind?: string;
  saintSlug?: string;
};
export type SearchResult = {
  type: ContentType;
  ref_id: string;
  title: string;
  score: number;
  /** False when the result's content type isn't downloaded on this device. */
  available: boolean;
};
export type DownloadStatus = {
  contentId: string;
  status: "installed" | "pending" | "failed" | "absent";
  version: string | null;
  bytes: number;
};

export class ContentRepository {
  constructor(private store: ContentStore) {}

  // --- generic local read ------------------------------------------------
  private async getRecord<T>(type: ContentType, refId: string): Promise<T | null> {
    const row = await this.store.get<{ json: string }>(
      "SELECT json FROM content WHERE type = ? AND ref_id = ?",
      [type, refId],
    );
    if (!row) return null;
    try {
      return JSON.parse(row.json) as T;
    } catch {
      return null;
    }
  }

  // --- typed getters -----------------------------------------------------
  getBibleChapter(book: string, chapter: number): Promise<RepoChapter | null> {
    return this.getRecord<RepoChapter>("bible_chapter", `${book}/${chapter}`);
  }
  getPrayer<T = Record<string, unknown>>(id: string): Promise<T | null> {
    return this.getRecord<T>("prayer", id);
  }
  getSaint<T = Record<string, unknown>>(slug: string): Promise<T | null> {
    return this.getRecord<T>("saint", slug);
  }
  getSaintWriting<T = Record<string, unknown>>(
    saintSlug: string,
    workSlug: string,
  ): Promise<T | null> {
    return this.getRecord<T>("saint_writing", `${saintSlug}/${workSlug}`);
  }
  getCouncil<T = Record<string, unknown>>(slug: string): Promise<T | null> {
    return this.getRecord<T>("council", slug);
  }
  getTheologyArticle<T = Record<string, unknown>>(slug: string): Promise<T | null> {
    return this.getRecord<T>("theology", slug);
  }
  getHistoryEvent<T = Record<string, unknown>>(slug: string): Promise<T | null> {
    return this.getRecord<T>("history_event", slug);
  }

  /** History events whose start year falls in [fromYear, toYear], in
   *  chronological order. `key` is the zero-padded start year, so plain
   *  string comparison is correct for the AD range. */
  async getHistoryEventsInRange<T = Record<string, unknown>>(
    fromYear: number,
    toYear: number,
    limit = 200,
  ): Promise<T[]> {
    const pad = (y: number) => String(Math.max(0, y)).padStart(4, "0");
    const rows = await this.store.all<{ json: string }>(
      "SELECT json FROM content WHERE type = 'history_event' AND key BETWEEN ? AND ? ORDER BY key ASC LIMIT ?",
      [pad(fromYear), pad(toYear), limit],
    );
    return rows
      .map((r) => {
        try {
          return JSON.parse(r.json) as T;
        } catch {
          return null;
        }
      })
      .filter((e): e is T => e !== null);
  }

  /** Feast/commemoration entries for a calendar day ("MM-DD"). */
  async getFeastsForDate(mmdd: string): Promise<RepoFeast[]> {
    const rows = await this.store.all<{ json: string }>(
      "SELECT json FROM content WHERE type = 'feast' AND key = ?",
      [mmdd],
    );
    return rows
      .map((r) => {
        try {
          return JSON.parse(r.json) as RepoFeast;
        } catch {
          return null;
        }
      })
      .filter((f): f is RepoFeast => f !== null);
  }

  /** Saints commemorated on a day, resolved from the feast index. */
  async getSaintsForDate<T = Record<string, unknown>>(mmdd: string): Promise<T[]> {
    const feasts = await this.getFeastsForDate(mmdd);
    const out: T[] = [];
    for (const f of feasts) {
      if (!f.saintSlug) continue;
      const s = await this.getSaint<T>(f.saintSlug);
      if (s) out.push(s);
    }
    return out;
  }

  // --- search (local, offline) -------------------------------------------
  /**
   * Search the local index across downloaded content. Title hits outrank body
   * hits; results whose content type isn't installed are still returned but
   * flagged `available: false` so the UI can label "download to read".
   */
  async searchLibrary(
    query: string,
    opts: { types?: ContentType[]; limit?: number } = {},
  ): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const like = `%${q.replace(/[%_]/g, (c) => "\\" + c)}%`;
    const limit = opts.limit ?? 30;
    const typeFilter =
      opts.types && opts.types.length
        ? ` AND type IN (${opts.types.map(() => "?").join(",")})`
        : "";
    const rows = await this.store.all<{
      type: ContentType;
      ref_id: string;
      title: string;
      titleHit: number;
    }>(
      `SELECT type, ref_id, title,
              (CASE WHEN title LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END) AS titleHit
         FROM search_index
        WHERE (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')${typeFilter}
        ORDER BY titleHit DESC
        LIMIT ?`,
      [like, like, like, ...(opts.types ?? []), limit],
    );
    const installed = await this.installedTypes();
    return rows.map((r) => ({
      type: r.type,
      ref_id: r.ref_id,
      title: r.title,
      score: r.titleHit ? 2 : 1,
      available: installed.has(r.type),
    }));
  }

  /** Content types that currently have at least one row installed. */
  private async installedTypes(): Promise<Set<ContentType>> {
    const rows = await this.store.all<{ type: ContentType }>(
      "SELECT DISTINCT type FROM content",
    );
    return new Set(rows.map((r) => r.type));
  }

  // --- downloaded-content registry ---------------------------------------
  async getDownloadedStatus(contentId: string): Promise<DownloadStatus> {
    const row = await this.store.get<{
      status: string;
      version: string | null;
      bytes: number;
    }>(
      "SELECT status, version, bytes FROM downloaded_content WHERE content_id = ?",
      [contentId],
    );
    if (!row)
      return { contentId, status: "absent", version: null, bytes: 0 };
    return {
      contentId,
      status: row.status as DownloadStatus["status"],
      version: row.version,
      bytes: row.bytes ?? 0,
    };
  }

  async markDownloaded(
    contentId: string,
    status: "installed" | "pending" | "failed",
    version: string | null,
    bytes = 0,
  ): Promise<void> {
    await this.store.run(
      `INSERT OR REPLACE INTO downloaded_content
         (content_id, status, version, bytes, downloaded_at)
       VALUES (?, ?, ?, ?, ?)`,
      [contentId, status, version, bytes, new Date().toISOString()],
    );
  }

  async removeDownloadedContent(contentId: string): Promise<void> {
    await this.store.run(
      "DELETE FROM downloaded_content WHERE content_id = ?",
      [contentId],
    );
  }
}
