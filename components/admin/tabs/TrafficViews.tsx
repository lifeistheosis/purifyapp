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

import {
  parseChartRange,
  parseChartSeries,
  SERIES_ORDER,
  setChartRange,
  setChartSeries,
  useChartRange,
  useChartSeriesKey,
  type ChartSeries,
} from "@/lib/admin/chartRangePreference";
import { adminJson } from "@/lib/admin/fetchJson";
import { useLayout } from "@/lib/admin/layoutPreference";
import { type Place, tallyCountries, tallyRegions, type Visit } from "@/lib/admin/map/tally";
import { CHART_RANGES, DAILY_UP_TO, byWeek, median, trafficAllUrl, trafficUrl, windowOf } from "@/lib/admin/trafficChart";
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
import { Bars, FigureCard, LiveDot, Panel, PanelLink, Quiet, Segmented, TrendLine } from "../daily/parts";
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
  firstSeen?: string;
  /** The pages opened in the last hours, oldest first (lib/admin/liveTrail.ts). */
  trail?: { path: string; at: string }[];
  from?: string;
  fromKind?: string;
  on?: string;
  onKind?: string;
};
type Stats = {
  liveCount: number | null;
  sessions: Session[];
  today: { visitors: number | null; views: number | null; signups: number | null; visitorsYesterdayByNow?: number | null };
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
const day = (iso: string | undefined) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "";

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
                      className="flex min-h-11 w-full items-center gap-2.5 text-left font-sans text-[12.5px] pointer-fine:min-h-0 pointer-fine:py-1"
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

// ── Visitors by day ───────────────────────────────────────────────────────

// All time last, its own read (the owner, 2026-11-11: "set up a all time option for the charts").
const RANGE_OPTIONS = [...CHART_RANGES.map((d) => [String(d), `${d}d`] as const), ["all", "All"] as const];
/** The three lines, as the old Traffic tab named them (his pick A on sheet r3-35). */
const SERIES: Record<ChartSeries, { label: string; one: string; many: string; dash: string }> = {
  visitors: { label: "Visitors", one: "visitor", many: "visitors", dash: "" },
  views: { label: "Page views", one: "page view", many: "page views", dash: "5 4" },
  signups: { label: "Signups", one: "signup", many: "signups", dash: "1.5 3.5" },
};
const said = (k: ChartSeries) => (v: number) => `${n(v)} ${v === 1 ? SERIES[k].one : SERIES[k].many}`;

/** A switch for one line: a box that ticks, and the line's own stroke beside its name. */
function SeriesSwitch({ k, on, onToggle }: { k: ChartSeries; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className="hit-44 inline-flex min-h-9 items-center gap-2 font-sans text-[12.5px]"
      style={{ color: on ? "var(--adm-ink)" : "var(--adm-ink-3)" }}
    >
      <span
        aria-hidden
        className="grid h-[15px] w-[15px] place-items-center rounded-[4px] border"
        style={{ borderColor: on ? "var(--adm-ink)" : "var(--adm-line-strong)", background: on ? "var(--adm-ink)" : "transparent" }}
      >
        {on ? (
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="var(--adm-panel)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.4 8.2 14l7.3-8" />
          </svg>
        ) : null}
      </span>
      <svg aria-hidden width="18" height="4" viewBox="0 0 18 4">
        <path d="M0 2H18" stroke={k === "visitors" ? "var(--adm-ink)" : "var(--adm-ink-2)"} strokeWidth="2" strokeDasharray={SERIES[k].dash || undefined} />
      </svg>
      {SERIES[k].label}
    </button>
  );
}

/**
 * Today beside the finished days, his picks A and B on sheet r3-36, chosen in
 * Settings: B shows the chart to last night and today here, apart, as one bar
 * against the same scale, with yesterday at this time as a tick.
 */
function TodayApart({ value, byNow, max, height, text }: { value: number | null; byNow: number | null; max: number; height: number; text: string }) {
  const top = Math.max(1, max) * 1.12;
  const h = (v: number) => Math.max(2, Math.round((v / top) * height));
  return (
    <div className="flex w-[62px] shrink-0 flex-col border-l border-dashed pl-2.5" style={{ borderColor: "var(--adm-line-strong)" }}>
      <span className="font-sans text-[10.5px]" style={{ color: "var(--adm-ink-3)" }}>
        Today
      </span>
      <div className="relative mt-auto" style={{ height }}>
        {value !== null ? (
          <span className="absolute bottom-0 left-1 w-[24px] rounded-[4px]" style={{ height: h(value), background: "var(--adm-ink)", boxShadow: "var(--adm-lit-soft)" }} />
        ) : null}
        {byNow !== null ? (
          <span className="absolute left-0 w-[34px]" style={{ bottom: h(byNow), borderTop: "1.5px solid var(--adm-ink-3)" }} title="Yesterday by now" />
        ) : null}
      </div>
      <span className="mt-1.5 font-mono text-[12px]" style={{ color: "var(--adm-ink)" }}>
        {text}
      </span>
    </div>
  );
}

/**
 * Each day over 7 to 120 days, with the median day as a dotted line
 * (lib/admin/trafficChart.ts). One read of 120 days serves every range.
 *
 * His picks of 2026-11-04: the range is remembered (he picked it again on most
 * visits while it reset); Visitors, Page views and Signups are switches on one
 * chart, each line to its own height (r3-35 A); and the day still running is
 * shown beside the finished ones the way he picks in Settings (r3-36): A runs
 * the line to today with its last stretch dashed, B ends it last night and
 * stands today apart. Both say yesterday at this time, so the Now and Last
 * night switch he flipped twenty times in one visit is gone.
 */
function VisitorsChart() {
  const choice = useChartRange();
  const range = String(choice);
  const all = choice === "all";
  const setRange = (v: string) => setChartRange(parseChartRange(v));
  const seriesKey = useChartSeriesKey();
  const on = parseChartSeries(seriesKey);
  const toggle = (k: ChartSeries) => setChartSeries(on.includes(k) ? (on.length > 1 ? on.filter((x) => x !== k) : on) : [...on, k]);
  const today = useLayout("today");
  const latest = today === "a" ? "now" : "complete";
  const read = useLiveData<{ points?: Point[] }>(all ? trafficAllUrl(latest) : trafficUrl(latest), 300_000);
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  // Every day of the window; past DAILY_UP_TO days the line is drawn by week, each a day's mean.
  const daily = all ? (read.data?.points ?? []) : windowOf(read.data?.points ?? [], Number(range));
  const weekly = daily.length > DAILY_UP_TO;
  const shown: Point[] = weekly ? byWeek(daily) : daily;
  const [lead, ...rest] = on;
  const values = shown.map((p) => p[lead]);
  const mid = median(values);
  const midText = mid === null ? "" : Number.isInteger(mid) ? n(mid) : mid.toFixed(1);
  const total = daily.reduce((s, p) => s + p[lead], 0);
  const span = all ? `all time, since ${day(daily[0]?.date)}` : `the last ${range} days`;
  const each = weekly ? "a day, week by week" : "each day";
  const to = latest === "now" ? "today" : "last night";
  const t = stats.data?.today;
  const todayValue = (lead === "visitors" ? t?.visitors : lead === "views" ? t?.views : t?.signups) ?? null;
  const byNow = lead === "visitors" ? (t?.visitorsYesterdayByNow ?? null) : null;
  const height = 150;
  const title = on.length === 1 ? `${SERIES[lead].label} ${each}, ${all ? "all time" : span}` : `${weekly ? "A day, week by week" : "Each day"}, ${all ? "all time" : span}`;

  const chart = (
    <TrendLine
      drawKey={`${range}:${latest}:${seriesKey}`}
      label={`${SERIES[lead].label} ${each}, ${span}, to ${to}, median ${midText} a day: ${shown.map((p) => `${weekly ? "week of " : ""}${p.date} ${p[lead]}`).join(", ")}`}
      values={values}
      height={height}
      soFar={latest === "now"}
      overlays={rest.map((k) => ({ values: shown.map((p) => p[k]), valueText: said(k), dash: SERIES[k].dash }))}
      median={mid === null ? null : { value: mid, text: `median ${midText}` }}
      days={shown.map((p, i) => `${weekly ? "week of " : ""}${day(p.date)}${latest === "now" && i === shown.length - 1 ? ", so far" : ""}`)}
      valueText={said(lead)}
      marks={[day(shown[0]?.date), day(shown[Math.floor(shown.length / 2)]?.date), latest === "now" ? "today" : day(shown[shown.length - 1]?.date)]}
    />
  );

  return (
    <Panel title={title} pad="px-4 pt-3.5 pb-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="adm-seg-scroll adm-seg-fits -mx-1 px-1">
          <Segmented label="Days" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
      </div>
      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Lines on the chart">
        {SERIES_ORDER.map((k) => (
          <SeriesSwitch key={k} k={k} on={on.includes(k)} onToggle={() => toggle(k)} />
        ))}
      </div>
      {shown.length < 2 ? (
        <Quiet className="py-6">{read.loading ? "Reading the days." : "The days could not be read just now."}</Quiet>
      ) : (
        <>
          {latest === "complete" ? (
            <div className="flex items-end gap-2.5">
              <div className="min-w-0 flex-1">{chart}</div>
              <TodayApart value={todayValue} byNow={byNow} max={Math.max(...values)} height={height} text={todayValue === null ? "?" : n(todayValue)} />
            </div>
          ) : (
            chart
          )}
          {todayValue !== null ? (
            <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              <span className="font-mono text-[15px] font-medium" style={{ color: "var(--adm-ink)" }}>
                {n(todayValue)}
              </span>
              <span>{SERIES[lead].many} today so far</span>
              {byNow !== null ? (
                <span className="ml-auto">
                  yesterday by now{" "}
                  <b className="font-mono font-medium" style={{ color: "var(--adm-ink)" }}>
                    {n(byNow)}
                  </b>
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1.5 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
            {n(total)} {SERIES[lead].many} in {daily.length} days to {to}, {weekly ? `a median week of ${midText} a day` : `a median day of ${midText}`}.
            {rest.length > 0 ? " Each line is drawn to its own height; the day you pick says the figures." : ""}
          </p>
        </>
      )}
      <div className="mt-3">
        <Disclosure title="Every day, as a table">
          <DataTable
            rows={daily.slice().reverse()}
            rowKey={(r) => r.date}
            csvFilename={`traffic-${all ? "all" : `${range}d`}.csv`}
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
  );
}

// ── Overview ──────────────────────────────────────────────────────────────

export function TrafficOverviewTab() {
  const [period, setPeriod] = useState<Period>("1d");
  const stats = useLiveData<Stats>("/api/admin/stats", period === "now" ? NOW_POLL : 20_000);
  const traffic = useLiveData<{ points?: Point[] }>(trafficUrl(), 300_000);
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
      <VisitorsChart />

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
                  className="hit-44 min-h-[28px] text-left underline decoration-[var(--adm-line-strong)] underline-offset-[3px] hover:decoration-[var(--adm-ink-2)]"
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

// ── Live: who is on the site now ──────────────────────────────────────────

/** A page's address in words: "/saints/nicholas" reads "Saints / nicholas". */
function pageWords(path: string | null | undefined): string {
  if (!path || path === "/") return "The front page";
  const parts = path
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p).replace(/-/g, " ");
      } catch {
        return p;
      }
    });
  if (!parts.length) return "The front page";
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.join(" / ");
}

/** How long a reader has been here: "just now", "6 min", "1 h 12 min". */
function stayWords(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (!Number.isFinite(m)) return "";
  if (m < 1) return "just now";
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** "from Instagram", or "opened the app" when the app was simply opened. */
const fromWords = (from?: string) => (!from ? "" : from === "Opened the app" ? "opened the app" : `from ${from}`);

const placeOf = (s: Session) =>
  [s.city, s.region && s.region !== s.city ? s.region : null, s.country].filter(Boolean).join(", ") || "Somewhere not told";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** The reader's card: a sheet over a phone's bar, a card in the middle of a desktop (his pick A on sheet r3-38). */
function ReaderCard({ s, now, onClose }: { s: Session; now: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const trail = s.trail ?? [];
  const facts: [string, string][] = [
    ["Reading on", s.on ?? "Not told"],
    ["Came from", s.from ?? "Not told"],
    ["On Purify for", stayWords(s.firstSeen, now) || "Not told"],
    ["Pages this visit", trail.length ? String(trail.length) : "1"],
  ];
  return (
    <>
      <button type="button" aria-label="Close the reader" onClick={onClose} className="fixed inset-0 z-[69] h-full w-full cursor-default" style={{ background: "var(--adm-scrim)" }} />
      <div
        role="dialog"
        aria-label={`A reader in ${placeOf(s)}`}
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-[18px] border px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2.5 lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[14px] lg:pb-4"
        style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line-strong)", boxShadow: "var(--adm-shadow-pop)" }}
      >
        <div aria-hidden className="mx-auto mb-2.5 h-1 w-10 rounded-full lg:hidden" style={{ background: "var(--adm-line-strong)" }} />
        <div className="flex items-center gap-2.5">
          <span className="grid h-[22px] min-w-[30px] place-items-center rounded-[5px] border px-1 font-mono text-[10.5px] font-semibold" style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}>
            {s.countryCode ?? "?"}
          </span>
          <p className="min-w-0 flex-1 font-sans text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            A reader in {placeOf(s)}
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid min-h-11 min-w-11 place-items-center rounded-full" style={{ color: "var(--adm-ink-2)" }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
            </svg>
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                {k}
              </dt>
              <dd className="mt-0.5 font-sans text-[13.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mb-1.5 mt-4 font-sans text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--adm-ink-3)" }}>
          The pages, in order
        </p>
        {trail.length === 0 ? (
          <Quiet>On {pageWords(s.path)}. The pages before it were not read.</Quiet>
        ) : (
          <ol className="relative pl-5">
            <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px" style={{ background: "var(--adm-line-strong)" }} />
            {trail.map((t, i) => {
              const current = i === trail.length - 1;
              return (
                <li key={`${t.at}-${i}`} className="relative flex gap-2.5 py-1.5 font-sans text-[13px]" style={{ color: current ? "var(--adm-ink)" : "var(--adm-ink-2)" }}>
                  <span
                    aria-hidden
                    className="absolute -left-[18px] top-[11px] h-[7px] w-[7px] rounded-full"
                    style={current ? { background: "var(--adm-live)", boxShadow: "var(--adm-live-glow)" } : { background: "var(--adm-panel)", border: "1.5px solid var(--adm-ink-3)" }}
                  />
                  <span className="w-[62px] shrink-0 font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                    {clock(t.at)}
                  </span>
                  <span className={current ? "font-medium" : ""}>
                    {pageWords(t.path)}
                    {current ? ", now" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-3 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
          Pages opened are recorded; button presses are not. A visit here is a browser tab or the app, never a name.
        </p>
      </div>
    </>
  );
}

/**
 * Live, who is on the site now (his pick A on sheet r3-38, with the map shown
 * above the list, 2026-11-04). The old Traffic hub had this list; the revamp
 * dropped it. The map is the zoomable heat map with the readers as green
 * points (r3-37), and a tap on a point opens the same card as a row: where
 * they are, what they read on, how they found Purify, how long they have
 * been here, and the pages they opened this visit, in order.
 */
export function TrafficLiveTab() {
  const stats = useLiveData<Stats>("/api/admin/stats", NOW_POLL);
  const sessions = stats.data?.sessions ?? null;
  const [zoom, setZoom] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [reader, setReader] = useState<string | null>(null);
  const data = useMapData("now", zoom, sessions);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const list = (sessions ?? []).slice().sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));
  const open = list.find((s) => s.id === reader) ?? null;
  const count = stats.data?.liveCount;

  return (
    <div className="space-y-3.5">
      <Panel pad="px-3 pt-3 pb-3 md:px-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <LiveDot />
          <span className="font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
            <b className="font-mono font-medium">{typeof count === "number" ? n(count) : stats.loading ? "…" : "?"}</b> on the site now
          </span>
          <span className="ml-auto font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Zoom with + or two fingers
          </span>
        </div>
        <HeatMap
          countries={data.countries}
          total={data.total}
          live={livePoints(sessions)}
          periodWord="now"
          zoom={zoom}
          onZoom={(z) => {
            setChosen(null);
            setZoom(z);
          }}
          regions={data.regions}
          zoomTotal={data.zoomTotal}
          chosen={chosen}
          onChoose={setChosen}
          onLive={setReader}
        />
      </Panel>

      <Panel title="Who is on the site now" pad="px-3 pt-3.5 pb-1.5 md:px-4">
        {!sessions ? (
          <Quiet className="pb-2.5">{stats.loading ? "Reading who is here." : "Who is here could not be read just now."}</Quiet>
        ) : list.length === 0 ? (
          <Quiet className="pb-2.5">No one is on the site right now.</Quiet>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
            {list.map((s) => (
              <li key={s.id} className="border-[color:var(--adm-line)]">
                <button
                  type="button"
                  onClick={() => setReader(s.id)}
                  className="adm-control -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-start gap-3 rounded-[6px] px-2 py-2.5 text-left"
                  style={{ "--_bg": "transparent", "--_bg-hover": "var(--adm-hover)" } as React.CSSProperties}
                >
                  <span
                    className="mt-0.5 grid min-w-[28px] place-items-center rounded-[5px] border px-1 font-mono text-[10px] font-semibold leading-[18px]"
                    style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
                  >
                    {s.countryCode ?? "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-[13.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                      {placeOf(s)}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                      {[s.on, fromWords(s.from)].filter(Boolean).join(" · ")}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
                      On: {pageWords(s.path)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                    {stayWords(s.firstSeen, now)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {open ? <ReaderCard s={open} now={now} onClose={() => setReader(null)} /> : null}
    </div>
  );
}
