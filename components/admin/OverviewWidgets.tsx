"use client";

// Compact summaries of the sections Overview never showed.
//
// THE GAP THIS CLOSES. Overview is the landing screen and it reported money
// and new users only, while Traffic, Engagement, Audience, Carts, Health,
// Community, Push, EIKON and Content health were all full tabs with working
// routes. Answering "how is the thing doing" meant visiting eleven tabs.
//
// WHAT THESE ARE NOT. Not a second copy of each tab. One number, occasionally
// two, from the section's OWN existing route, so nothing here re-derives a
// query that already lives somewhere else. Tapping through is still how you
// see the detail.
//
// WHY localStorage AND NOT A TABLE. There is one operator. A table would be a
// migration, and in this repo a migration merge is production DDL. If this ever
// needs to follow Edgar across devices, that is the moment to have the
// conversation, not before.
//
// WHY MOST ARE OFF BY DEFAULT. He asked for a minimized summary. Shipping all
// nine and calling it minimized would miss the point, so the default is the
// two that answer "is it up and is anyone here", and the rest are one click
// away.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { StatCard } from "./primitives";

const STORAGE_KEY = "purify.admin.overviewWidgets";

type Widget = {
  id: string;
  label: string;
  /** The section's own route. Never a new query. */
  url: string;
  /** One line, occasionally two. Return null when the shape is not what we expect. */
  read: (d: unknown) => { value: string | number; hint?: string } | null;
  defaultOn: boolean;
};

const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const WIDGETS: Widget[] = [
  {
    id: "traffic",
    label: "Visitors · 30 days",
    url: "/api/admin/traffic?range=30d",
    defaultOn: true,
    read: (d) => {
      const pts = arr((d as { points?: unknown }).points) as { visitors?: number }[];
      if (!pts.length) return null;
      const total = pts.reduce((a, p) => a + n(p.visitors), 0);
      return { value: total.toLocaleString(), hint: `${pts.length} days counted` };
    },
  },
  {
    id: "health",
    label: "Service health",
    url: "/api/admin/health",
    defaultOn: true,
    read: (d) => {
      // Revives a route that had no caller at all. The probe runs on load,
      // which is exactly how HealthTab already works: nothing is persisted,
      // so there is no last-known status to read instead.
      const probes = arr((d as { probes?: unknown }).probes) as {
        status?: string;
        service?: string;
      }[];
      if (!probes.length) return null;
      const bad = probes.filter((p) => p.status !== "ok");
      return {
        value: bad.length ? `${bad.length} failing` : "All OK",
        hint: bad.length
          ? bad.map((p) => p.service ?? "?").join(", ")
          : `${probes.length} dependencies`,
      };
    },
  },
  {
    id: "community",
    label: "Awaiting moderation",
    url: "/api/admin/community",
    defaultOn: false,
    read: (d) => {
      const o = d as Record<string, unknown>;
      const total =
        arr(o.pendingRecipes).length +
        arr(o.campaignReports).length +
        arr(o.recipeReports).length +
        arr(o.conversationReports).length;
      return {
        value: total,
        hint: `${arr(o.pendingRecipes).length} recipes · ${
          arr(o.campaignReports).length + arr(o.recipeReports).length + arr(o.conversationReports).length
        } reports`,
      };
    },
  },
  {
    id: "carts",
    label: "Live carts",
    url: "/api/admin/carts",
    defaultOn: false,
    read: (d) => {
      const o = d as Record<string, unknown>;
      return {
        value: arr(o.liveCarts).length,
        hint: `${arr(o.abandoned).length} abandoned checkouts`,
      };
    },
  },
  {
    id: "engagement",
    label: "Return rate · 30 days",
    url: "/api/admin/engagement?range=30d",
    defaultOn: false,
    read: (d) => {
      const t = (d as { totals?: Record<string, unknown> }).totals;
      if (!t) return null;
      return {
        value: `${n(t.returnRate)}%`,
        hint: `${n(t.visitors).toLocaleString()} visitors`,
      };
    },
  },
  {
    id: "content",
    label: "Content gaps",
    url: "/api/admin/content-health",
    defaultOn: false,
    read: (d) => {
      // The other route with no caller. This is the surface that would have
      // shown the icon rights debt.
      const o = d as Record<string, unknown>;
      const counts = Object.values(o).filter((v) => Array.isArray(v)).map((v) => (v as unknown[]).length);
      if (!counts.length) return null;
      return { value: counts.reduce((a, b) => a + b, 0), hint: "items flagged on disk" };
    },
  },
];

