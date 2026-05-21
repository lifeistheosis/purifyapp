"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapPoint } from "./WorldMap";

// react-simple-maps fetches a topojson at render — load it client-only.
const WorldMap = dynamic(() => import("./WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[2/1] rounded-lg border border-paper/10 bg-night animate-pulse" />
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
  topPages: { path: string; count: number }[];
  topCountries: { name: string; code: string | null; count: number }[];
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

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-paper/10 bg-night p-5">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45">
        {label}
      </p>
      <p
        className={
          "mt-2 font-sans text-[34px] font-bold tabular-nums leading-none " +
          (accent ? "text-gold" : "text-paper")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = (await r.json()) as Stats;
        if (alive) {
          setStats(j);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const points: MapPoint[] =
    stats?.sessions
      .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
      .map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            Admin · Live View
          </p>
          <h1 className="font-sans text-[32px] md:text-[40px] font-bold text-paper tracking-[-0.02em]">
            Who&rsquo;s here right now
          </h1>
        </div>
        <p className="font-sans text-[12px] text-paper/40">
          {adminEmail}
          {error ? " · reconnecting…" : stats ? " · live" : " · loading…"}
        </p>
      </div>

      {/* Live count + today */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-gold/30 bg-gold/[0.06] p-5 col-span-2 md:col-span-1">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-gold/80 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-gold animate-pulse" />
            Live now
          </p>
          <p className="mt-2 font-sans text-[44px] font-bold tabular-nums leading-none text-gold">
            {stats?.liveCount ?? "—"}
          </p>
        </div>
        <Stat label="Visitors today" value={stats?.today.visitors ?? "—"} />
        <Stat label="Page views today" value={stats?.today.views ?? "—"} />
        <Stat label="New users today" value={stats?.today.signups ?? "—"} accent />
        <Stat label="Total users" value={stats?.totalUsers ?? "—"} />
      </div>

      {/* Map */}
      <WorldMap points={points} />

      {/* Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-paper/10 bg-night p-5">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45 mb-4">
            Active visitors
          </p>
          {stats && stats.sessions.length === 0 && (
            <p className="font-sans text-[14px] text-paper/45">No one on the site right now.</p>
          )}
          <ul className="space-y-2 max-h-[360px] overflow-y-auto">
            {stats?.sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-paper/8 bg-paper/[0.02] px-3 py-2.5"
              >
                <span className="text-[18px] leading-none">{flag(s.countryCode)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[14px] text-paper truncate">
                    {[s.city, s.country].filter(Boolean).join(", ") || "Unknown location"}
                  </p>
                  <p className="font-sans text-[12px] text-paper/45 truncate">
                    {s.path ?? "—"}
                  </p>
                </div>
                <span className="shrink-0 font-sans text-[11px] text-paper/40 tabular-nums">
                  {timeAgo(s.lastSeen)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-paper/10 bg-night p-5">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45 mb-4">
              Top pages today
            </p>
            <ul className="space-y-2">
              {stats?.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[13px] text-paper/80 truncate">{p.path}</span>
                  <span className="font-sans text-[13px] text-paper/55 tabular-nums">{p.count}</span>
                </li>
              ))}
              {stats && stats.topPages.length === 0 && (
                <li className="font-sans text-[13px] text-paper/45">No views yet today.</li>
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-paper/10 bg-night p-5">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45 mb-4">
              Top locations today
            </p>
            <ul className="space-y-2">
              {stats?.topCountries.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[13px] text-paper/80 truncate flex items-center gap-2">
                    <span>{flag(c.code)}</span>
                    {c.name}
                  </span>
                  <span className="font-sans text-[13px] text-paper/55 tabular-nums">{c.count}</span>
                </li>
              ))}
              {stats && stats.topCountries.length === 0 && (
                <li className="font-sans text-[13px] text-paper/45">No visitors yet today.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
