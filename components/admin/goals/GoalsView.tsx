"use client";

import { useState, type ReactNode } from "react";

import { StatusDot, ToolbarButton, type StatusTone } from "../primitives";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { useReducedMotion } from "@/lib/ui/motion";

/**
 * The Goals page, the calm way (his word of 2026-11-23: the panel "feels like
 * a terminal ... very codey"; the plan is docs/plans/goals-milestones.md).
 *
 * What it shows, in order, each thing once, made minimal at his word of
 * 2026-11-24 ("make the design more simplified and minimalist"):
 *
 *   the number      what members bring in a week, its growth on last week
 *                   against the 5% aim, and one line to the next step
 *   three facts     paying now, this week, the next step's day
 *   what moves it   the four weekly goals against his own last four weeks
 *                   bettered by 5%, and the one lever
 *   the road        the six steps, one line each
 *   more            quiet rows that open in place: by update, monthly and
 *                   yearly (with what standing still costs), the guardrails,
 *                   Extra (the shop), this hour, the Bible licence, his marks
 *
 * Presentational: everything it says comes in `data`, worked out elsewhere
 * from the kept events. It writes the words and formats the figures, and it
 * guesses nothing. Before four full weeks are kept it shows no rate and no
 * day, and says so.
 */

export type GoalStepId = "bills" | "tenth" | "quarter" | "half" | "first" | "second";

export type GoalStep = {
  id: GoalStepId;
  /** Its plain name: "Halfway", or the name he gave a mark. */
  name: string;
  /** What the number must reach, in cents a week. */
  weeklyCents: number;
  /** The day it was reached (held four weeks running), or null. */
  reachedOn: string | null;
  /** Weeks running the number has stood at or over it, before it is reached (0 to 3). */
  heldWeeks: number;
  /** More paying members it needs at today's mix; null once reached. */
  moreMembers: number | null;
  /** The day it is reached at the last four weeks' pace; null without one. */
  byPace: string | null;
  /** The day it is reached at 5% a week; null without four weeks. */
  byFive: string | null;
};

export type Mover = {
  id: "readers" | "begin" | "pay" | "leave";
  /** This week: a count for readers, a share (0 to 1) for the rest. */
  value: number;
  /** His own last four weeks, bettered by 5%. */
  aim: number;
};

export type ReleaseLine = {
  version: string;
  from: string;
  /** The next release's day, or null for the newest. */
  to: string | null;
  joined: number;
  left: number;
  /** The share of paying members who left a month, over its days. */
  leftAMonth: number | null;
  /** The share of trials that paid. */
  trialsPaid: number | null;
};

export type GoalMark = { name: string; weeklyCents: number };

export type GoalsData = {
  /** Today, YYYY-MM-DD, UTC. */
  today: string;
  /** The Monday this week began. */
  week: string;
  /** Null once four full weeks are kept; until then, the Monday they will be. */
  enoughOn: string | null;
  weeklyCents: number;
  /** On last week, as a share; null before two weeks. */
  growth: number | null;
  /** The number's average gain a week over the last four, in cents. */
  paceCents: number | null;
  paying: { monthly: number; yearly: number };
  thisWeek: { joined: number; left: number };
  steps: GoalStep[];
  /** The step reached this week, for its moment at the head. */
  justReached: GoalStepId | null;
  movers: Mover[] | null;
  lever: "joining" | "leaving" | "monthly" | null;
  /** New members a month that only replace the ones who leave. */
  standStill: number | null;
  releases: ReleaseLine[];
  rating: { stars: number | null; store: string; held: boolean | null };
  refunds: { count: number; payments: number; low: boolean };
  mix: {
    monthlyCents: number;
    yearlyCents: number;
    /** The monthly share of the number a month ago. */
    monthlyShareBefore: number | null;
    leftMonthly: { left: number; of: number } | null;
    leftYearly: { left: number; of: number } | null;
    renewalOff: number;
    cardFailed: number;
    /** The next step's members, if every new one were monthly, or yearly. */
    allMonthly: number | null;
    allYearly: number | null;
  };
  extra: { monthCents: number; orders: number } | null;
  marks: GoalMark[];
};

