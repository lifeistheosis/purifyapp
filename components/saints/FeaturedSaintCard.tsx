import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "./SaintIcon";

/** Distinguished full-width card for the featured saint (the Theotokos),
 *  pinned above the saints grid. */
export function FeaturedSaintCard({ saint }: { saint: Saint }) {
  return (
    <Link
      href={`/saints/${saint.slug}`}
      className="group block rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.08] via-night to-night p-6 md:p-8 hover:border-gold/55 transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row items-start gap-6 md:gap-8">
        <SaintIcon
          saint={saint}
          size="lg"
          className="ring-2 ring-gold/40 shadow-[0_0_36px_rgba(212,175,55,0.18)]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
            The Mother of God
          </p>
          {saint.byname && (
            <p className="font-serif text-ui italic text-gold/90 mb-1">
              &ldquo;{saint.byname}&rdquo;
            </p>
          )}
          <h3 className="font-sans text-title md:text-heading font-bold text-paper leading-[1.05] tracking-[-0.02em]">
            {saint.name}
          </h3>
          <p className="font-sans text-ui text-paper/60 mt-1.5">
            {saint.epithet}
          </p>
          <p className="mt-4 max-w-[640px] font-sans text-ui text-paper/75 leading-relaxed">
            {saint.shortBio}
          </p>
          {saint.titles?.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {saint.titles.slice(0, 4).map((t) => (
                <li
                  key={t}
                  className="rounded-pill border border-gold/25 px-3 py-1 font-sans text-caption text-paper/70"
                >
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-5 font-sans text-ui font-medium text-gold group-hover:text-gold/80 transition-colors duration-150">
            Read her life →
          </p>
        </div>
      </div>
    </Link>
  );
}
