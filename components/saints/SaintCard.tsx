import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "./SaintIcon";

export function SaintCard({ saint }: { saint: Saint }) {
  return (
    <Link
      href={`/saints/${saint.slug}`}
      className="group block rounded-lg bg-night border border-paper/8 p-5 hover:border-paper/25 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex gap-5">
        <SaintIcon saint={saint} size="md" />
        <div className="min-w-0 flex flex-col">
          {saint.byname && (
            <p className="font-serif text-[13px] italic text-gold/90 mb-1 line-clamp-1">
              &ldquo;{saint.byname}&rdquo;
            </p>
          )}
          <h3 className="font-sans text-[18px] font-semibold text-paper leading-tight">
            {saint.name}
          </h3>
          <p className="font-sans text-[13px] text-paper/55 mt-1.5 line-clamp-1">
            {saint.epithet}
          </p>
          <p className="mt-3 font-sans text-[14px] text-paper/70 leading-relaxed line-clamp-3">
            {saint.shortBio}
          </p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-paper/8 flex items-center justify-between gap-3 text-[12px]">
        <span className="font-sans font-semibold uppercase tracking-[1.2px] text-paper/45">
          Feast {saint.feastDays[0]}
        </span>
        <span className="font-sans text-paper/55 tabular-nums">
          {saint.works.length} {saint.works.length === 1 ? "work" : "works"}
        </span>
        <span className="font-sans text-paper/45 group-hover:text-paper transition-colors duration-150">
          Read →
        </span>
      </div>
    </Link>
  );
}
