import Link from "next/link";

/**
 * Final card in the mobile Today timeline: the Pascha countdown.
 * Same card shape, with a small three-bar cross above the count.
 */
export function PaschaCountdownCard({
  daysAway,
  label,
  eyebrow = "Pascha",
}: {
  daysAway: number;
  label: string;
  eyebrow?: string;
}) {
  const primary =
    daysAway === 0
      ? "Today"
      : daysAway > 0
      ? `${daysAway} days`
      : "Passed";
  return (
    <Link
      href="/calendar"
      className="flex items-center gap-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 transition-colors hover:bg-paper/[0.06]"
    >
      <ThreeBarCross />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-caption text-paper/55">{eyebrow}</p>
        <h3 className="mt-0.5 font-serif text-lede leading-[1.2] text-paper">
          {primary}
        </h3>
        <p className="mt-0.5 font-sans text-caption text-paper/55">{label}</p>
      </div>
    </Link>
  );
}

function ThreeBarCross() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="text-gold/80 shrink-0"
      aria-hidden
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
