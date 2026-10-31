"use client";

/**
 * Traffic: the owner's pick on sheet r3-15 (2026-10-30), A with C's zoom.
 * "Traffic looks insane, brother. Okay. Do A, but allow you to zoom in like
 * how C's mobile has it. So zoom into a specific country."
 *
 * Overview is A: four numbers, then the world as a heat map with the readers
 * on the site now as lit points and a card for every country, the most
 * visited countries beside it, and where website visits came from and what
 * they are read on under it. A click on a country whose regions are drawn
 * opens them in place (the United States first); the phone opens the card as
 * a sheet with Open its regions at its foot, as C's phone does.
 *
 * One level of views (pick A for the rail): the six panels that were inside
 * this tab are its views now. Time-series came here, under the map, with the
 * days as a table and the lifetime counts; Live and Audience went to Map;
 * Engagement went under Screens. Nothing was dropped.
 *
 * Every figure is read from the routes the panel already has, and the map's
 * counts from /api/admin/traffic/map. A number that could not be read says
 * so in words.
 */

import { useEffect, useMemo, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { type Place, tallyCountries, tallyRegions, type Visit } from "@/lib/admin/map/tally";
import {
  appsLine,
  liveFigures,
  mapTitle,
  PERIODS,
  PERIOD_WORD,
  periodSums,
  share,
  topSearch,
  type Period,
  type Tally,
} from "@/lib/admin/trafficFigures";
import { useLiveData } from "@/lib/admin/useLiveData";

import { BarChart, Donut, SERIES_COLORS } from "../charts";
import { Bars, FigureCard, Panel, PanelLink, Quiet, Segmented, TrendLine } from "../daily/parts";
import { HeatMap, opensRegions, type LivePoint } from "../map/HeatMap";
import { DataTable, Disclosure } from "../primitives";
import { EngagementTab } from "./EngagementTab";
import { ScreensTab } from "./ScreensTab";

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
  from?: string;
  fromKind?: string;
  on?: string;
  onKind?: string;
};
type Stats = {
  liveCount: number | null;
  sessions: Session[];
  today: { visitors: number | null; views: number | null; signups: number | null };
};
type Point = { date: string; visitors: number; views: number; signups: number };
type Sources = {
  total: number;
  websiteSources?: Tally[];
  sources: Tally[];
  places: (Tally & { kind: string })[];
  platforms: Tally[];
  appSessions: number;
  websiteSessions: number;
  partial?: { rows: number } | null;
  unavailable?: string;
};
type MapData = {
  total: number;
  countries: Place[];
  unplaced: number;
  in: string | null;
  regions: Place[] | null;
  regionsUnplaced: number | null;
  partial?: { rows: number } | null;
  unavailable?: string;
};

const NOW_POLL = 5_000;

function open(tab: string) {
  window.location.hash = `tab=${tab}`;
}

const n = (v: number) => v.toLocaleString("en-US");

/** The period's sources, read when the period changes. Now has none: it is counted from the live sessions. */
function useSources(period: Period): { data: Sources | null; loading: boolean } {
  const [got, setGot] = useState<{ period: Period; data: Sources | null } | null>(null);
  useEffect(() => {
    if (period === "now") return;
    let alive = true;
    void adminJson<Sources>(`/api/admin/sources?range=${period}`).then((d) => {
      if (alive) setGot({ period, data: d });
    });
    return () => {
      alive = false;
    };
  }, [period]);
  const mine = got?.period === period;
  return { data: mine ? got.data : null, loading: period !== "now" && !mine };
}

/**
 * Visits by country for a window, and one country's regions when it is
 * open. Now is counted from the live sessions in the browser, with the same
 * tally the route uses.
 */
