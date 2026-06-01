import Link from "next/link";

type Stat = {
  label: string;
  value: string | number;
  href?: string;
  accent?: boolean;
};

/**
 * 2 × 2 grid of stat tiles, used on the /you mobile shell.
 * Each tile carries a number on top and a short label below; an
 * optional href makes the tile a tap target into the detail surface.
 *
 * The "accent" variant tints the number rubric-red so the streak or
 * the most actionable stat reads from across the screen.
 */
export function MobileStatGrid({
  stats,
  cols = 2,
}: {
  stats: Stat[];
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-4" : "grid-cols-2";
  return (
    <div className={"grid gap-3 " + colClass}>
      {stats.map((s, i) => {
        const inner = (
          <>
            <p
              className={
                "font-sans text-title font-bold tabular-nums leading-none " +
                (s.accent ? "text-crimson" : "text-paper")
              }
            >
              {s.value}
            </p>
            <p className="mt-1.5 font-sans text-caption uppercase tracking-[1.5px] text-paper/55">
              {s.label}
            </p>
          </>
        );
        const className =
          "block rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 transition-colors " +
          (s.href ? "hover:bg-paper/[0.06]" : "");
        return s.href ? (
          <Link key={i} href={s.href} className={className}>
            {inner}
          </Link>
        ) : (
          <div key={i} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