// ── Words for the figures ────────────────────────────────────────────────

const count = new Intl.NumberFormat("en-US");

/** "$465", "$1,500"; with cents under ten dollars ("$1.96"). */
export function money(cents: number): string {
  const dollars = cents / 100;
  const whole = Math.abs(dollars) >= 10;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(dollars) : dollars);
}

/** "3.4%" under ten, "42%" from ten. */
export function share(s: number): string {
  const p = s * 100;
  return p < 10 ? `${(Math.round(p * 10) / 10).toFixed(1)}%` : `${Math.round(p)}%`;
}

const DAY_MS = 86_400_000;
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * A day as a person says it: "14 June"; "14 June 2028" in another year; and
 * past half a year away only its month, "March 2028", because a day that far
 * off is a guess and should not read as a promise.
 */
export function dayWords(iso: string, today: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const t = new Date(`${today}T00:00:00Z`);
  if (d.getTime() - t.getTime() > 182 * DAY_MS) return monthYear.format(d);
  return d.getUTCFullYear() === t.getUTCFullYear() ? dayMonth.format(d) : dayMonthYear.format(d);
}

// ── The page ─────────────────────────────────────────────────────────────
//
// Minimal, at his word of 2026-11-24 ("make the design more simplified and
// minimalist"): the number leads, the rest whispers. Labels are small and
// grey, rows carry one line where one will do, and everything that is not
// read every day is a quiet row that opens in place.

export function GoalsView({
  data,
  banner,
  hourly,
  licence,
  onSaveMarks,
}: {
  data: GoalsData;
  /** Above everything when it has something to say (the Bible licence's breach). */
  banner?: ReactNode;
  hourly?: ReactNode;
  licence?: ReactNode;
  onSaveMarks?: (marks: GoalMark[]) => void | Promise<void>;
}) {
  const next = data.steps.find((s) => s.reachedOn === null) ?? null;
  const reached = data.justReached ? data.steps.find((s) => s.id === data.justReached) ?? null : null;
  const early = data.enoughOn !== null;
  const total = data.mix.monthlyCents + data.mix.yearlyCents;
  const broke = [
    data.rating.held === false ? "Rating fell" : null,
    data.refunds.low ? null : "Refunds high",
  ].filter(Boolean);

  return (
    <div className="font-sans">
      {banner}

      <TheNumber data={data} next={next} reached={reached} />

      <ul className="mt-10" aria-label="Three facts">
        <Facts data={data} next={next} />
      </ul>

      <Block label="What moves it">
        <TheFour data={data} />
      </Block>

      <Block label="The road">
        <TheRoad data={data} />
      </Block>

      <Block label="More">
        <div>
          <Fold title="By update">
            <ByUpdate data={data} />
          </Fold>
          <Fold title="Monthly and yearly" value={total > 0 ? `${share(data.mix.monthlyCents / total)} monthly` : undefined}>
            <MonthlyAndYearly data={data} next={next} early={early} />
          </Fold>
          <Fold title="Guardrails" value={broke.length ? broke.join(", ") : "All hold"}>
            <Guardrails data={data} />
          </Fold>
          <Fold title="Extra" value={data.extra ? `${money(data.extra.monthCents)} this month` : "None this month"}>
            <p className="text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
              {data.extra
                ? `Shop sales, from ${count.format(data.extra.orders)} ${data.extra.orders === 1 ? "order" : "orders"}, after fees. Never counted in the number.`
                : "Shop sales are kept apart from the number."}
            </p>
          </Fold>
          {hourly ? <Fold title="This hour">{hourly}</Fold> : null}
          {licence ? <Fold title="Bible licence">{licence}</Fold> : null}
          <Fold title="Your marks">
            <Marks marks={data.marks} onSave={onSaveMarks} />
          </Fold>
        </div>
      </Block>
    </div>
  );
}

// ── The number ───────────────────────────────────────────────────────────

