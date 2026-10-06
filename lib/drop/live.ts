/**
 * A drop as it stands right now: the file, with what the owner has planned
 * and marked in the admin panel laid over it.
 *
 * drop.json is the words, and it changes with a commit. What changes by the
 * hour is something else: the day a moment is planned for, whether a piece
 * went out, whether a store is serving the build, whether a note has been
 * accepted. Those are the owner's to set from the panel, so they live where
 * his week already lives: admin_tasks, the table behind the Calendar tab
 * (supabase/migrations/20260919000000_ops_board.sql). No new table, and a
 * planned moment shows on the Calendar and in the daily digest for free,
 * because that board already draws any stored row it has no rule for.
 *
 * One row for each thing, told apart by its rule_key:
 *
 *   drop:<release>:m:<moment>   the day a moment is planned for
 *   drop:<release>:p:<piece>    a piece that went out, or a step that is done
 *   drop:<release>:s:<store>    a store that is serving the build
 *   release:<version>           an update still to come, and the day it is meant for
 *
 * Pure: rows in, a plan out. app/api/admin/drop/route.ts does the reading.
 */

import { MOMENTS, type Drop, type Moment } from "./kit";

export type DropRow = {
  id?: string;
  rule_key: string | null;
  title?: string | null;
  notes?: string | null;
  /** A day, as 2026-10-05. */
  due_on: string;
  status: "open" | "done" | "skipped";
  done_at?: string | null;
};

export type Store = "android" | "ios";
export const STORES: readonly Store[] = ["android", "ios"];
export const STORE_NAME: Readonly<Record<Store, string>> = { android: "Google Play", ios: "the App Store" };

export const dropKey = {
  moment: (release: string, moment: Moment) => `drop:${release}:m:${moment}`,
  piece: (release: string, id: string) => `drop:${release}:p:${id}`,
  store: (release: string, store: Store) => `drop:${release}:s:${store}`,
  update: (version: string) => `release:${version}`,
};

export type Upcoming = {
  version: string;
  /** What it is called, or what it is for. */
  title: string;
  /** The day it is meant for. */
  dueOn: string;
  notes: string | null;
  done: boolean;
};

export type Plan = {
  /** The day each moment is planned for. */
  moments: Partial<Record<Moment, string>>;
  /** Pieces marked as sent, and steps marked as done, with the day. */
  done: Record<string, { on: string; notes: string | null }>;
  /** The day each store was marked as serving the build. */
  stores: Partial<Record<Store, string>>;
  /** Updates still to come, soonest first. */
  upcoming: Upcoming[];
};

const day = (row: DropRow) => (row.done_at && row.done_at.length >= 10 ? row.done_at.slice(0, 10) : row.due_on);

/** What the owner has planned and marked for this drop, read out of his task rows. */
export function readPlan(drop: Pick<Drop, "release" | "pieces">, rows: readonly DropRow[]): Plan {
  const plan: Plan = { moments: {}, done: {}, stores: {}, upcoming: [] };
  const mine = `drop:${drop.release}:`;
  const pieces = new Set(drop.pieces.map((p) => p.id));
  for (const row of rows) {
    const key = row.rule_key ?? "";
    if (key.startsWith("release:")) {
      const version = key.slice("release:".length);
      if (/^\d+\.\d+(\.\d+)?$/.test(version)) {
        plan.upcoming.push({ version, title: row.title ?? `Purify ${version}`, dueOn: row.due_on, notes: row.notes ?? null, done: row.status === "done" });
      }
      continue;
    }
    if (!key.startsWith(mine)) continue;
    const [kind, ...rest] = key.slice(mine.length).split(":");
    const id = rest.join(":");
    if (kind === "m" && (MOMENTS as readonly string[]).includes(id)) plan.moments[id as Moment] = row.due_on;
    else if (kind === "p" && pieces.has(id) && row.status === "done") plan.done[id] = { on: day(row), notes: row.notes ?? null };
    else if (kind === "s" && (STORES as readonly string[]).includes(id) && row.status === "done") plan.stores[id as Store] = day(row);
  }
  plan.upcoming.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.version < b.version ? -1 : 1));
  return plan;
}

/**
 * The drop with the plan laid over it, so the same rules can be run on what
 * is true now and not only on what the file says.
 *
 * `published` is the versions What's New is really showing, or null when that
 * could not be read. When it can, it outranks the file both ways: a note the
 * file calls accepted and the site does not show is not accepted.
 */
export function liveDrop(drop: Drop, plan: Plan, published: readonly string[] | null): Drop {
  return {
    ...drop,
    notes: drop.notes.map((note) => {
      if (!published) return note;
      if (published.includes(note.version)) return { ...note, state: "accepted" };
      return note.state === "accepted" ? { ...note, state: "queued" } : note;
    }),
    builds: {
      android: { ...drop.builds.android, served: drop.builds.android.served ?? plan.stores.android ?? null },
      ios: { ...drop.builds.ios, served: drop.builds.ios.served ?? plan.stores.ios ?? null },
    },
    pieces: drop.pieces.map((piece) => {
      const mark = plan.done[piece.id];
      return mark && !piece.sent ? { ...piece, sent: { on: mark.on, by: "owner" } } : piece;
    }),
  };
}

/** The day a piece is due: its moment's planned day, when there is one. */
export function dueOn(drop: Pick<Drop, "pieces">, plan: Plan, pieceId: string): string | null {
  const piece = drop.pieces.find((p) => p.id === pieceId);
  return piece ? (plan.moments[piece.moment] ?? null) : null;
}