const DEFAULT_IDS = WIDGETS.filter((w) => w.defaultOn).map((w) => w.id);

/**
 * localStorage as an external store, the same shape AdminThemeToggle uses and
 * for the same reason its comment gives: reading it in an effect and calling
 * setState hydrates mismatched (the server cannot know what is stored) and
 * trips react-hooks/set-state-in-effect.
 *
 * The snapshot is cached because useSyncExternalStore compares by identity,
 * and parsing JSON on every render would hand back a fresh array each time and
 * spin forever.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedIds: string[] = DEFAULT_IDS;

function readIds(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedIds;
  }
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  if (!raw) {
    cachedIds = DEFAULT_IDS;
    return cachedIds;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("bad shape");
    // Filter against the catalogue, so a widget removed from the code cannot
    // resurrect itself out of stored prefs.
    cachedIds = parsed.filter((id): id is string => WIDGETS.some((w) => w.id === id));
  } catch {
    cachedIds = DEFAULT_IDS;
  }
  return cachedIds;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // A second admin tab changing the set should not leave this one stale.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function writeIds(next: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full. The choice still holds for this page view
    // and simply does not survive a reload, same posture as the theme toggle.
  }
  cachedRaw = null;
  readIds();
  listeners.forEach((l) => l());
}

function WidgetCard({ widget }: { widget: Widget }) {
  const [state, setState] = useState<{ value: string | number; hint?: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminJson<unknown>(widget.url).then((d) => {
      if (!alive) return;
      if (d === null) {
        setFailed(true);
        return;
      }
      const read = widget.read(d);
      if (read) setState(read);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
    // Deliberately load-once. The full tab polls; a summary that polled too
    // would double the load on every one of these routes for no new answer.
  }, [widget]);

  return (
    <StatCard
      label={widget.label}
      value={failed ? "Unavailable" : (state?.value ?? "…")}
      hint={failed ? "the section itself will say why" : state?.hint}
    />
  );
}

export function OverviewWidgets() {
  const visible = useSyncExternalStore(subscribe, readIds, () => DEFAULT_IDS);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(
    (id: string) => {
      writeIds(visible.includes(id) ? visible.filter((x) => x !== id) : [...visible, id]);
    },
    [visible],
  );

  const shown = WIDGETS.filter((w) => visible.includes(w.id));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
          Elsewhere in the panel
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="font-sans text-[12.5px] font-medium underline-offset-4 hover:underline focus-visible:underline"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {open ? "Done" : "Customize"}
        </button>
      </div>

      {open && (
        <div
          className="mb-4 flex flex-wrap gap-2 rounded-[var(--adm-radius)] border p-3"
          style={{ background: "var(--adm-panel-2)", borderColor: "var(--adm-line)" }}
        >
          {WIDGETS.map((w) => {
            const on = visible.includes(w.id);
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => toggle(w.id)}
                aria-pressed={on}
                className="adm-control h-11 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px] font-medium"
                style={{
                  ["--_bg" as string]: on ? "var(--adm-accent)" : "var(--adm-control)",
                  ["--_bg-hover" as string]: on ? "var(--adm-accent)" : "var(--adm-hover)",
                  borderColor: on ? "var(--adm-accent)" : "var(--adm-line-strong)",
                  color: on ? "var(--adm-on-accent)" : "var(--adm-ink-2)",
                }}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Nothing selected. Choose what belongs here with Customize.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shown.map((w) => (
            <WidgetCard key={w.id} widget={w} />
          ))}
        </div>
      )}
    </div>
  );
}