function TheNumber({ data, next, reached }: { data: GoalsData; next: GoalStep | null; reached: GoalStep | null }) {
  const reduced = useReducedMotion();
  const toGo = next ? Math.max(0, next.weeklyCents - data.weeklyCents) : 0;
  const pct = next && next.weeklyCents > 0 ? Math.min(100, Math.round((data.weeklyCents / next.weeklyCents) * 100)) : 100;

  let growth: string | null = null;
  if (data.enoughOn) growth = `Growth shows from ${dayWords(data.enoughOn, data.today)}.`;
  else if (data.growth !== null) {
    const g = Math.round(Math.abs(data.growth) * 100);
    growth = `${data.growth >= 0 ? "Up" : "Down"} ${g}% on last week. Aim 5% a week.`;
  }

  return (
    <section aria-label="What members bring in">
      {reached ? (
        // A step reached is a moment of its own: it rises in once, on the
        // house's curve, and simply stands there with Motion off.
        <div
          className="mb-8 flex items-start gap-3"
          style={{ animation: reduced ? undefined : "adm-rise 700ms var(--adm-ease) backwards" }}
        >
          <StatusDot tone="good" className="mt-[8px]" />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-snug" style={{ color: "var(--adm-ink)" }}>
              {reached.id === "bills" ? "The app pays its own bills now" : `You reached ${lowerFirst(reached.name)}`}
            </p>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
              Held four weeks running.
            </p>
          </div>
        </div>
      ) : null}

      <h2 className="text-[13px]" style={{ color: "var(--adm-ink-3)", fontWeight: 500 }}>
        Members bring in
      </h2>
      <p className="mt-1 flex items-baseline gap-2" style={{ color: "var(--adm-ink)" }}>
        <span className="text-[60px] leading-none tracking-[-0.04em] tabular-nums" style={{ fontWeight: 500 }}>
          {money(data.weeklyCents)}
        </span>
        <span className="text-[17px]" style={{ color: "var(--adm-ink-2)" }}>
          a week
        </span>
      </p>
      {growth ? (
        <p className="mt-2.5 text-[14px]" style={{ color: "var(--adm-ink-2)" }}>
          {growth}
        </p>
      ) : null}

      {next ? (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              Next: {next.name}
            </p>
            <p className="shrink-0 text-[14px] tabular-nums" style={{ color: "var(--adm-ink-2)" }}>
              {toGo > 0 ? `${money(toGo)} to go` : `held ${next.heldWeeks} of 4 weeks`}
            </p>
          </div>
          <div
            className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--adm-panel-2)" }}
            role="img"
            aria-label={`${pct}% of the way to ${next.name}`}
          >
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--adm-accent)" }} />
          </div>
        </div>
      ) : (
        <p className="mt-8 text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          Every step is reached.
        </p>
      )}
    </section>
  );
}

// ── Three facts ──────────────────────────────────────────────────────────

function Facts({ data, next }: { data: GoalsData; next: GoalStep | null }) {
  const paying = data.paying.monthly + data.paying.yearly;
  let when: { value: string; note?: string };
  if (!next) when = { value: "reached" };
  else if (data.enoughOn || next.byFive === null) when = { value: "not enough weeks yet" };
  else
    when = {
      value: next.byPace ? dayWords(next.byPace, data.today) : "not at this pace",
      note: `${dayWords(next.byFive, data.today)} at 5% a week`,
    };
  return (
    <>
      <Row
        name="Paying now"
        nameNote={`${count.format(data.paying.monthly)} monthly, ${count.format(data.paying.yearly)} yearly`}
        value={count.format(paying)}
      />
      <Row name="This week" value={`${count.format(data.thisWeek.joined)} joined, ${count.format(data.thisWeek.left)} left`} />
      <Row name={next ? "Next step by" : "The road"} value={when.value} valueNote={when.note} />
    </>
  );
}

// ── What moves it: the four ──────────────────────────────────────────────

const MOVER_WORDS: Record<Mover["id"], { name: string; of: string; less: boolean }> = {
  readers: { name: "New readers", of: "", less: false },
  begin: { name: "Start a trial or plan", of: " of new readers", less: false },
  pay: { name: "Trials that pay", of: " of trials", less: false },
  leave: { name: "Members who leave", of: " of members", less: true },
};

