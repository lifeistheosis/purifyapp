import type { Dataset, Goal } from "./types";

/**
 * Keeping the imported report and the goals across a reload.
 *
 * localStorage, not the database, and that is a deliberate limit rather than a
 * shortcut. What is stored here is one operator's working set: a report they
 * pasted and the targets they are measuring it against. Putting it in Supabase
 * would mean a migration, an API route, and a decision about who else can see
 * and overwrite it, none of which was asked for. The cost is that this does
 * not follow the operator to another machine, and the UI says so rather than
 * letting them discover it.
 *
 * Everything here is defensive. This is the one input to the engine that comes
 * from outside the running program, and it is trivially editable by anyone
 * with devtools, so it is validated exactly as suspiciously as pasted CSV is.
 */

const KEY = "purify.admin.insights.v1";

export type Persisted = { dataset: Dataset | null; goals: Goal[] };

const EMPTY: Persisted = { dataset: null, goals: [] };

/** Rough shape checks. Enough to reject junk, not a schema validator. */
function isGoal(v: unknown): v is Goal {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.seriesId === "string" &&
    typeof g.label === "string" &&
    (g.period === "daily" || g.period === "weekly" || g.period === "monthly") &&
    typeof g.target === "number" &&
    Number.isFinite(g.target) &&
    typeof g.paused === "boolean"
  );
}

function isDataset(v: unknown): v is Dataset {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (typeof d.id !== "string" || !Array.isArray(d.series)) return false;
  return d.series.every((s: unknown) => {
    if (!s || typeof s !== "object") return false;
    const x = s as Record<string, unknown>;
    return (
      typeof x.id === "string" &&
      typeof x.label === "string" &&
      (x.kind === "stock" || x.kind === "flow") &&
      Array.isArray(x.points)
    );
  });
}

export function loadPersisted(): Persisted {
  // Guarded for the server render and for a browser with storage disabled,
  // where touching localStorage throws rather than returning null.
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const p = parsed as Record<string, unknown>;
    return {
      dataset: isDataset(p.dataset) ? p.dataset : null,
      goals: Array.isArray(p.goals) ? p.goals.filter(isGoal) : [],
    };
  } catch {
    // A corrupt entry is dropped rather than crashing the panel on load. There
    // is nothing here that cannot be re-imported in ten seconds.
    return EMPTY;
  }
}

export function savePersisted(next: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota, or private mode. Failing to persist is not worth interrupting the
    // operator over: the session keeps working, it just will not survive a
    // reload, and the import panel says where this is kept.
  }
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* see above */
  }
}
