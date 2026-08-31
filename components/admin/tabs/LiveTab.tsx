"use client";

// Live view tab — current visitors, world map, real-time feed.
// Polls /api/admin/stats every 5 seconds.

import { useLiveData } from "@/lib/admin/useLiveData";
import dynamic from "next/dynamic";
import type { MapPoint } from "../WorldMap";
import { Card, StatCard } from "../primitives";
import { CountUp } from "../CountUp";

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
};

type Stats = {
  liveCount: number;
  sessions: Session[];
  today: { visitors: number; views: number; signups: number };
  totalUsers: number;
  generatedAt: string;
};

function flag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
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
            <CountUp value={stats?.liveCount ?? "—"} />
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