const LEVER_WORDS: Record<NonNullable<GoalsData["lever"]>, string> = {
  joining: "More joining would help most now.",
  leaving: "Fewer leaving would help most now.",
  monthly: "More choosing monthly would help most now.",
};

function TheFour({ data }: { data: GoalsData }) {
  if (data.movers === null)
    return (
      <p className="text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
        Not enough weeks yet. Aims begin {data.enoughOn ? dayWords(data.enoughOn, data.today) : "after four full weeks"}.
      </p>
    );
  return (
    <>
      {data.lever ? (
        <p className="mb-1.5 text-[14px]" style={{ color: "var(--adm-ink)" }}>
          {LEVER_WORDS[data.lever]}
        </p>
      ) : null}
      <ul>
        {data.movers.map((m) => {
          const w = MOVER_WORDS[m.id];
          const fmt = (v: number) => (m.id === "readers" ? count.format(Math.round(v)) : share(v));
          const met = w.less ? m.value <= m.aim : m.value >= m.aim;
          return (
            <Row
              key={m.id}
              name={w.name}
              nameNote={`aim ${w.less ? "under " : ""}${fmt(m.aim)}${w.of}`}
              value={fmt(m.value)}
              state={{ tone: met ? "good" : "wait", word: met ? "Met" : "Not yet" }}
            />
          );
        })}
      </ul>
    </>
  );
}

// ── The road ─────────────────────────────────────────────────────────────

