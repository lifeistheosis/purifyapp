"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { StatusDot, ToolbarButton, type StatusTone } from "../primitives";
import { Candle } from "@/components/ui/icons/Candle";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Lock } from "@/components/ui/icons/Lock";
import { Seal } from "@/components/ui/icons/Seal";
import { Star } from "@/components/ui/icons/Star";
import { useReducedMotion } from "@/lib/ui/motion";

/**
 * The Goals page, the calm way (his word of 2026-11-23: the panel "feels like
 * a terminal ... very codey"; the plan is docs/plans/goals-milestones.md).
 *
 * What it shows, in order. Made minimal at his word of 2026-11-24 ("make the
 * design more simplified and minimalist"), the milestones as bars and
 * achievements ("I want to see more milestone bars/ achievement designs"),
 * each with a screen of its own ("ensure each goal has its own screen and
 * animation"), and then a game, for him alone ("gamify this system honestly
 * (extreme) so I can actually have fun doing this (only gamify the goals for
 * me)"). Every number in the game is a real one:
 *
 *   a finish        the week a level is reached, the app's own finish moment
 *   player card     his level (milestones held), the XP (what members bring
 *                   in a week) and its bar to the next level, his streak
 *                   (weeks in a row the number grew), this week's members
 *   quests          the four weekly goals against his own last four weeks
 *                   bettered by 5%, the one lever, and perfect weeks
 *   levels          the six milestones: reached (the seal), next, locked
 *   badges          real events, earned on a day or with how to earn them
 *   records         his personal bests
 *   more            quiet rows that open in place: seasons (by update),
 *                   monthly and yearly, the guardrails, Extra (the shop),
 *                   this hour, the Bible licence, his marks
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
  /** The day it is reached at the last four weeks' pace; null without one. For a step the number already stands over, the day its four weeks are up. */
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
  /** Weeks in a row the number has grown on the week before, and the longest such run. */
  streak: { weeks: number; best: number };
  /** Days left in this week, today included (weeks run Monday to Sunday, UTC). */
  daysLeft: number;
  /** Weeks with all four quests met. */
  perfectWeeks: number;
  /** Badges: each for a real event in the kept numbers, earned on a day or not yet. */
  badges: { id: string; name: string; how: string; earnedOn: string | null; /** 1 (easy, green) to 5 (gold). */ tier: number }[];
  /** Personal bests, each a real figure and the day it was set. */
  records: { name: string; value: number; unit: "money" | "count" | "weeks" | "share"; on: string | null; isNew: boolean }[];
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

// ── The tiers ────────────────────────────────────────────────────────────
//
// His word, 2026-11-24: "make the design nice and incorporate colors. the high
// tier (gold). and green for easy stuff. and other colors usually applied to
// certain tiers". Five tiers as games colour them, each a token of the
// panel's theme (app/admin/admin-theme.css) with a value for dark and light,
// and each always with its name or its level beside it. Then, the same day:
// "I want to the whole system to be majority white and black. and only in
// specific areas it's colored". So the colour lives in three places only: the
// road's six segments, the seal of a badge earned, and the check of a quest
// done (green, the easy tier). Everything else is the panel's ink.

const TIERS = [
  { name: "Easy", color: "var(--adm-tier-1)" },
  { name: "Rare", color: "var(--adm-tier-2)" },
  { name: "Epic", color: "var(--adm-tier-3)" },
  { name: "Legendary", color: "var(--adm-tier-4)" },
  { name: "Mythic", color: "var(--adm-tier-5)" },
] as const;

/** Level n's tier: the first four in order, and his own two marks at the top, in gold. */
const tierOfLevel = (n: number) => TIERS[Math.min(Math.max(n, 1), 5) - 1];
const tierOf = (t: number) => TIERS[Math.min(Math.max(t, 1), 5) - 1];
const tint = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;

