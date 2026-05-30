"use client";

// 30-day rhythm grid for the You tab. Two-state: a day is "prayed" if
// either the morning or the evening rule was completed that day. Reads
// directly from purify.prayers.{morning|evening}.dates (the same arrays
// the RhythmStrip on the rule reader uses).

import { useEffect, useState } from "react";
import Link from "next/link";
import { readPrayedDates } from "@/lib/prayers/storage";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RhythmHeatmap() {
  const [hits, setHits] = useState<{ date: string; prayed: boolean }[]>([]);

  useEffect(() => {
    function recompute() {
      const morning = new Set(readPrayedDates("morning"));
      const evening = new Set(readPrayedDates("evening"));
      const out: { date: string; prayed: boolean }[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const k = ymd(d);
        out.push({ date: k, prayed: morning.has(k) || evening.has(k) });
      }
      setHits(out);
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:prayer-completed", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:prayer-completed", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const count = hits.filter((h) => h.prayed).length;

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55">
            Rhythm · last 30 days
          </p>
          <p className="mt-0.5 font-sans text-[15px] font-bold text-paper">
            {count} <span className="text-paper/55 font-normal">of 30</span>
          </p>
        </div>
        <Link
          href="/prayers/today"
          className="font-sans text-[12px] text-paper/65 active:text-paper transition-colors"
        >
          Today →
        </Link>
      </div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
      >
        {hits.map((h) => (
          <span
            key={h.date}
            title={`${h.date}${h.prayed ? " · prayed" : ""}`}
            className={
              "block aspect-square rounded-[3px] " +
              (h.prayed
                ? "bg-gold/65 border border-gold/35"
                : "bg-paper/[0.06] border border-paper/[0.04]")
            }
          />
        ))}
      </div>
    </div>
  );
}
