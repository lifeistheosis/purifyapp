"use client";

// Live view tab — current visitors, world map, real-time feed.
// Polls /api/admin/stats every 5 seconds.

import { useLiveData } from "@/lib/admin/useLiveData";
import dynamic from "next/dynamic";
import type { MapPoint } from "../WorldMap";
import { Card, StatCard } from "../primitives";
import { Odometer } from "../Odometer";

const WorldMap = dynamic(() => import("../WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[2/1] rounded-[var(--adm-radius-sm)] border border-paper/10 bg-night animate-pulse" />
  ),
});

type Session = {
  id: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  path: string | null;
  lastSeen: string;
  /* Where the visit came from and what it is read on, in the panel's own
     words (lib/admin/arrivals.ts). Optional, because a response cached from
     before these existed has neither. */
  from?: string;
  on?: string;
};

type Stats = {
  /* null means the read failed, not that the number is zero. The stats
     route binds its errors and sends null rather than coalescing to 0,
     so a dead database reads as a dash instead of a dead site. */
  liveCount: number | null;
  sessions: Session[];
  today: { visitors: number | null; views: number | null; signups: number | null };
  totalUsers: number | null;
  generatedAt: string;
};

function flag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** How many live visits share each answer, most first: "Google 3", "Direct 2". */
function tally(sessions: Session[], pick: (s: Session) => string | undefined): [string, number][] {
  const seen = new Map<string, number>();
  for (const s of sessions) {
    const key = pick(s);
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function ChipRow({ label, items }: { label: string; items: [string, number][] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 font-sans text-eyebrow font-medium uppercase tracking-[1.2px] text-paper/40">{label}</span>
      {items.map(([name, n]) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-[var(--adm-radius-pill)] border border-paper/[0.1] bg-paper/[0.03] px-2.5 py-1 font-sans text-caption text-paper/80"
        >
          {name}
          <span className="tabular-nums text-gold-pale">{n}</span>
        </span>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

export function LiveTab() {
  // The five second cadence is kept: this is the live map and it is meant to
  // be live. What it was missing is the visibility pause. /api/admin/stats is
  // the heaviest read in the panel (it walks up to 20,000 session rows), and a
  // bare interval fired it twelve times a minute in a window nobody was
  // looking at. useLiveData stops on document.hidden and reads at once on
  // return, so the map is fresh when it is watched and silent when it is not.
  const { data: stats, failing: error } = useLiveData<Stats>(
    "/api/admin/stats",
    5000,
  );

  const fromNow = tally(stats?.sessions ?? [], (s) => s.from);
  const onNow = tally(stats?.sessions ?? [], (s) => s.on);

  const points: MapPoint[] =
    stats?.sessions
      .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
      .map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-end">
        <p className="font-sans text-eyebrow text-paper/40">
          {error ? "reconnecting…" : stats ? `live · updated ${timeAgo(stats.generatedAt)}` : "loading…"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-[var(--adm-radius)] border border-gold/30 bg-gold/[0.06] p-5 col-span-2 md:col-span-1">
          <p className="font-sans text-detail font-medium tracking-[1.2px] text-gold-pale/80 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-gold animate-pulse" />
            Live now
          </p>
          <p className="mt-2 font-sans text-display font-bold tabular-nums leading-none text-gold-pale">
            <Odometer value={stats?.liveCount ?? "—"} />
          </p>
        </div>
        <StatCard label="Visitors today" value={stats?.today.visitors ?? "—"} />
        <StatCard label="Page views today" value={stats?.today.views ?? "—"} />
        <StatCard label="New users today" value={stats?.today.signups ?? "—"} accent />
        <StatCard label="Total users" value={stats?.totalUsers ?? "—"} />
      </div>

      <WorldMap points={points} />

      <Card title="Active visitors" subtitle={`${stats?.sessions.length ?? 0} on the site right now`}>
        {stats && stats.sessions.length === 0 && (
          <p className="font-sans text-ui text-paper/45">No one on the site right now.</p>
        )}
        {/* Where the readers on the site right now came from, and what they
            are reading on. Counted from the same rows as the list below. */}
        {fromNow.length > 0 && (
          <div className="mb-4 space-y-2">
            <ChipRow label="From" items={fromNow} />
            <ChipRow label="On" items={onNow} />
          </div>
        )}
        <ul className="space-y-2 max-h-[420px] overflow-y-auto">
          {stats?.sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-[var(--adm-radius-sm)] border border-paper/[0.08] bg-paper/[0.02] px-3 py-2.5"
            >
              <span className="text-lede leading-none">{flag(s.countryCode)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-ui text-paper truncate">
                  {[s.city, s.country].filter(Boolean).join(", ") || "Unknown location"}
                </p>
                <p className="font-sans text-caption text-paper/45 truncate">{s.path ?? "—"}</p>
                {s.from && (
                  <p className="mt-0.5 font-sans text-caption text-paper/60 truncate">
                    <span className="text-gold-pale/90">{s.from}</span>
                    {s.on ? ` · ${s.on}` : ""}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-sans text-eyebrow text-paper/40 tabular-nums">
                {timeAgo(s.lastSeen)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