/** checkMock's gold rule, answered by name: this page's gold is his own tier (above). */
const GOLD_OK = {
  "data-mock-allow": "gold",
  "data-mock-why": "the top tier of his own goals game, gold at his word of 2026-11-24, on his own panel (app/admin/admin-theme.css --adm-tier-5)",
};

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
  // Each milestone has a screen of its own (his word, 2026-11-24: "ensure each
  // goal has its own screen and animation"). Back returns to the same place.
  const [goal, setGoal] = useState<GoalStepId | null>(null);
  const was = useRef(0);
  useLayoutEffect(() => {
    if (goal) window.scrollTo(0, 0);
    else if (was.current) window.scrollTo(0, was.current);
  }, [goal]);
  const open = (id: GoalStepId) => {
    was.current = window.scrollY;
    setGoal(id);
  };
  const opened = goal ? data.steps.find((s) => s.id === goal) ?? null : null;
  if (opened) return <GoalScreen data={data} step={opened} onBack={() => setGoal(null)} />;
  const early = data.enoughOn !== null;
  const total = data.mix.monthlyCents + data.mix.yearlyCents;
  const broke = [
    data.rating.held === false ? "Rating fell" : null,
    data.refunds.low ? null : "Refunds high",
  ].filter(Boolean);

  return (
    <div className="font-sans" {...GOLD_OK}>
      {banner}

      <Head data={data} next={next} reached={reached} />

      <Block
        label="This week's quests"
        aside={data.movers ? `${data.movers.filter(questMet).length} of 4 done, ${data.daysLeft} ${data.daysLeft === 1 ? "day" : "days"} left` : undefined}
      >
        <Quests data={data} />
      </Block>

      <Block label="Levels" aside={`${data.steps.filter((s) => s.reachedOn !== null).length} of ${data.steps.length}`}>
        <Levels data={data} next={next} onOpen={open} />
      </Block>

      <Block label="Badges" aside={`${data.badges.filter((b) => b.earnedOn).length} of ${data.badges.length}`}>
        <Badges data={data} />
      </Block>

      <Block label="Records">
        <Records data={data} />
      </Block>

      <Block label="More">
        <div>
          <Fold title="Seasons" value={data.releases[0] ? `${data.releases[0].version} now` : undefined}>
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

// ── The head ─────────────────────────────────────────────────────────────
//
// The game, at his word of 2026-11-24 ("gamify this system honestly (extreme)
// so I can actually have fun doing this (only gamify the goals for me)"), and
// without the boxed card he found vibe coded the same day ("new card design
// that looks vibe coded"): nothing here sits in a box. The level is a numeral
// in the house's display serif, as a chapter opens in the app; the XP is the
// real number, what members bring in a week; and the one picture is the road,
// six segments, one a level, each filled as far as the number has come
// towards it in its tier's colour. A level reached is its moment: its line
// says so, its numeral rises in and its segment fills, on the house's curve.
// Still with Motion off. Honest: a level is a milestone held four weeks
// running and is kept; the XP can fall when members leave, and the road shows it.

function Head({ data, next, reached }: { data: GoalsData; next: GoalStep | null; reached: GoalStep | null }) {
  const reduced = useReducedMotion();
  const level = data.steps.filter((s) => s.reachedOn !== null).length;
  const current = level > 0 ? data.steps[level - 1] : null;
  const tier = tierOfLevel(level);
  const nextLevel = next ? data.steps.indexOf(next) + 1 : null;
  const toGo = next ? Math.max(0, next.weeklyCents - data.weeklyCents) : 0;
  let growth: string | null = null;
  if (data.enoughOn) growth = `Growth shows from ${dayWords(data.enoughOn, data.today)}.`;
  else if (data.growth !== null) growth = `${data.growth >= 0 ? "Up" : "Down"} ${Math.round(Math.abs(data.growth) * 100)}% on last week.`;
  const rise = reduced ? undefined : "adm-rise 700ms var(--adm-ease) backwards";

  return (
    <section aria-label="Your level">
      {reached ? (
        <p role="status" className="mb-4 text-[14px] font-semibold" style={{ color: "var(--adm-ink)", animation: rise }}>
          Level {level} reached this week. {reached.name}, held four weeks running.
        </p>
      ) : null}

      <div className="flex items-end gap-4">
        <span
          aria-hidden
          className="text-[88px] leading-[0.8] tabular-nums"
          style={{ fontFamily: "var(--font-display-serif)", color: level > 0 ? "var(--adm-ink)" : "var(--adm-ink-3)", animation: reached ? rise : undefined }}
        >
          {level}
        </span>
        <div className="min-w-0 pb-1">
          <p className="text-[13px]" style={{ color: "var(--adm-ink-3)", fontWeight: 500 }}>
            <span className="sr-only">Level {level} of {data.steps.length}, </span>
            {level > 0 ? tier.name : "No level yet"}
          </p>
          <h2 className="mt-0.5 text-[20px] font-semibold leading-tight" style={{ color: "var(--adm-ink)" }}>
            {current ? current.name : "Your first level is next"}
          </h2>
        </div>
      </div>

      <div className="mt-7 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-2" style={{ color: "var(--adm-ink)" }}>
          <span className="text-[40px] leading-none tracking-[-0.035em] tabular-nums" style={{ fontWeight: 500 }}>
            {money(data.weeklyCents)}
          </span>
          <span className="text-[15px]" style={{ color: "var(--adm-ink-2)" }}>
            a week
          </span>
        </p>
        <p className="inline-flex shrink-0 items-center gap-1.5 text-[13px] tabular-nums" style={{ color: "var(--adm-ink-2)" }}>
          <Candle size={17} style={{ color: data.streak.weeks > 0 ? "var(--adm-ink)" : "var(--adm-ink-3)" }} />
          {data.streak.weeks} {data.streak.weeks === 1 ? "week" : "weeks"} growing
        </p>
      </div>
      <p className="mt-1.5 text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        XP, what members bring in{growth ? `. ${growth}` : "."}
      </p>

      <Road data={data} fresh={reached ? level : null} />

      <p className="mt-3 text-[14px]" style={{ color: "var(--adm-ink-2)" }}>
        {next ? (
          <>
            {toGo > 0 ? `${money(toGo)} to ` : `Held ${next.heldWeeks} of 4 weeks at `}
            <span className="font-semibold" style={{ color: "var(--adm-ink)" }}>
              level {nextLevel}, {next.name}
            </span>
            .
          </>
        ) : (
          "Every level is reached."
        )}
      </p>
      <p className="mt-1 text-[13px] tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
        {count.format(data.paying.monthly + data.paying.yearly)} members, {count.format(data.thisWeek.joined)} joined and{" "}
        {count.format(data.thisWeek.left)} left this week
      </p>
    </section>
  );
}

/**
 * The road: six segments, one a level, numbered under it. Each fills in its
 * tier's colour as far as the number has come towards that level's amount, so
 * the levels reached are whole and the ones ahead show how near they are. A
 * level reached this week (`fresh`) fills as the page opens.
 */
function Road({ data, fresh }: { data: GoalsData; fresh: number | null }) {
  const reduced = useReducedMotion();
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (reduced) return;
    const runs = fills.current
      .map((el, i) => (el && typeof el.animate === "function" && (fresh === null || fresh === i + 1)
        ? el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 900, delay: fresh === null ? i * 60 : 150, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" })
        : null))
      .filter(Boolean) as Animation[];
    return () => runs.forEach((r) => r.cancel());
  }, [reduced, fresh]);
  const words = data.steps
    .map((s, i) => `level ${i + 1}, ${s.name}, ${s.reachedOn ? "reached" : `${pctOf(data, s)}%`}`)
    .join("; ");
  return (
    <div className="mt-6" role="img" aria-label={`The road: ${words}`}>
      <div className="flex gap-[5px]">
        {data.steps.map((s, i) => {
          const tier = tierOfLevel(i + 1);
          const pct = s.reachedOn ? 100 : pctOf(data, s);
          return (
            <span key={s.id} className="block h-2.5 flex-1 overflow-hidden rounded-[3px]" style={{ background: "var(--adm-line)" }}>
              <span
                ref={(el) => {
                  fills.current[i] = el;
                }}
                className="block h-full origin-left rtl:origin-right"
                style={{ width: `${pct}%`, background: s.reachedOn ? tier.color : tint(tier.color, 75) }}
              />
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[5px]" aria-hidden>
        {data.steps.map((s, i) => (
          <span
            key={s.id}
            className="flex-1 text-[11.5px] tabular-nums"
            style={{ color: s.reachedOn ? "var(--adm-ink)" : "var(--adm-ink-3)", fontWeight: s.reachedOn ? 600 : 400 }}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
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

/** A quest is met when this week's figure reaches its aim (stays under it, for who leave). */
const questMet = (m: Mover) => (MOVER_WORDS[m.id].less ? m.value <= m.aim : m.value >= m.aim);

/** How near a quest is to its aim, 0 to 100: for who leave, how near the share is to coming under it. */
const questPct = (m: Mover) =>
  MOVER_WORDS[m.id].less
    ? m.value <= m.aim
      ? 100
      : Math.round((m.aim / m.value) * 100)
    : Math.min(100, Math.round((m.value / Math.max(m.aim, 1e-9)) * 100));

function Quests({ data }: { data: GoalsData }) {
  if (data.movers === null)
    return (
      <p className="text-[14px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
        Not enough weeks yet. Quests begin {data.enoughOn ? dayWords(data.enoughOn, data.today) : "after four full weeks"}.
      </p>
    );
  const done = data.movers.filter(questMet).length;
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
          const met = questMet(m);
          return (
            <li key={m.id} className="flex items-start gap-3 border-t py-3 first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                {met ? (
                  <Check size={18} strokeWidth={2.4} className="check-draw finish-draw" style={{ color: "var(--adm-tier-1)" }} />
                ) : (
                  <StatusDot tone="wait" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] leading-snug" style={{ color: met ? "var(--adm-ink)" : "var(--adm-ink-2)" }}>
                    {w.name}
                    <span className="sr-only">{met ? ", done" : ", not yet"}</span>
                  </span>
                  <span className="shrink-0 text-[14px] tabular-nums" style={{ color: "var(--adm-ink)" }}>
                    <span className="font-semibold">{fmt(m.value)}</span>
                    <span style={{ color: "var(--adm-ink-3)" }}>
                      {" "}
                      / {w.less ? "under " : ""}
                      {fmt(m.aim)}
                    </span>
                  </span>
                </span>
                <Bar pct={questPct(m)} color="var(--adm-ink)" label={`${w.name}: ${questPct(m)}% of the aim`} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
        <Star size={16} style={{ color: "var(--adm-ink)" }} />
        {done === 4
          ? `A perfect week: all four done. That makes ${data.perfectWeeks + 1}.`
          : `${data.perfectWeeks} perfect ${data.perfectWeeks === 1 ? "week" : "weeks"} so far. All four by Sunday makes it ${data.perfectWeeks + 1}.`}
      </p>
    </>
  );
}

// ── Levels ───────────────────────────────────────────────────────────────
//
// The six milestones as levels: each reached keeps the house's seal and its
// day; the next is open, with what it needs (its bar is the XP bar above);
// the ones after it are locked, each with its own bar. Each opens its screen.

function Levels({ data, next, onOpen }: { data: GoalsData; next: GoalStep | null; onOpen: (id: GoalStepId) => void }) {
  return (
    <ol>
      {data.steps.map((s, i) => {
        const done = s.reachedOn !== null;
        const isNext = s === next;
        const over = !done && s.weeklyCents <= data.weeklyCents;
        const tier = tierOfLevel(i + 1);
        const note = done
          ? s.id === data.justReached
            ? "Reached this week"
            : `Reached ${dayWords(s.reachedOn as string, data.today)}`
          : over
            ? `Held ${s.heldWeeks} of 4 weeks${s.byPace ? `, reached ${dayWords(s.byPace, data.today)} if it holds` : ""}`
            : `${count.format(s.moreMembers ?? 0)} more members${s.byPace ? `, by ${dayWords(s.byPace, data.today)}` : ""}`;
        return (
          <li key={s.id} className="border-t first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
            <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-start gap-3 py-3 text-start" aria-current={isNext ? "step" : undefined}>
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center">
                {done ? (
                  <Seal size={22} style={{ color: "var(--adm-ink)" }} />
                ) : isNext ? (
                  <span className="block size-3 rounded-full border-2" style={{ borderColor: "var(--adm-ink)" }} />
                ) : (
                  <Lock size={17} style={{ color: "var(--adm-ink-3)" }} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={"text-[15px] leading-snug" + (isNext ? " font-semibold" : "")} style={{ color: done || isNext ? "var(--adm-ink)" : "var(--adm-ink-2)" }}>
                    <span style={{ color: "var(--adm-ink-3)" }}>Level {i + 1}</span> {s.name}
                    {!done && !isNext ? <span className="sr-only">, locked</span> : null}
                  </span>
                  <span className="shrink-0 text-[14px] tabular-nums" style={{ color: done ? "var(--adm-ink-2)" : "var(--adm-ink-3)" }}>
                    {money(s.weeklyCents)}
                  </span>
                </span>
                <span className="mt-1 block text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
                  {tier.name}. {note}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ── Badges and records ───────────────────────────────────────────────────

function Badges({ data }: { data: GoalsData }) {
  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-1">
      {data.badges.map((b) => {
        const earned = b.earnedOn !== null;
        const tier = tierOf(b.tier);
        return (
          <li key={b.id} className="flex min-h-[128px] flex-col items-center px-1 py-3 text-center">
            {earned ? <Seal size={30} style={{ color: tier.color }} /> : <Lock size={24} className="my-[3px]" style={{ color: "var(--adm-ink-3)" }} />}
            <span className="mt-1.5 text-[11.5px] font-semibold" style={{ color: "var(--adm-ink-3)" }}>
              {tier.name}
            </span>
            <span className="mt-0.5 text-[13px] font-semibold leading-tight" style={{ color: earned ? "var(--adm-ink)" : "var(--adm-ink-2)" }}>
              {b.name}
            </span>
            <span className="mt-1 text-[12px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
              {earned ? (b.earnedOn === data.week || (b.earnedOn as string) >= data.week ? "Earned this week" : dayWords(b.earnedOn as string, data.today)) : b.how}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Records({ data }: { data: GoalsData }) {
  const fmt = (r: GoalsData["records"][number]) =>
    r.unit === "money" ? `${money(r.value)} a week` : r.unit === "share" ? share(r.value) : r.unit === "weeks" ? `${count.format(r.value)} weeks` : count.format(r.value);
  return (
    <ul>
      {data.records.map((r) => (
        <Row
          key={r.name}
          name={r.name}
          nameNote={r.isNew ? "New record this week" : r.on ? dayWords(r.on, data.today) : undefined}
          value={fmt(r)}
          state={r.isNew ? { tone: "good", word: "New" } : undefined}
        />
      ))}
    </ul>
  );
}

const pctOf = (data: GoalsData, s: GoalStep) =>
  s.weeklyCents > 0 ? Math.min(100, Math.round((data.weeklyCents / s.weeklyCents) * 100)) : 100;

/** A milestone's bar: how far the number has come towards it. The next one's is thicker. */
function Bar({ pct, label, thick, color }: { pct: number; label: string; thick?: boolean; color?: string }) {
  return (
    <span
      className={(thick ? "mt-3 h-2" : "mt-2 h-1") + " block w-full overflow-hidden rounded-full"}
      style={{ background: "var(--adm-line)" }}
      role="img"
      aria-label={`${pct}% of the way to ${label}`}
    >
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color ?? (thick ? "var(--adm-accent)" : "var(--adm-ink-2)") }} />
    </span>
  );
}

// ── A goal's own screen ──────────────────────────────────────────────────
//
// It rises in on the house's curve. Its ring fills to where the number stands;
// a goal reached completes its ring, and then the check draws itself, the
// app's own finish (components/flow/FinishMoment.tsx). Still with Motion off.

function GoalScreen({ data, step, onBack }: { data: GoalsData; step: GoalStep; onBack: () => void }) {
  const reduced = useReducedMotion();
  const tier = tierOfLevel(data.steps.indexOf(step) + 1);
  const done = step.reachedOn !== null;
  const pct = done ? 100 : pctOf(data, step);
  const toGo = Math.max(0, step.weeklyCents - data.weeklyCents);
  const [ringDone, setRingDone] = useState(false);
  const landed = useCallback(() => setRingDone(true), []);
  const rows: { name: string; value: string }[] = [];
  if (!done) {
    if (toGo > 0) {
      rows.push({ name: "More members", value: `about ${count.format(step.moreMembers ?? 0)}` });
      if (data.enoughOn || step.byFive === null) rows.push({ name: "Its day", value: "not enough weeks yet" });
      else {
        rows.push({ name: "At your pace", value: step.byPace ? `by ${dayWords(step.byPace, data.today)}` : "not at this pace" });
        rows.push({ name: "At 5% a week", value: `by ${dayWords(step.byFive, data.today)}` });
      }
    } else {
      rows.push({ name: "Held", value: `${step.heldWeeks} of 4 weeks` });
      if (step.byPace) rows.push({ name: "Reached", value: `${dayWords(step.byPace, data.today)} if it holds` });
    }
  }
  return (
    <div className="font-sans" {...GOLD_OK} style={{ animation: reduced ? undefined : "adm-rise 260ms var(--adm-ease) backwards" }}>
      <button type="button" onClick={onBack} className="-ms-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px]" style={{ color: "var(--adm-ink-2)" }}>
        <ChevronLeft size={18} className="rtl:-scale-x-100" />
        Goals
      </button>
      <p className="mt-6 text-[13px]" style={{ color: "var(--adm-ink-3)", fontWeight: 500 }}>
        Level {data.steps.indexOf(step) + 1} of {data.steps.length} · {tier.name}
      </p>
      <h2 className="mt-1 text-[34px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "var(--adm-ink)" }}>
        {step.name}
      </h2>
      <p className="mt-1 text-[17px]" style={{ color: "var(--adm-ink-2)" }}>
        {money(step.weeklyCents)} a week
      </p>

      <Ring pct={pct} color="var(--adm-accent)" label={step.name} onDone={landed}>
        {done ? (
          ringDone || reduced ? (
            <Check size={52} strokeWidth={2} className="check-draw finish-draw" style={{ color: "var(--adm-ink)" }} />
          ) : null
        ) : (
          <>
            <span className="block text-[40px] leading-none tabular-nums" style={{ color: "var(--adm-ink)", fontWeight: 500 }}>
              {pct}%
            </span>
            <span className="mt-2 block text-[14px]" style={{ color: "var(--adm-ink-2)" }}>
              {toGo > 0 ? `${money(toGo)} to go` : `held ${step.heldWeeks} of 4 weeks`}
            </span>
          </>
        )}
      </Ring>

      {done ? (
        <div className="mt-8 text-center">
          <p className="text-[17px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            {step.id === data.justReached ? "Reached this week" : `Reached ${dayWords(step.reachedOn as string, data.today)}`}
          </p>
          <p className="mt-1 text-[14px]" style={{ color: "var(--adm-ink-2)" }}>
            Held {money(step.weeklyCents)} a week for four weeks running.
          </p>
        </div>
      ) : (
        <ul className="mt-8">
          {rows.map((r) => (
            <Row key={r.name} name={r.name} value={r.value} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A goal's ring: it fills to `pct` on the house's curve as the screen opens, then says so. */
function Ring({ pct, label, color, onDone, children }: { pct: number; label: string; color: string; onDone: () => void; children: ReactNode }) {
  const arc = useRef<SVGCircleElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = arc.current;
    if (!el || reduced || typeof el.animate !== "function") {
      onDone();
      return;
    }
    const run = el.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 100 - pct }], {
      duration: 900,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "backwards",
    });
    run.onfinish = () => onDone();
    return () => run.cancel();
  }, [pct, reduced, onDone]);
  return (
    <div className="relative mx-auto mt-8 grid size-[208px] place-items-center" role="img" aria-label={`${pct}% of the way to ${label}`}>
      <svg viewBox="0 0 208 208" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="104" cy="104" r="94" fill="none" stroke="var(--adm-line)" strokeWidth="10" />
        <circle
          ref={arc}
          cx="104"
          cy="104"
          r="94"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - pct}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
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
function Block({ label, aside, children }: { label: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-10" aria-label={label}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px]" style={{ color: "var(--adm-ink-3)", fontWeight: 500 }}>
          {label}
        </h2>
        {aside ? (
          <p className="text-[13px] tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
            {aside}
          </p>
        ) : null}
      </div>
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
  state?: { tone: StatusTone; word: string; color?: string };
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
            <span className="mt-1 inline-flex items-center gap-[7px] text-[13px] font-medium" style={{ color: state.color ?? "var(--adm-ink)" }}>
              {state.color ? <span className="block size-[7px] rounded-full" style={{ background: state.color }} /> : <StatusDot tone={state.tone} />}
              {state.word}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