function useMapData(period: Period, zoom: string | null, sessions: Session[] | null) {
  const range = period === "now" ? null : period;
  const [world, setWorld] = useState<{ range: string; data: MapData | null } | null>(null);
  const [inside, setInside] = useState<{ key: string; data: MapData | null } | null>(null);

  useEffect(() => {
    if (!range) return;
    let alive = true;
    void adminJson<MapData>(`/api/admin/traffic/map?range=${range}`).then((d) => {
      if (alive) setWorld({ range, data: d });
    });
    return () => {
      alive = false;
    };
  }, [range]);

  const insideKey = range && zoom ? `${range}:${zoom}` : null;
  useEffect(() => {
    if (!range || !zoom) return;
    let alive = true;
    const key = `${range}:${zoom}`;
    void adminJson<MapData>(`/api/admin/traffic/map?range=${range}&in=${zoom}`).then((d) => {
      if (alive) setInside({ key, data: d });
    });
    return () => {
      alive = false;
    };
  }, [range, zoom]);

  const liveVisits: Visit[] = useMemo(
    () =>
      (sessions ?? []).map((s) => ({
        code: s.countryCode,
        country: s.country,
        region: s.region,
        city: s.city,
        from: s.from ?? "Direct",
        on: s.on ?? "Unknown",
      })),
    [sessions],
  );

  if (!range) {
    if (!sessions) return { countries: null, total: 0, regions: null, zoomTotal: 0, failed: false, partial: null };
    const t = tallyCountries(liveVisits);
    const r = zoom ? tallyRegions(liveVisits, zoom) : null;
    return {
      countries: t.countries,
      total: liveVisits.length,
      regions: r ? r.regions : null,
      zoomTotal: r ? r.total : 0,
      failed: false,
      partial: null,
    };
  }
  const w = world?.range === range ? world.data : null;
  const inn = insideKey && inside?.key === insideKey ? inside.data : null;
  const zoomCountry = zoom ? w?.countries.find((c) => c.key === zoom) : null;
  return {
    countries: w && !w.unavailable ? w.countries : null,
    total: w?.total ?? 0,
    regions: inn && !inn.unavailable ? inn.regions : null,
    zoomTotal: zoomCountry?.visits ?? 0,
    failed: world?.range === range && (!w || Boolean(w.unavailable)),
    partial: w?.partial ?? null,
  };
}

function livePoints(sessions: Session[] | null): LivePoint[] {
  return (sessions ?? []).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, code: s.countryCode, region: s.region }));
}

/** The period switch: on the desktop at the page's right, on a phone the full width. */
function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <>
      <div className="hidden justify-end md:flex">
        <Segmented<Period> label="Period" options={PERIODS} value={value} onChange={onChange} />
      </div>
      <div className="md:hidden">
        <Segmented<Period> label="Period" options={PERIODS} value={value} onChange={onChange} stretch tall />
      </div>
    </>
  );
}

