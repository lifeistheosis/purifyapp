"use client";

import { useState, type ReactNode } from "react";

import { Disclosure, StatusDot, ToolbarButton, type StatusTone } from "../primitives";
import { useReducedMotion } from "@/lib/ui/motion";

/**
 * The Goals page, the calm way (his word of 2026-11-23: the panel "feels like
 * a terminal ... very codey"; the plan is docs/plans/goals-milestones.md).
 *
 * What it shows, in order, each thing once:
 *
 *   the number      what members bring in a week after the stores' share,
 *                   its growth on last week against the 5% asked, and one
 *                   line of progress to the next step by name
 *   three facts     paying now (monthly and yearly), this week (joined and
 *                   left), and the next step's day
 *   the four        the weekly goals he can move, each against his own last
 *                   four weeks bettered by 5%, the one lever, and what
 *                   standing still costs
 *   the road        the six steps, reached ones quiet, the next one plain
 *   by update       each release's line, newest first
 *   the guardrails  never traded for money
 *   folded          monthly and yearly, Extra (the shop), this hour, the
 *                   Bible licence, and his two marks
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

  return (
    <div className="space-y-9 font-sans">
      {banner}

      <TheNumber data={data} next={next} reached={reached} />

      <Facts data={data} next={next} />

      <TheFour data={data} />

      <TheRoad data={data} />

      <ByUpdate data={data} />

      <Guardrails data={data} />

      <div className="space-y-2.5">
        <Disclosure title="Monthly and yearly" hint="The mix, who left in 30 days, and the early signs">
          <MonthlyAndYearly data={data} next={next} early={early} />
        </Disclosure>
        <Disclosure title="Extra" hint="Shop sales, kept apart from the number">
          {data.extra ? (
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--adm-ink)" }}>
              {money(data.extra.monthCents)} this month after fees, from {count.format(data.extra.orders)}{" "}
              {data.extra.orders === 1 ? "order" : "orders"}.{" "}
              <span style={{ color: "var(--adm-ink-2)" }}>Not counted in the number or the road.</span>
            </p>
          ) : (
            <p className="text-[15px]" style={{ color: "var(--adm-ink-2)" }}>
              No shop sales this month.
            </p>
          )}
        </Disclosure>
        {hourly ? (
          <Disclosure title="This hour" hint="The hourly goals and their notices, as before">
            {hourly}
          </Disclosure>
        ) : null}
        {licence ? (
          <Disclosure title="The Bible licence" hint="API.Bible's limits, as before">
            {licence}
          </Disclosure>
        ) : null}
        <Disclosure title="Your marks" hint="The road is made from them">
          <Marks marks={data.marks} onSave={onSaveMarks} />
        </Disclosure>
      </div>
    </div>
  );
}

// ── The number ───────────────────────────────────────────────────────────

function TheNumber({ data, next, reached }: { data: GoalsData; next: GoalStep | null; reached: GoalStep | null }) {
  const reduced = useReducedMotion();
  const toGo = next ? Math.max(0, next.weeklyCents - data.weeklyCents) : 0;
  const pct = next && next.weeklyCents > 0 ? Math.min(100, Math.round((data.weeklyCents / next.weeklyCents) * 100)) : 100;

  let growth: string;
  if (data.enoughOn) {
    growth = `After the stores' share, from who pays now. Its growth shows once four full weeks are kept, on ${dayWords(data.enoughOn, data.today)}.`;
  } else if (data.growth === null) {
    growth = "After the stores' share.";
  } else {
    const g = Math.round(Math.abs(data.growth) * 100);
    const way = data.growth >= 0 ? `Up ${g}%` : `Down ${g}%`;
    growth = `After the stores' share. ${way} on last week; the pace asked is 5%.`;
  }

  return (
    <section aria-label="What members bring in">
      {reached ? (
        // A step reached is a moment of its own: it rises in once, on the
        // house's curve, over the time the board's own entrances take, and
        // simply stands there with Motion off.
        <div
          className="mb-6 flex items-start gap-3 border-b pb-5"
          style={{
            borderColor: "var(--adm-line)",
            animation: reduced ? undefined : "adm-rise 700ms var(--adm-ease) backwards",
          }}
        >
          <StatusDot tone="good" className="mt-[9px]" />
          <div className="min-w-0">
            <p className="text-[19px] font-semibold leading-snug" style={{ color: "var(--adm-ink)" }}>
              {reached.id === "bills" ? "The app pays its own bills now" : `You reached ${lowerFirst(reached.name)}`}
            </p>
            <p className="mt-1 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
              The number has held over {money(reached.weeklyCents)} a week for four weeks running.
            </p>
          </div>
        </div>
      ) : null}

      <p className="text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Week of {dayWords(data.week, data.today)}
      </p>
      <h2 className="mt-3 text-[15px]" style={{ color: "var(--adm-ink-2)", fontWeight: 400 }}>
        What members bring in
      </h2>
      <p className="mt-1 flex items-baseline gap-2" style={{ color: "var(--adm-ink)" }}>
        <span className="text-[56px] font-semibold leading-none tracking-[-0.035em] tabular-nums">
          {money(data.weeklyCents)}
        </span>
        <span className="text-[17px]" style={{ color: "var(--adm-ink-2)" }}>
          a week
        </span>
      </p>
      <p className="mt-3 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
        {growth}
      </p>

      {next ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
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
        <p className="mt-6 text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          Every step is reached.
        </p>
      )}
    </section>
  );
}

// ── Three facts ──────────────────────────────────────────────────────────

function Facts({ data, next }: { data: GoalsData; next: GoalStep | null }) {
  const paying = data.paying.monthly + data.paying.yearly;
  let when: { value: string; sub: string | null };
  if (!next) when = { value: "reached", sub: null };
  else if (data.enoughOn || next.byFive === null) when = { value: "not enough weeks yet", sub: null };
  else
    when = {
      value: next.byPace ? `about ${dayWords(next.byPace, data.today)}` : "not at this pace",
      sub:
        (data.paceCents !== null && data.paceCents > 0
          ? `At your pace, ${money(data.paceCents)} more each week. `
          : "The number has not grown over the last four weeks. ") +
        `At 5% a week, ${dayWords(next.byFive, data.today)}.`,
    };

  return (
    <ul aria-label="Three facts">
      <Row name="Paying now" value={`${count.format(paying)} ${paying === 1 ? "member" : "members"}`}>
        {count.format(data.paying.monthly)} monthly, {count.format(data.paying.yearly)} yearly
      </Row>
      <Row name="This week" value={`${count.format(data.thisWeek.joined)} joined, ${count.format(data.thisWeek.left)} left`} />
      <Row name={next ? "Next step by" : "The road"} value={when.value}>
        {when.sub}
      </Row>
    </ul>
  );
}

// ── The four that move it ────────────────────────────────────────────────

const MOVER_WORDS: Record<Mover["id"], { name: string; of: string | null; less: boolean }> = {
  readers: { name: "New readers", of: null, less: false },
  begin: { name: "Begin a trial or a plan", of: "of new readers", less: false },
  pay: { name: "Trials that pay", of: "of trials that ended", less: false },
  leave: { name: "Members who leave", of: "of paying members", less: true },
};

const LEVER_WORDS: Record<NonNullable<GoalsData["lever"]>, string> = {
  joining: "Right now, more joining would move the day most.",
  leaving: "Right now, fewer leaving would move the day most.",
  monthly: "Right now, more of them choosing monthly would move the day most.",
};

function TheFour({ data }: { data: GoalsData }) {
  return (
    <Section
      title="The four that move it"
      sentence="This week against your aims. Each aim is your own last four weeks, bettered by 5%."
    >
      {data.movers === null ? (
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--adm-ink)" }}>
          Not enough weeks yet. The aims begin {data.enoughOn ? `on ${dayWords(data.enoughOn, data.today)}` : "once four full weeks are kept"}.
        </p>
      ) : (
        <>
          {data.lever ? (
            <p className="mb-2 text-[15px] font-medium leading-snug" style={{ color: "var(--adm-ink)" }}>
              {LEVER_WORDS[data.lever]}
            </p>
          ) : null}
          <ul>
            {data.movers.map((m) => {
              const w = MOVER_WORDS[m.id];
              const fmt = m.id === "readers" ? count.format(Math.round(m.value)) : share(m.value);
              const aim = m.id === "readers" ? count.format(Math.round(m.aim)) : share(m.aim);
              const met = w.less ? m.value <= m.aim : m.value >= m.aim;
              return (
                <Row
                  key={m.id}
                  name={w.name}
                  value={fmt}
                  state={{ tone: met ? "good" : "wait", word: met ? "Met" : "Not yet" }}
                >
                  {w.less ? `Aim under ${aim}` : `Aim ${aim}`}
                  {w.of ? ` ${w.of}.` : "."}
                  {m.id === "leave" && data.standStill !== null ? (
                    <span className="mt-1 block" style={{ color: "var(--adm-ink-2)" }}>
                      To stand still: about {count.format(data.standStill)} new members a month.
                    </span>
                  ) : null}
                </Row>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}

// ── The road ─────────────────────────────────────────────────────────────

function TheRoad({ data }: { data: GoalsData }) {
  const next = data.steps.find((s) => s.reachedOn === null);
  return (
    <Section
      title="The road"
      sentence="Six steps to your second mark. A step is reached once the number holds it for four weeks running."
    >
      <ol>
        {data.steps.map((s) => {
          const isNext = s === next;
          const done = s.reachedOn !== null;
          let sub: string;
          if (done) sub = s.id === data.justReached ? "Reached this week." : `Reached ${dayWords(s.reachedOn as string, data.today)}.`;
          else if (s.weeklyCents <= data.weeklyCents)
            sub = `${isNext ? "Next. " : ""}Over it now; held ${s.heldWeeks} of the 4 weeks it needs.`;
          else if (isNext)
            sub = `Next. About ${count.format(s.moreMembers ?? 0)} more members at today's mix.`;
          else {
            sub = `About ${count.format(s.moreMembers ?? 0)} more members.`;
            if (s.byPace && s.byFive)
              sub += ` By ${dayWords(s.byPace, data.today)} at your pace; by ${dayWords(s.byFive, data.today)} at 5% a week.`;
            else if (s.byFive) sub += ` By ${dayWords(s.byFive, data.today)} at 5% a week.`;
          }
          return (
            <li
              key={s.id}
              className="flex gap-3 border-t py-3.5 first:border-t-0 first:pt-1"
              style={{ borderColor: "var(--adm-line)" }}
              aria-current={isNext ? "step" : undefined}
            >
              <StatusDot tone={done ? "good" : isNext ? "wait" : "idle"} className="mt-[8px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={"text-[15px] leading-snug" + (isNext ? " font-semibold" : "")}
                    style={{ color: done ? "var(--adm-ink-2)" : "var(--adm-ink)" }}
                  >
                    {s.name}
                  </p>
                  <p className="shrink-0 text-[14px] tabular-nums" style={{ color: done ? "var(--adm-ink-3)" : "var(--adm-ink-2)" }}>
                    {money(s.weeklyCents)} a week
                  </p>
                </div>
                <p className="mt-1 text-[13.5px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
                  {sub}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

// ── By update ────────────────────────────────────────────────────────────

function ByUpdate({ data }: { data: GoalsData }) {
  return (
    <Section title="By update" sentence="What each update brought, newest first. The newest fills in as its days pass.">
      <ul>
        {data.releases.map((r) => {
          const days = Math.round((Date.parse(`${data.today}T00:00:00Z`) - Date.parse(`${r.from}T00:00:00Z`)) / DAY_MS);
          const when = r.to
            ? `${dayWords(r.from, data.today)} to ${dayWords(r.to, data.today)}`
            : `since ${dayWords(r.from, data.today)}, ${days} ${days === 1 ? "day" : "days"}`;
          const parts = [`${count.format(r.joined)} joined and ${count.format(r.left)} left.`];
          const tail = [
            r.leftAMonth !== null ? `${share(r.leftAMonth)} left a month` : null,
            r.trialsPaid !== null ? `${share(r.trialsPaid)} of trials paid` : null,
          ].filter(Boolean);
          if (tail.length) parts.push(`${capFirst(tail.join(", and "))}.`);
          return (
            <li key={r.version} className="border-t py-3.5 first:border-t-0 first:pt-1" style={{ borderColor: "var(--adm-line)" }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                  {r.version}
                </p>
                <p className="text-end text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {when}
                </p>
              </div>
              <p className="mt-1 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
                {parts.join(" ")}
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ── The guardrails ───────────────────────────────────────────────────────

function Guardrails({ data }: { data: GoalsData }) {
  const { rating, refunds } = data;
  return (
    <Section title="What we never trade for money">
      <ul>
        <Row
          name="The store's rating holds"
          value={rating.stars === null ? "not read" : `${rating.stars.toFixed(1)} of 5`}
          state={rating.held === null ? undefined : { tone: rating.held ? "good" : "bad", word: rating.held ? "Holds" : "Fell" }}
        >
          On {rating.store}
          {rating.held === null ? "." : rating.held ? ", as last month." : ", lower than last month."}
        </Row>
        <Row
          name="Refunds stay low"
          value={`${count.format(refunds.count)} this month`}
          state={{ tone: refunds.low ? "good" : "bad", word: refunds.low ? "Low" : "High" }}
        >
          Of {count.format(refunds.payments)} payments.
        </Row>
        <Row name="What was free stays free">
          The terms promise it. No number can show it, so it is kept by hand.
        </Row>
      </ul>
    </Section>
  );
}

// ── Folded: monthly and yearly ───────────────────────────────────────────

function MonthlyAndYearly({ data, next, early }: { data: GoalsData; next: GoalStep | null; early: boolean }) {
  const { mix } = data;
  const total = mix.monthlyCents + mix.yearlyCents;
  const monthlyShare = total > 0 ? mix.monthlyCents / total : 0;
  const m = Math.round(monthlyShare * 100);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex h-2 w-full gap-[3px]" role="img" aria-label={`Monthly ${m}%, yearly ${100 - m}% of the number`}>
          {m > 0 ? <div className="h-full rounded-full" style={{ width: `${m}%`, background: "var(--adm-ink)" }} /> : null}
          {m < 100 ? <div className="h-full flex-1 rounded-full" style={{ background: "var(--adm-ink-3)" }} /> : null}
        </div>
        <ul className="mt-2">
          <Row name="Monthly" value={`${money(mix.monthlyCents)} a week`}>
            {share(monthlyShare)} of the number, from {count.format(data.paying.monthly)} members.
          </Row>
          <Row name="Yearly" value={`${money(mix.yearlyCents)} a week`}>
            {share(1 - monthlyShare)} of the number, from {count.format(data.paying.yearly)} members.
          </Row>
        </ul>
        {mix.monthlyShareBefore !== null ? (
          <p className="mt-2 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
            {monthlyShare >= mix.monthlyShareBefore ? "Monthly is growing faster" : "Yearly is growing faster"}: monthly was{" "}
            {share(mix.monthlyShareBefore)} of the number a month ago.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          Who left in the last 30 days
        </h3>
        {early || (!mix.leftMonthly && !mix.leftYearly) ? (
          <p className="mt-1 text-[14px]" style={{ color: "var(--adm-ink-2)" }}>
            Not enough weeks yet.
          </p>
        ) : (
          <ul className="mt-1">
            {mix.leftMonthly ? (
              <Row name="Monthly members" value={share(mix.leftMonthly.left / Math.max(1, mix.leftMonthly.of))}>
                {count.format(mix.leftMonthly.left)} of {count.format(mix.leftMonthly.of)}.
              </Row>
            ) : null}
            {mix.leftYearly ? (
              <Row name="Yearly members" value={share(mix.leftYearly.left / Math.max(1, mix.leftYearly.of))}>
                {count.format(mix.leftYearly.left)} of {count.format(mix.leftYearly.of)}.
              </Row>
            ) : null}
          </ul>
        )}
        <p className="mt-2 text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
          Early signs this month: {count.format(mix.renewalOff)} turned renewal off, and {count.format(mix.cardFailed)}{" "}
          {mix.cardFailed === 1 ? "card" : "cards"} failed.
        </p>
      </div>

      {next && mix.allMonthly !== null && mix.allYearly !== null ? (
        <p className="text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
          If every new member were monthly, {lowerFirst(next.name)} would need {count.format(mix.allMonthly)} more members;
          if every one were yearly, {count.format(mix.allYearly)}.
        </p>
      ) : null}
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

/** A part of the page: a heading in words, one sentence, and its rows. A hairline above, never down an edge. */
function Section({ title, sentence, children }: { title: string; sentence?: string; children: ReactNode }) {
  return (
    <section className="border-t pt-6" style={{ borderColor: "var(--adm-line)" }}>
      <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]" style={{ color: "var(--adm-ink)" }}>
        {title}
      </h2>
      {sentence ? (
        <p className="mt-1.5 text-[14px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
          {sentence}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One quiet figure: its name at the start, its value at the end, a line under it, and its state in a dot and a word. */
function Row({
  name,
  value,
  state,
  children,
}: {
  name: string;
  value?: string;
  state?: { tone: StatusTone; word: string };
  children?: ReactNode;
}) {
  return (
    <li className="border-t py-3 first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-[15px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
          {name}
        </p>
        {value ? (
          <p className="shrink-0 text-end text-[16px] font-semibold tabular-nums" style={{ color: "var(--adm-ink)" }}>
            {value}
          </p>
        ) : null}
      </div>
      {children || state ? (
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="min-w-0 text-[13.5px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
            {children}
          </div>
          {state ? (
            <span className="inline-flex shrink-0 items-center gap-[7px] text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
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
