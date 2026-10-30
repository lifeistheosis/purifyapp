"use client";

import { useState, type ReactNode } from "react";

import type { ScreensAdminPayload } from "@/app/api/admin/screens/route";
import {
  RATE_FLOOR,
  SCREEN_NAMES,
  SPAN_WORDS,
  leaveSentence,
  leftMost,
  onwardSentence,
  sayTime,
  usualSpan,
  type ScreenRow,
  type Where,
} from "@/lib/admin/screensSummary";
import { CAME_BACK_DAYS, OPEN_SPANS, type CameBackDay } from "@/lib/analytics/screenCounting";

import { useAdminFetch } from "../adminFetch";
import { BarChart } from "../charts";
import { Card, DataTable, KpiCard, SubTabs } from "../primitives";

/**
 * Traffic > Screens: where readers go, where they leave and whether they come
 * back (1.8). The owner, 2026-10-28: "a system that tracks the user's usage
 * on each screen ... so we know which screens they close the app, leave".
 *
 * In the Onboarding view's style, the owner's pick B of 2026-10-27 ("the
 * simplest and it doesn't pour in too much text"): a period switch, four
 * numbers, three panels, and a sentence only where a number alone would not
 * say it. A second switch picks where it was read: the apps, the website or
 * both. The sums are lib/admin/screensSummary.ts.
 */

type Days = "7" | "30" | "90";

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
] as const;

const PLACES = [
  ["all", "Both"],
  ["apps", "The apps"],
  ["web", "The website"],
] as const;

const DAY_WORDS: Record<CameBackDay, string> = { 1: "After a day", 7: "After a week", 30: "After a month" };

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");
const num = (x: number) => x.toLocaleString();

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

