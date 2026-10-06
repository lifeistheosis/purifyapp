// Where a visit came from and what it is read on, in the words the panel shows.
//
// The session row keeps a referrer and a user agent (lib/analytics/source.ts
// and platform.ts read them). This is the one place those two readings are put
// into words, so the Live list, the activity feed and the Sources panel cannot
// say the same visit three ways. The raw referrer and user agent stay on the
// server: a route sends what is made of them here and nothing else.

import { classifyPlatform, isAppPlatform, PLATFORM_KINDS, PLATFORM_LABEL, type PlatformKind } from "@/lib/analytics/platform";
import { classifySource, SOURCE_KINDS, SOURCE_LABEL, sourceName, type SourceKind } from "@/lib/analytics/source";

export type Arrival = {
  /** Where from, by name: "Google", "Instagram", "Gmail", "Direct", "Opened the app". */
  from: string;
  fromKind: SourceKind;
  /** What on: "iPhone app", "Website, phone". */
  on: string;
  onKind: PlatformKind;
};

/** What "direct" means inside one of the apps: the reader opened it. */
export const OPENED_THE_APP = "Opened the app";

export function arrivalOf(referrer: string | null | undefined, userAgent: string | null | undefined): Arrival {
  const source = classifySource(referrer, userAgent);
  const onKind = classifyPlatform(userAgent);
  return {
    from: source.kind === "direct" && isAppPlatform(onKind) ? OPENED_THE_APP : sourceName(source),
    fromKind: source.kind,
    on: PLATFORM_LABEL[onKind],
    onKind,
  };
}

/** One visit in a few words, for a line under a sentence: "Instagram · iPhone app". */
export function arrivalLine(a: Pick<Arrival, "from" | "on">): string {
  return `${a.from} · ${a.on}`;
}

export type Tally = { key: string; label: string; count: number };

export type ArrivalRollup = {
  total: number;
  /** By kind of source, every kind present even at zero, in the order they are read. */
  sources: Tally[];
  /** By named place, most first: "Google", "Instagram", a host. Direct visits are not named. */
  places: (Tally & { kind: SourceKind })[];
  /** By what it was read on, every platform present even at zero. */
  platforms: Tally[];
  /** How many were in one of the apps, and how many on the website. Named so larp mode moves them with the rest. */
  appSessions: number;
  websiteSessions: number;
};

/**
 * Count many sessions at once. Pure, so the Sources route and the Live panel's
 * summary both use it and vitest can hold it.
 */
export function rollupArrivals(rows: readonly { referrer: string | null; user_agent: string | null }[], placesKept = 12): ArrivalRollup {
  const byKind = new Map<SourceKind, number>(SOURCE_KINDS.map((k) => [k, 0]));
  const byPlatform = new Map<PlatformKind, number>(PLATFORM_KINDS.map((k) => [k, 0]));
  const byPlace = new Map<string, { kind: SourceKind; count: number }>();
  let apps = 0;

  for (const row of rows) {
    const source = classifySource(row.referrer, row.user_agent);
    const platform = classifyPlatform(row.user_agent);
    byKind.set(source.kind, (byKind.get(source.kind) ?? 0) + 1);
    byPlatform.set(platform, (byPlatform.get(platform) ?? 0) + 1);
    if (isAppPlatform(platform)) apps += 1;
    if (source.name) {
      const place = byPlace.get(source.name) ?? { kind: source.kind, count: 0 };
      place.count += 1;
      byPlace.set(source.name, place);
    }
  }

  return {
    total: rows.length,
    sources: SOURCE_KINDS.map((k) => ({ key: k, label: SOURCE_LABEL[k], count: byKind.get(k) ?? 0 })),
    places: [...byPlace.entries()]
      .map(([name, p]) => ({ key: name, label: name, kind: p.kind, count: p.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, placesKept),
    platforms: PLATFORM_KINDS.map((k) => ({ key: k, label: PLATFORM_LABEL[k], count: byPlatform.get(k) ?? 0 })),
    appSessions: apps,
    websiteSessions: rows.length - apps,
  };
}
