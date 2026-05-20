import Link from "next/link";

type Pick = {
  name: string;
  subtitle: string;
  href: string;
};

const PICKS: Pick[] = [
  { name: "John", subtitle: "the spiritual gospel", href: "/bible/john/1" },
  { name: "Psalms", subtitle: "the prayer book of the Church", href: "/bible/psalms/1" },
  { name: "Genesis", subtitle: "in the beginning", href: "/bible/genesis/1" },
  { name: "Matthew", subtitle: "the kingdom of heaven", href: "/bible/matthew/1" },
  { name: "Romans", subtitle: "the gospel of grace", href: "/bible/romans/1" },
  { name: "1 Cor 13", subtitle: "love is patient", href: "/bible/1-corinthians/13" },
];

/**
 * Horizontal "Start here" strip above the OT/NT grid on /bible. Curated
 * entry points for readers who don't know where to begin. Scrolls
 * horizontally on mobile, lays out in a row on tablet+.
 */
export function StartHereStrip() {
  return (
    <section className="px-5 md:px-8 pt-2 pb-10 md:pb-14 bg-night border-t border-white/5">
      <div className="mx-auto max-w-[1080px] w-full">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Start here
        </p>
        <div className="-mx-5 md:mx-0">
          <div className="flex gap-2.5 overflow-x-auto snap-x px-5 md:px-0 pb-2 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PICKS.map((p) => (
              <Link
                key={p.name}
                href={p.href}
                className="shrink-0 snap-start min-w-[180px] md:min-w-0 rounded-lg border border-gold/25 bg-gold/[0.04] hover:bg-gold/[0.10] hover:border-gold/55 transition-colors px-4 py-3.5"
              >
                <span className="block font-sans text-[15px] font-semibold text-paper leading-tight">
                  {p.name}
                </span>
                <span className="block font-serif italic text-[12.5px] text-paper/60 mt-1 leading-tight">
                  {p.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
