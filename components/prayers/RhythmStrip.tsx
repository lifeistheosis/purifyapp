"use client";

// 14-day rhythm strip — the honest replacement for streak chrome.
// One dot per day; gold for prayed, paper-dim for skipped. The
// quiet copy below reads "12 of last 14 days" — a volume number,
// not a panic number.

import { rhythmFor, daysSinceLast, useRhythm, type RuleId } from "@/lib/prayers/storage";

export function RhythmStrip({
  ruleId,
  days = 14,
}: {
  ruleId: RuleId;
  days?: number;
}) {
  // Force a subscription so the strip re-renders on prayer-completed.
  useRhythm(ruleId, days);
  const series = rhythmFor(ruleId, days);
  const count = series.filter((s) => s.prayed).length;
  const since = daysSinceLast(ruleId);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-sans text-[12.5px] text-paper/65">
          <span className="font-semibold text-paper tabular-nums">{count}</span>
          <span className="text-paper/55">
            {" "}
            of last {days} days
          </span>
        </p>
        {since !== null && (
          <p className="font-sans text-[11px] text-paper/45 tabular-nums">
            {since === 0
              ? "Prayed today."
              : since === 1
                ? "Last prayed yesterday."
                : `Last prayed ${since} days ago.`}
          </p>
        )}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
        aria-label={`Rhythm: ${count} of the last ${days} days.`}
      >
        {series.map((d) => (
          <Cell key={d.date} date={d.date} prayed={d.prayed} />
        ))}
      </div>
    </div>
  );
}

function Cell({ date, prayed }: { date: string; prayed: boolean }) {
  return (
    <span
      title={`${date}${prayed ? " · prayed" : ""}`}
      className={
        "block h-5 rounded-sm transition-colors " +
        (prayed
          ? "bg-gold/65 border border-gold/35"
          : "bg-paper/[0.06] border border-paper/[0.04]")
      }
    />
  );
}
