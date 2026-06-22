"use client";

import Link from "next/link";

import { useTodayGoals, type GoalKey } from "@/lib/today/goals";

/**
 * The day's three goals on Today: keep the fast, pray the rule, read the
 * appointed Scripture. On-device, today-only, no streaks (see
 * lib/today/goals). Each line is a tap-to-mark check with a quiet link to
 * the place it is kept. A small "kept" line appears once all three are
 * marked, in the prayer-book register, not a celebration banner.
 */
export function DailyGoals({
  fastLabel,
  readingHref,
}: {
  /** Today's fast description, computed server-side and passed down. */
  fastLabel: string;
  /** Where the appointed readings live (the daily-readings anchor). */
  readingHref: string;
}) {
  const { state, toggle, doneCount, total } = useTodayGoals();

  const goals: {
    key: GoalKey;
    label: string;
    detail: string;
    href: string;
  }[] = [
    {
      key: "fast",
      label: "Keep the fast",
      detail: fastLabel,
      href: "/calendar",
    },
    {
      key: "prayer",
      label: "Pray the rule",
      detail: "Morning and evening, the prayer of the heart",
      href: "/prayers/morning",
    },
    {
      key: "reading",
      label: "Read the appointed Scripture",
      detail: "Today's Epistle and Gospel",
      href: readingHref,
    },
  ];

  return (
    <section className="border-b border-paper/10 py-7">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40">
          The day&rsquo;s rule
        </p>
        <p className="font-sans text-caption text-paper/35 tabular-nums">
          {doneCount} of {total}
        </p>
      </div>

      <ul className="space-y-2.5">
        {goals.map((g) => {
          const done = state[g.key];
          return (
            <li key={g.key} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-pressed={done}
                aria-label={done ? `Unmark: ${g.label}` : `Mark done: ${g.label}`}
                className={
                  "mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors " +
                  (done
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-paper/30 text-transparent hover:border-paper/55")
                }
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6.5L5 9l4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "font-serif text-body leading-snug transition-colors " +
                    (done ? "text-paper/50 line-through decoration-paper/30" : "text-paper")
                  }
                >
                  {g.label}
                </p>
                <p className="mt-0.5 font-sans text-caption text-paper/45 leading-[1.5]">
                  {g.detail}
                  {" · "}
                  <Link
                    href={g.href}
                    className="underline decoration-paper/20 underline-offset-2 hover:text-paper hover:decoration-paper/50"
                  >
                    open
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {doneCount === total ? (
        <p className="mt-4 font-serif italic text-detail text-paper/60">
          The rule is kept. Glory to God.
        </p>
      ) : null}
    </section>
  );
}