/** The map, and the places beside it: the countries, or the open country's regions. */
function MapCard({
  period,
  stats,
  title,
  listRows = 8,
}: {
  period: Period;
  stats: Stats | null;
  title: string;
  listRows?: number;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const sessions = stats?.sessions ?? null;
  const data = useMapData(period, zoom, sessions);
  const list = zoom ? data.regions : data.countries;
  const word = PERIOD_WORD[period];

  return (
    <Panel title={title} pad="px-4 pt-3.5 pb-3">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          {data.failed ? (
            <Quiet className="py-10">The visits could not be read just now, so the map is not drawn.</Quiet>
          ) : (
            <HeatMap
              countries={data.countries}
              total={data.total}
              live={livePoints(sessions)}
              periodWord={word}
              zoom={zoom}
              onZoom={(z) => {
                setChosen(null);
                setZoom(z);
              }}
              regions={data.regions}
              zoomTotal={data.zoomTotal}
              chosen={chosen}
              onChoose={setChosen}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 mt-0.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {zoom ? `Most visits ${word}, by region` : `Most visits ${word}`}
          </p>
          {!list ? (
            <Quiet>Reading.</Quiet>
          ) : list.length === 0 ? (
            <Quiet>No visits {word}.</Quiet>
          ) : (
            <ul>
              {list.slice(0, listRows).map((p, i) => {
                const top = list[0]?.visits ?? 1;
                return (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!zoom && opensRegions(p.key)) {
                          setChosen(null);
                          setZoom(p.key);
                        } else setChosen(p.key);
                      }}
                      className="flex min-h-[27px] w-full items-center gap-2.5 text-left font-sans text-[12.5px]"
                      style={{ color: "var(--adm-ink-2)" }}
                      aria-label={`${p.name}, ${n(p.visits)} visits`}
                    >
                      <span className="w-[104px] shrink-0 truncate">{p.name}</span>
                      <span className="adm-hbar-track" aria-hidden>
                        <span
                          className="adm-hbar-fill"
                          data-lit={i === 0 ? true : undefined}
                          style={{ width: `${((p.visits / Math.max(1, top)) * 100).toFixed(1)}%` }}
                        />
                      </span>
                      <span className="w-[38px] shrink-0 text-right font-mono text-[12px] font-medium" style={{ color: "var(--adm-ink)" }}>
                        {n(p.visits)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {data.partial ? (
            <Quiet className="mt-2">Counted from the first {n(data.partial.rows)} visits only, so the figures are short.</Quiet>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────

export function TrafficOverviewTab() {
  const [period, setPeriod] = useState<Period>("1d");
  const stats = useLiveData<Stats>("/api/admin/stats", period === "now" ? NOW_POLL : 20_000);
  const traffic = useLiveData<{ points?: Point[] }>("/api/admin/traffic?range=90d", 300_000);
  const totals = useLiveData<{
    lifetimeVisitors: number | null;
    lifetimePageviews: number | null;
    lifetimeSignups: number | null;
    oldestSessionAt: string | null;
  }>("/api/admin/totals", 300_000);
  const sources = useSources(period);
  const points = traffic.data?.points ?? [];

  // ── The four numbers ──────────────────────────────────────────────────
  const live = stats.data?.liveCount;
  const liveSessions = stats.data?.sessions ?? [];
  const lf = liveFigures(liveSessions);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 1;
  const sums = periodSums(points, days);
  const visitorsValue =
    period === "now" || period === "1d"
      ? typeof stats.data?.today?.visitors === "number"
        ? n(stats.data.today.visitors)
        : stats.loading
          ? "…"
          : "Not measured"
      : points.length > 0
        ? n(sums.now)
        : traffic.loading
          ? "…"
          : "Not measured";
  const visitorsSub =
    period === "now" || period === "1d"
      ? points.length >= 2
        ? `${n(points[points.length - 2].visitors)} yesterday`
        : "UTC day"
      : sums.complete
        ? `${n(sums.before)} the ${days} before`
        : `the ${days} days to today`;

  const src = sources.data && !sources.data.unavailable ? sources.data : null;
  const website = period === "now" ? lf.website : (src?.websiteSessions ?? 0);
  const fromSearch = period === "now" ? lf.search : ((src?.websiteSources ?? src?.sources ?? []).find((s) => s.key === "search")?.count ?? 0);
  const searchName = period === "now" ? lf.topSearch : src ? topSearch(src.places) : null;
  const all = period === "now" ? lf.total : (src?.total ?? 0);
  const apps = period === "now" ? lf.total - lf.website : (src?.appSessions ?? 0);
  const platforms = period === "now" ? lf.platforms : (src?.platforms ?? []);
  const known = period === "now" ? Boolean(stats.data) : Boolean(src);
  const unknownWord = period === "now" ? (stats.loading ? "…" : "Not measured") : sources.loading ? "…" : "Not measured";

  // ── The time series: the last 30 days, the 30 before dashed ──────────
  const last30 = points.slice(-30);
  const before30 = points.length >= 60 ? points.slice(-60, -30) : undefined;
  const mid = last30[Math.floor(last30.length / 2)];
  const day = (iso: string | undefined) =>
    iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "";

  return (
    <div className="space-y-3.5">
      <PeriodSwitch value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FigureCard
          label="On the site now"
          value={typeof live === "number" ? n(live) : stats.loading ? "…" : "Not measured"}
          unread={typeof live !== "number"}
          sub="in the last 90 seconds"
          live
          lit
        />
        <FigureCard
          label={period === "7d" ? "Visitors, 7 days" : period === "30d" ? "Visitors, 30 days" : "Visitors today"}
          value={visitorsValue}
          unread={visitorsValue === "…" || visitorsValue === "Not measured"}
          sub={visitorsSub}
        />
        <FigureCard
          label="From search"
          value={known ? share(fromSearch, website) : unknownWord}
          unread={!known}
          sub={known ? `of website visits${searchName ? `, ${searchName} most` : ""}` : "of website visits"}
        />
        <FigureCard
          label="In the apps"
          value={known ? share(apps, all) : unknownWord}
          unread={!known}
          sub={known ? appsLine(platforms, all) : "Android, iPhone and Windows"}
        />
      </div>

      <MapCard period={period} stats={stats.data} title={mapTitle(period)} />

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Panel title="Where website visits came from" action={<PanelLink onClick={() => open("sources")}>Sources</PanelLink>} pad="px-4 pt-3.5 pb-2.5">
          {!known ? (
            <Quiet>{unknownWord === "…" ? "Reading." : "The visits could not be read just now."}</Quiet>
          ) : period === "now" ? (
            <Bars
              labelWidth={104}
              rows={(() => {
                const t = new Map<string, number>();
                for (const s of liveSessions) {
                  if (s.onKind === "android-app" || s.onKind === "ios-app" || s.onKind === "desktop-app") continue;
                  t.set(s.from ?? "Direct", (t.get(s.from ?? "Direct") ?? 0) + 1);
                }
                return [...t.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([k, v]) => ({ key: k, label: k, value: v, shown: share(v, lf.website) }));
              })()}
            />
          ) : (
            <Bars
              labelWidth={104}
              rows={(src?.websiteSources ?? src?.sources ?? [])
                .filter((s) => s.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((s) => ({ key: s.key, label: s.label, value: s.count, shown: share(s.count, src?.websiteSessions ?? 0) }))}
            />
          )}
        </Panel>
        <Panel title="What they read on" pad="px-4 pt-3.5 pb-2.5">
          {!known ? (
            <Quiet>{unknownWord === "…" ? "Reading." : "The visits could not be read just now."}</Quiet>
          ) : (
            <Bars
              labelWidth={130}
              rows={(period === "now"
                ? (() => {
                    const t = new Map<string, number>();
                    for (const s of liveSessions) if (s.on) t.set(s.on, (t.get(s.on) ?? 0) + 1);
                    return [...t.entries()].map(([k, v]) => ({ key: k, label: k, count: v }));
                  })()
                : (src?.platforms ?? []))
                .filter((p) => p.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((p) => ({ key: p.key, label: p.label, value: p.count, shown: share(p.count, all) }))}
            />
          )}
        </Panel>
      </div>

      {/* Time-series, folded in from the panel it was (one level of views). */}
      <Panel title="Visitors, the last 30 days (the 30 before, dashed)" pad="px-4 pt-3.5 pb-3">
        {points.length < 2 ? (
          <Quiet className="py-6">{traffic.loading ? "Reading the days." : "The days could not be read just now."}</Quiet>
        ) : (
          <TrendLine
            label={`Visitors each day for the last 30 days: ${last30.map((p) => `${p.date} ${p.visitors}`).join(", ")}`}
            values={last30.map((p) => p.visitors)}
            before={before30?.map((p) => p.visitors)}
            marks={[day(last30[0]?.date), day(mid?.date), "today"]}
          />
        )}
        <div className="mt-3">
          <Disclosure title="Every day, as a table">
            <DataTable
              rows={points.slice().reverse()}
              rowKey={(r) => r.date}
              csvFilename="traffic-90d.csv"
              columns={[
                { key: "date", label: "Day", render: (r) => r.date, csv: (r) => r.date },
                { key: "visitors", label: "Visitors", align: "right", render: (r) => n(r.visitors), csv: (r) => r.visitors },
                { key: "views", label: "Page views", align: "right", render: (r) => n(r.views), csv: (r) => r.views },
                { key: "signups", label: "Signups", align: "right", render: (r) => n(r.signups), csv: (r) => r.signups },
              ]}
            />
          </Disclosure>
        </div>
      </Panel>

      {/* The lifetime counts from At a glance: they only ever grow. */}
      {totals.data ? (
        <p className="px-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Since {totals.data.oldestSessionAt ? day(totals.data.oldestSessionAt.slice(0, 10)) : "the start"}:{" "}
          {[
            totals.data.lifetimeVisitors !== null ? `${n(totals.data.lifetimeVisitors)} visitors` : null,
            totals.data.lifetimePageviews !== null ? `${n(totals.data.lifetimePageviews)} page views` : null,
            totals.data.lifetimeSignups !== null ? `${n(totals.data.lifetimeSignups)} accounts` : null,
          ]
            .filter(Boolean)
            .join(", ") || "the counts could not be read"}
          .
        </p>
      ) : null}
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────

type Audience = {
  windowDays: number;
  total: number;
  regions: { country: string; region: string; code: string | null; count: number }[];
  languages: { code: string; count: number }[];
  browsers: { name: string; count: number }[];
  devices: { mobile: number; desktop: number };
  partial?: { rows: number; needs: string } | null;
  unavailable?: string;
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ro: "Romanian",
  el: "Greek",
  ru: "Russian",
  fr: "French",
  de: "German",
  sr: "Serbian",
  uk: "Ukrainian",
  it: "Italian",
  pt: "Portuguese",
  bg: "Bulgarian",
  ar: "Arabic",
};

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

/**
 * The Map view: the period, the map with its zoom, every country (or the
 * open country's regions) as a table to export, the readers on the site now
 * when the period is Now, and who the readers are (Audience, folded in).
 */
export function TrafficMapTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const [zoom, setZoom] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const stats = useLiveData<Stats>("/api/admin/stats", period === "now" ? NOW_POLL : 20_000);
  const sessions = stats.data?.sessions ?? null;
  const data = useMapData(period, zoom, sessions);
  const [audience, setAudience] = useState<Audience | null>(null);
  useEffect(() => {
    let alive = true;
    void adminJson<Audience>("/api/admin/audience").then((d) => {
      if (alive) setAudience(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  const word = PERIOD_WORD[period];
  const rows = (zoom ? data.regions : data.countries) ?? [];
  const whole = zoom ? data.zoomTotal : data.total;

  return (
    <div className="space-y-3.5">
      <div
        className="flex flex-wrap items-center gap-2.5 rounded-[10px] border p-2"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
      >
        <div className="w-full md:w-auto">
          <Segmented<Period> label="Period" options={PERIODS} value={period} onChange={setPeriod} stretch tall />
        </div>
        <span className="ml-auto font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Counted from visits, not people
        </span>
      </div>

      <Panel pad="px-4 pt-3 pb-3">
        {data.failed ? (
          <Quiet className="py-10">The visits could not be read just now, so the map is not drawn.</Quiet>
        ) : (
          <HeatMap
            countries={data.countries}
            total={data.total}
            live={livePoints(sessions)}
            periodWord={word}
            zoom={zoom}
            onZoom={(z) => {
              setChosen(null);
              setZoom(z);
            }}
            regions={data.regions}
            zoomTotal={data.zoomTotal}
            chosen={chosen}
            onChoose={setChosen}
          />
        )}
      </Panel>

      <Panel title={zoom ? `Its regions, ${word}` : `Every country, ${word}`} pad="px-4 pt-3.5 pb-3">
        <DataTable<Place>
          rows={rows}
          rowKey={(r) => r.key}
          csvFilename={zoom ? `regions-${zoom}-${period}.csv` : `countries-${period}.csv`}
          empty={!zoom && !data.countries ? "Reading." : zoom && !data.regions ? "Reading the regions." : `No visits ${word}.`}
          columns={[
            {
              key: "name",
              label: zoom ? "Region" : "Country",
              render: (r) => (
                <button
                  type="button"
                  onClick={() => {
                    if (!zoom && opensRegions(r.key)) {
                      setChosen(null);
                      setZoom(r.key);
                    } else setChosen(r.key);
                  }}
                  className="min-h-[28px] text-left underline decoration-[var(--adm-line-strong)] underline-offset-[3px] hover:decoration-[var(--adm-ink-2)]"
                >
                  {r.name}
                </button>
              ),
              csv: (r) => r.name,
            },
            { key: "visits", label: "Visits", align: "right", render: (r) => n(r.visits), csv: (r) => r.visits },
            { key: "share", label: "Share", align: "right", render: (r) => share(r.visits, whole), csv: (r) => share(r.visits, whole) },
            {
              key: "top",
              label: zoom ? "Top city" : "Top region",
              render: (r) => r.places[0]?.name ?? "none named",
              csv: (r) => r.places[0]?.name ?? "",
            },
            { key: "from", label: "Arrived from, most", render: (r) => r.from[0]?.name ?? "", csv: (r) => r.from[0]?.name ?? "" },
            { key: "on", label: "Read on, most", render: (r) => r.on[0]?.name ?? "", csv: (r) => r.on[0]?.name ?? "" },
          ]}
        />
      </Panel>

      {period === "now" ? (
        <Panel title={`On the site now: ${sessions ? n(sessions.length) : "reading"}`} pad="px-4 pt-3.5 pb-2">
          {sessions && sessions.length === 0 ? <Quiet className="pb-2">No one on the site right now.</Quiet> : null}
          <ul className="max-h-[420px] divide-y overflow-y-auto">
            {(sessions ?? []).map((s) => (
              <li key={s.id} className="flex min-h-[48px] items-center gap-3 border-[color:var(--adm-line)] py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[13px]" style={{ color: "var(--adm-ink)" }}>
                    {[s.city, s.region, s.country].filter(Boolean).join(", ") || "Somewhere not named"}
                  </span>
                  <span className="mt-0.5 block truncate font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    {[s.path, s.from && s.on ? `${s.from}, ${s.on}` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                  {ago(s.lastSeen)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Audience, folded in: who the readers are, over 30 days. */}
      {audience?.unavailable ? (
        <Quiet>{audience.unavailable}</Quiet>
      ) : audience ? (
        <>
          <div className="grid gap-3.5 lg:grid-cols-3">
            <Panel title="Languages, 30 days" pad="px-4 pt-3.5 pb-2.5">
              <Bars
                labelWidth={110}
                rows={audience.languages.slice(0, 8).map((l) => ({
                  key: l.code,
                  label: `${LANG_NAMES[l.code] ?? l.code}`,
                  value: l.count,
                  shown: share(l.count, audience.total),
                }))}
              />
            </Panel>
            <Panel title="Devices, 30 days" pad="px-4 pt-3.5 pb-2.5">
              <Donut
                segments={[
                  { name: "Phone or tablet", value: audience.devices.mobile, color: SERIES_COLORS[0] },
                  { name: "Computer", value: audience.devices.desktop, color: SERIES_COLORS[2] },
                ]}
                label="30d"
              />
            </Panel>
            <Panel title="Browsers, 30 days" pad="px-4 pt-3.5 pb-2.5">
              <BarChart rows={audience.browsers.map((b) => ({ label: b.name, value: b.count }))} />
            </Panel>
          </div>
          <Panel title="Top regions anywhere, 30 days" pad="px-4 pt-3.5 pb-3">
            {audience.partial ? (
              <Quiet className="mb-2">
                Counted from {n(audience.partial.rows)} sessions only, so every figure here is short. The whole count needs{" "}
                {audience.partial.needs}.
              </Quiet>
            ) : null}
            <DataTable
              rows={audience.regions}
              rowKey={(r) => `${r.country}-${r.region}`}
              csvFilename="regions-30d.csv"
              columns={[
                { key: "region", label: "Region", render: (r) => r.region, csv: (r) => r.region },
                { key: "country", label: "Country", render: (r) => r.country, csv: (r) => r.country },
                { key: "count", label: "Sessions", align: "right", render: (r) => n(r.count), csv: (r) => r.count },
              ]}
            />
          </Panel>
        </>
      ) : (
        <Quiet>Reading who the readers are.</Quiet>
      )}
    </div>
  );
}

// ── Screens ───────────────────────────────────────────────────────────────

/** Screens, and under it Engagement, folded in: which pages and sections readers come back to. */
export function ScreensView() {
  return (
    <div className="space-y-8">
      <ScreensTab />
      <section aria-labelledby="adm-engagement-head" className="space-y-3">
        <h2 id="adm-engagement-head" className="font-sans text-[17px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          Pages and sections, by who comes back
        </h2>
        <EngagementTab />
      </section>
    </div>
  );
}