function TheRoad({ data }: { data: GoalsData }) {
  const next = data.steps.find((s) => s.reachedOn === null);
  return (
    <ol>
      {data.steps.map((s) => {
        const isNext = s === next;
        const done = s.reachedOn !== null;
        let note: string | null = null;
        if (done) note = s.id === data.justReached ? "reached this week" : `reached ${dayWords(s.reachedOn as string, data.today)}`;
        else {
          if (s.weeklyCents <= data.weeklyCents) note = `held ${s.heldWeeks} of 4 weeks`;
          else if (isNext) note = `${count.format(s.moreMembers ?? 0)} more members`;
          else
            note = `${count.format(s.moreMembers ?? 0)} more members${s.byPace ? `, by ${dayWords(s.byPace, data.today)}` : ""}`;
        }
        return (
          <li
            key={s.id}
            className="flex min-h-11 items-start gap-3 border-t py-3 first:border-t-0"
            style={{ borderColor: "var(--adm-line)" }}
            aria-current={isNext ? "step" : undefined}
          >
            <StatusDot tone={done ? "good" : isNext ? "wait" : "idle"} className="mt-[7px]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={"text-[15px] leading-snug" + (isNext ? " font-semibold" : "")}
                  style={{ color: done ? "var(--adm-ink-3)" : isNext ? "var(--adm-ink)" : "var(--adm-ink-2)" }}
                >
                  {s.name}
                </p>
                <p className="shrink-0 text-[14px] tabular-nums" style={{ color: done ? "var(--adm-ink-3)" : "var(--adm-ink-2)" }}>
                  {money(s.weeklyCents)} a week
                </p>
              </div>
              {note ? (
                <p className="mt-0.5 text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
                  {note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Folded: by update ────────────────────────────────────────────────────

function ByUpdate({ data }: { data: GoalsData }) {
  return (
    <ul>
      {data.releases.map((r) => {
        const days = Math.round((Date.parse(`${data.today}T00:00:00Z`) - Date.parse(`${r.from}T00:00:00Z`)) / DAY_MS);
        const when = r.to
          ? `${dayWords(r.from, data.today)} to ${dayWords(r.to, data.today)}`
          : `since ${dayWords(r.from, data.today)}, ${days} ${days === 1 ? "day" : "days"}`;
        const tail = [
          r.leftAMonth !== null ? `${share(r.leftAMonth)} left a month` : null,
          r.trialsPaid !== null ? `${share(r.trialsPaid)} of trials paid` : null,
        ].filter(Boolean);
        return (
          <li key={r.version} className="border-t py-3 first:border-t-0 first:pt-0" style={{ borderColor: "var(--adm-line)" }}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                {r.version}
              </p>
              <p className="text-end text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
                {when}
              </p>
            </div>
            <p className="mt-0.5 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
              {count.format(r.joined)} joined, {count.format(r.left)} left.{tail.length ? ` ${capFirst(tail.join(", "))}.` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ── Folded: the guardrails ───────────────────────────────────────────────

function Guardrails({ data }: { data: GoalsData }) {
  const { rating, refunds } = data;
  return (
    <ul>
      <Row
        name="Store rating"
        nameNote={rating.held === null ? `On ${rating.store}` : `On ${rating.store}, ${rating.held ? "as last month" : "lower than last month"}`}
        value={rating.stars === null ? "not read" : `${rating.stars.toFixed(1)} of 5`}
        state={rating.held === null ? undefined : { tone: rating.held ? "good" : "bad", word: rating.held ? "Holds" : "Fell" }}
      />
      <Row
        name="Refunds"
        nameNote={`Of ${count.format(refunds.payments)} payments this month`}
        value={count.format(refunds.count)}
        state={{ tone: refunds.low ? "good" : "bad", word: refunds.low ? "Low" : "High" }}
      />
      <Row name="What was free stays free" nameNote="Kept by hand: no number can show it." />
    </ul>
  );
}

// ── Folded: monthly and yearly ───────────────────────────────────────────

function MonthlyAndYearly({ data, next, early }: { data: GoalsData; next: GoalStep | null; early: boolean }) {
  const { mix } = data;
  const total = mix.monthlyCents + mix.yearlyCents;
  const monthlyShare = total > 0 ? mix.monthlyCents / total : 0;
  const m = Math.round(monthlyShare * 100);
  const left = (x: { left: number; of: number }) => `${count.format(x.left)} of ${count.format(x.of)} left in 30 days`;
  return (
    <div className="space-y-4">
      <div className="flex h-2 w-full gap-[3px]" role="img" aria-label={`Monthly ${m}%, yearly ${100 - m}% of the number`}>
        {m > 0 ? <div className="h-full rounded-full" style={{ width: `${m}%`, background: "var(--adm-ink)" }} /> : null}
        {m < 100 ? <div className="h-full flex-1 rounded-full" style={{ background: "var(--adm-ink-3)" }} /> : null}
      </div>
      <ul>
        <Row
          name={`Monthly, ${count.format(data.paying.monthly)} members`}
          nameNote={early || !mix.leftMonthly ? undefined : left(mix.leftMonthly)}
          value={`${money(mix.monthlyCents)} a week`}
        />
        <Row
          name={`Yearly, ${count.format(data.paying.yearly)} members`}
          nameNote={early || !mix.leftYearly ? undefined : left(mix.leftYearly)}
          value={`${money(mix.yearlyCents)} a week`}
        />
      </ul>
      <div className="space-y-1.5 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
        {mix.monthlyShareBefore !== null ? (
          <p>
            {monthlyShare >= mix.monthlyShareBefore ? "Monthly is growing faster" : "Yearly is growing faster"}: monthly was{" "}
            {share(mix.monthlyShareBefore)} a month ago.
          </p>
        ) : null}
        {data.standStill !== null ? <p>To stand still: about {count.format(data.standStill)} new members a month.</p> : null}
        {next && mix.allMonthly !== null && mix.allYearly !== null ? (
          <p>
            {next.name} needs {count.format(mix.allMonthly)} more if all were monthly, {count.format(mix.allYearly)} if all
            were yearly.
          </p>
        ) : null}
        <p>
          Early signs: {count.format(mix.renewalOff)} turned renewal off, {count.format(mix.cardFailed)}{" "}
          {mix.cardFailed === 1 ? "card" : "cards"} failed.
        </p>
        <p style={{ color: "var(--adm-ink-3)" }}>Each member counts at their own price, after the stores&apos; share.</p>
      </div>
    </div>
  );
}

// ── Folded: his marks ────────────────────────────────────────────────────

function Marks({ marks, onSave }: { marks: GoalMark[]; onSave?: (marks: GoalMark[]) => void | Promise<void> }) {
  const start = [0, 1].map((i) => ({
    name: marks[i]?.name ?? (i === 0 ? "The first mark" : "The second mark"),
    dollars: marks[i] ? String(Math.round(marks[i].weeklyCents / 100)) : "",
  }));
  const [rows, setRows] = useState(start);
  const [busy, setBusy] = useState(false);
  const set = (i: number, k: "name" | "dollars", v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <div>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <fieldset key={i} className="min-w-0">
            <legend className="text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              {i === 0 ? "First mark" : "Second mark"}
            </legend>
            <div className="mt-2 grid grid-cols-[1fr_9.5rem] gap-2">
              <label className="min-w-0">
                <span className="sr-only">Its name</span>
                <input
                  className="adm-quiet-field min-h-11 w-full rounded-[var(--adm-radius-sm)] border px-3 text-[15px]"
                  style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
                  value={r.name}
                  onChange={(e) => set(i, "name", e.target.value)}
                  maxLength={40}
                  aria-label={`${i === 0 ? "First" : "Second"} mark's name`}
                />
              </label>
              <label className="relative block">
                <span
                  aria-hidden
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[15px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  $
                </span>
                <input
                  className="adm-quiet-field min-h-11 w-full rounded-[var(--adm-radius-sm)] border ps-7 pe-[4.5rem] text-[15px] tabular-nums"
                  style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
                  inputMode="numeric"
                  value={r.dollars}
                  onChange={(e) => set(i, "dollars", e.target.value.replace(/[^0-9]/g, ""))}
                  aria-label={`${i === 0 ? "First" : "Second"} mark, dollars a week`}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[13.5px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  a week
                </span>
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-4 text-[13.5px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
        Kept in the panel&apos;s own settings, never in the app. A tenth, a quarter and half of the first mark are the steps
        before it.
      </p>
      <div className="mt-4">
        <ToolbarButton
          variant="primary"
          loading={busy}
          onClick={async () => {
            if (!onSave) return;
            setBusy(true);
            try {
              await onSave(rows.map((r) => ({ name: r.name.trim(), weeklyCents: Number(r.dollars || 0) * 100 })));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save marks
        </ToolbarButton>
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

/** A part of the page: a small grey label and what it holds. Space sets it apart, not a box or a rule. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-10" aria-label={label}>
      <h2 className="mb-1.5 text-[13px]" style={{ color: "var(--adm-ink-3)", fontWeight: 500 }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

/** A quiet row that opens in place: no box, a hairline between, the house's chevron. */
function Fold({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <details className="group border-t first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 text-[15px]" style={{ color: "var(--adm-ink)" }}>
          {title}
        </span>
        {value ? (
          <span className="shrink-0 text-[14px] tabular-nums" style={{ color: "var(--adm-ink-2)" }}>
            {value}
          </span>
        ) : null}
        <ChevronDown size={16} className="shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: "var(--adm-ink-3)" }} />
      </summary>
      <div className="pb-5 pt-1">{children}</div>
    </details>
  );
}

/**
 * One quiet figure: its name at the start with a small note under it, its
 * value at the end with a small note or its state (a dot and a word) under it.
 */
function Row({
  name,
  nameNote,
  value,
  valueNote,
  state,
}: {
  name: string;
  nameNote?: string;
  value?: string;
  valueNote?: string;
  state?: { tone: StatusTone; word: string };
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-t py-3 first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
      <div className="min-w-0">
        <p className="text-[15px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
          {name}
        </p>
        {nameNote ? (
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
            {nameNote}
          </p>
        ) : null}
      </div>
      {value || state ? (
        <div className="shrink-0 text-end">
          {value ? (
            <p className="text-[15px] font-semibold tabular-nums leading-snug" style={{ color: "var(--adm-ink)" }}>
              {value}
            </p>
          ) : null}
          {valueNote ? (
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
              {valueNote}
            </p>
          ) : state ? (
            <span className="mt-1 inline-flex items-center gap-[7px] text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
              <StatusDot tone={state.tone} />
              {state.word}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => (/^(The|A|An) /.test(s) || /^Halfway/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