function Said({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
      {children}
    </p>
  );
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

const COLUMNS = [
  {
    key: "screen",
    label: "Screen",
    render: (r: ScreenRow) => SCREEN_NAMES[r.screen],
    csv: (r: ScreenRow) => SCREEN_NAMES[r.screen],
  },
  { key: "views", label: "Opened", align: "right" as const, render: (r: ScreenRow) => num(r.views), csv: (r: ScreenRow) => r.views },
  { key: "exits", label: "Left here", align: "right" as const, render: (r: ScreenRow) => num(r.exits), csv: (r: ScreenRow) => r.exits },
  {
    key: "rate",
    label: "Leave rate",
    align: "right" as const,
    render: (r: ScreenRow) => pct(r.exits, r.views),
    csv: (r: ScreenRow) => (r.views ? Math.round((r.exits / r.views) * 100) : 0),
  },
  {
    key: "time",
    label: "Median time",
    align: "right" as const,
    render: (r: ScreenRow) =>
      r.medianSeconds === null ? <span style={{ color: "var(--adm-ink-3)" }}>Not timed</span> : sayTime(r.medianSeconds),
    csv: (r: ScreenRow) => r.medianSeconds,
  },
  {
    key: "next",
    label: "Next, most often",
    render: (r: ScreenRow) =>
      r.next[0] ? (
        <>
          {SCREEN_NAMES[r.next[0].screen]}{" "}
          <span style={{ color: "var(--adm-ink-3)" }}>{pct(r.next[0].count, r.views)}</span>
        </>
      ) : (
        <span style={{ color: "var(--adm-ink-3)" }}>None</span>
      ),
    csv: (r: ScreenRow) => (r.next[0] ? `${SCREEN_NAMES[r.next[0].screen]} (${r.next[0].count})` : ""),
  },
];

export function ScreensTab() {
  const [days, setDays] = useState<Days>("30");
  const [where, setWhere] = useState<Where>("all");
  const { data, error } = useAdminFetch<ScreensAdminPayload>(`/api/admin/screens?days=${days}`);

  const switches = (
    <div className="flex flex-wrap items-center gap-3">
      <SubTabs tabs={PERIODS} active={days} onChange={setDays} />
      <SubTabs tabs={PLACES} active={where} onChange={setWhere} />
    </div>
  );

  if (error || (data && "unavailable" in data)) {
    return (
      <div className="space-y-6">
        {switches}
        <Card title="Couldn't load">
          <Quiet>{data && "unavailable" in data ? data.unavailable : error}</Quiet>
        </Card>
      </div>
    );
  }
  if (!data) return <Quiet>Counting. A month of page views takes a few seconds to read.</Quiet>;
  if (data.absent) {
    return (
      <Card title="Not counting yet">
        <Quiet>The page view tables are not on the database, so there is nothing to count.</Quiet>
      </Card>
    );
  }

  const stale = String(data.days) !== days;
  const place = data.where[where];
  const v = place.views;
  const e = place.events;
  const left = leftMost(v);
  const closed = e.closedOn[0];
  const week = e.cameBack[7];
  const usual = usualSpan(e);
  const leave = leaveSentence(v);
  const onward = onwardSentence(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {switches}
        <div className="space-y-0.5 text-right">
          {stale ? <Quiet>Counting the last {days} days.</Quiet> : null}
          {data.pageviews.cutAt ? (
            <Quiet>Partial: the newest {num(data.pageviews.rows)} page views, from {dayLabel(data.pageviews.cutAt)} on.</Quiet>
          ) : null}
          {data.events.truncated ? <Quiet>Partial: the first {num(data.events.rows)} counts only.</Quiet> : null}
          <Quiet>
            Counted at {new Date(data.countedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
          </Quiet>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Screens opened" value={v.views} hint={`in ${num(v.visits)} visits`} />
        <KpiCard
          label="Visits end most on"
          value={left ? SCREEN_NAMES[left.screen] : "None yet"}
          hint={left ? `${num(left.exits)} of ${num(v.exits)} visits` : "a visit ends after 30 quiet minutes"}
        />
        <KpiCard
          label="Closed the app most on"
          value={closed ? SCREEN_NAMES[closed.screen] : "Not yet"}
          hint={closed ? `${num(closed.count)} of ${num(e.closes)} times` : "counted from 1.8 on"}
        />
        <KpiCard
          label="Came back after a week"
          value={week.of ? pct(week.count, week.of) : "Not yet"}
          hint={week.of ? `${num(week.count)} of ${num(week.of)} new devices` : "counted a week after a first open"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="Where readers leave"
            subtitle="Every screen, most opened first. Left here: the visits that ended on it."
          >
            <DataTable
              columns={COLUMNS}
              rows={v.screens}
              rowKey={(r) => r.screen}
              empty="No screens opened in this window."
              csvFilename={`screens-${where}-${data.days}d.csv`}
            />
            <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
              {leave ? <Said>{leave}</Said> : null}
              {onward ? <Said>{onward}</Said> : null}
              <p className="font-sans text-[12px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
                A visit ends after 30 minutes with nothing from it, and one still going is not counted as left. The time on a
                screen runs from opening it to opening the next one, capped at 30 minutes, so a screen a reader left from has
                none. The tracker&rsquo;s 20 second pings while a page stays open are not views. A leave rate is named in a
                sentence only for a screen opened {RATE_FLOOR} times or more.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Closed the app here" subtitle="The screen showing when the app was put away or the page closed.">
            {data.events.absent ? (
              <Quiet>The events table is not on the database, so there is nothing to count.</Quiet>
            ) : e.closedOn.length ? (
              <>
                <BarChart rows={e.closedOn.slice(0, 8).map((c) => ({ label: SCREEN_NAMES[c.screen], value: c.count }))} />
                <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--adm-line)" }}>
                  {usual ? <Said>Most often after {SPAN_WORDS[usual]} on the screen.</Said> : null}
                  {OPEN_SPANS.map((s) => (
                    <div key={s} className="flex items-baseline justify-between gap-3 font-sans text-[13px]">
                      <span style={{ color: "var(--adm-ink-2)" }}>{SPAN_WORDS[s][0].toUpperCase() + SPAN_WORDS[s].slice(1)}</span>
                      <span style={{ color: "var(--adm-ink)" }}>{pct(e.spans[s], e.closes)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Quiet>Counted from 1.8 on: each time the app is put away, the screen that was showing and for how long.</Quiet>
            )}
          </Card>

          <Card title="Came back after 1, 7 and 30 days" subtitle="New devices, from the day they first opened Purify.">
            {data.events.absent ? (
              <Quiet>The events table is not on the database, so there is nothing to count.</Quiet>
            ) : (
              <div className="space-y-2">
                {CAME_BACK_DAYS.map((d) => {
                  const r = e.cameBack[d];
                  return (
                    <div key={d} className="flex items-baseline justify-between gap-3 font-sans text-[13px]">
                      <span style={{ color: "var(--adm-ink-2)" }}>{DAY_WORDS[d]}</span>
                      <span style={{ color: "var(--adm-ink)" }}>
                        {r.of ? (
                          <>
                            {pct(r.count, r.of)}{" "}
                            <span style={{ color: "var(--adm-ink-3)" }}>
                              {num(r.count)} of {num(r.of)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "var(--adm-ink-3)" }}>Not yet</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-2" style={{ borderColor: "var(--adm-line)" }}>
                  <Quiet>
                    {num(e.firstOpens)} new {e.firstOpens === 1 ? "device" : "devices"} opened Purify in this window. A return
                    counts once it is that many days or more after the first open.
                  </Quiet>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
