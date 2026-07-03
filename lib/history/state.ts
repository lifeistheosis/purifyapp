// Timeline state: what the reader was looking at (filters, search, selected
// event) and how it round-trips.
//
// Web: state serializes to clean URL search params (?era=…&cat=…&q=…&e=…) so
// a filtered view is shareable and browser Back/Forward behave; it also
// persists to localStorage so returning to /history resumes where you were.
// Native shell: URL is never touched (hardware Back must mean "leave the
// page", not "undo one filter") — state lives in memory + localStorage only.
//
// Persistence follows lib/reader/position.ts: silent, TTL-bound, and every
// failure swallowed so the timeline never breaks on storage errors.

import {
  CERTAINTY_LEVELS,
  EVENT_CATEGORIES,
  HISTORY_ERAS,
  type Certainty,
  type Era,
  type EventCategory,
} from "./events";
import { EMPTY_FILTERS, type TimelineFilterState } from "./filter";

export type TimelineState = TimelineFilterState & {
  /** Slug selected in the context rail (tablet/desktop) — `e=` on web. */
  selected?: string;
};

const STATE_KEY = "purify.history.state";
const STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const ERA_IDS = new Set(HISTORY_ERAS.map((e) => e.id));
const CATEGORY_IDS = new Set(EVENT_CATEGORIES.map((c) => c.id));
const CERTAINTY_IDS = new Set(CERTAINTY_LEVELS.map((c) => c.id));

export const EMPTY_STATE: TimelineState = { ...EMPTY_FILTERS };

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Serialize to URL params, omitting defaults so bare /history stays bare. */
export function toSearchParams(s: TimelineState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.era) p.set("era", s.era);
  if (s.categories.length) p.set("cat", s.categories.join(","));
  if (s.certainty) p.set("cert", s.certainty);
  if (s.century) p.set("c", String(s.century));
  if (s.query.trim()) p.set("q", s.query.trim());
  if (s.selected) p.set("e", s.selected);
  return p;
}

/** Parse URL params defensively — unknown values are dropped, never thrown. */
export function fromSearchParams(p: URLSearchParams): TimelineState {
  const state: TimelineState = { ...EMPTY_FILTERS, categories: [] };
  const era = p.get("era");
  if (era && ERA_IDS.has(era as Era)) state.era = era as Era;
  const cat = p.get("cat");
  if (cat) {
    state.categories = cat
      .split(",")
      .filter((c): c is EventCategory => CATEGORY_IDS.has(c as EventCategory));
  }
  const cert = p.get("cert");
  if (cert && CERTAINTY_IDS.has(cert as Certainty)) state.certainty = cert as Certainty;
  const c = parseInt(p.get("c") ?? "", 10);
  if (Number.isFinite(c) && c >= 1 && c <= 21) state.century = c;
  const q = p.get("q");
  if (q) state.query = q;
  const e = p.get("e");
  if (e && /^[a-z0-9-]+$/.test(e)) state.selected = e;
  return state;
}

export function loadPersistedState(): TimelineState | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { state?: string; savedAt?: number };
    if (typeof v.state !== "string" || typeof v.savedAt !== "number") return null;
    if (Date.now() - v.savedAt > STATE_TTL_MS) return null;
    // Reuse the URL codec so persisted state gets the same validation.
    return fromSearchParams(new URLSearchParams(v.state));
  } catch {
    return null;
  }
}

export function persistState(s: TimelineState): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ state: toSearchParams(s).toString(), savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}
