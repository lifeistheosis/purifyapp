import Link from "next/link";
import type { FastKind } from "@/lib/calendar/orthodox";

/**
 * Third card in the mobile Today timeline: today's fast in plain words.
 * Mirrors the reference's card shape (eyebrow + bold title + short body).
 * Links to /calendar where the toggle and the full menologion live.
 */
export function FastTodayCard({
  fast,
  eyebrow = "The Fast",
}: {
  fast: { kind: FastKind; label: string; rule: string };
  eyebrow?: string;
}) {
  const dot: Record<FastKind, string> = {
    strict: "bg-crimson",
    "wine-oil": "bg-gold",
    fish: "bg-sage",
    fast: "bg-paper/40",
    "fast-free": "bg-emerald-400",
    normal: "bg-paper/30",
  };
  return (
    <Link
      href="/calendar"
      className="block rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5 transition-colors hover:bg-paper/[0.06]"
    >
      <p className="font-sans text-caption text-paper/55">{eyebrow}</p>
      <h3 className="mt-1 font-serif text-ui leading-[1.2] text-paper">
        {fast.label}
      </h3>
      <p className="mt-2 flex items-center gap-2 font-sans text-detail text-paper/70">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dot[fast.kind]}`} />
        <span>{fast.rule}</span>
      </p>
    </Link>
  );
}
