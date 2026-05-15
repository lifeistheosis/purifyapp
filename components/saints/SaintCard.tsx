import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";

export function SaintCard({ saint }: { saint: Saint }) {
  const initials = saint.name
    .replace(/^St\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <Link
      href={`/saints/${saint.slug}`}
      className="group block rounded-lg bg-night border border-paper/8 p-6 hover:border-paper/25 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 h-14 w-14 rounded-pill bg-paper/10 flex items-center justify-center font-serif text-[20px] text-paper/90">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-sans text-[18px] font-semibold text-paper leading-tight">
            {saint.name}
          </h3>
          <p className="font-sans text-[13px] text-paper/55 mt-1 line-clamp-1">
            {saint.epithet}
          </p>
        </div>
      </div>
      <p className="mt-5 font-sans text-[14px] text-paper/70 leading-relaxed line-clamp-3">
        {saint.shortBio}
      </p>
      <div className="mt-5 pt-4 border-t border-paper/8 flex items-center justify-between text-[12px]">
        <span className="font-sans font-semibold uppercase tracking-[1.2px] text-paper/45">
          Feast {saint.feastDays[0]}
        </span>
        <span className="font-sans text-paper/45 group-hover:text-paper transition-colors duration-150">
          Read →
        </span>
      </div>
    </Link>
  );
}
