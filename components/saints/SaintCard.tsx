import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "./SaintIcon";
import { T } from "@/components/i18n/T";

export function SaintCard({ saint }: { saint: Saint }) {
  return (
    <Link
      href={`/saints/${saint.slug}`}
      // No prefetch. Next prefetches every <Link> that enters the viewport,
      // and this card renders once per saint in a grid that can hold the full
      // 1,093-entry set. Scrolling the index therefore fires a continuous
      // stream of RSC fetches for lives the reader has not asked for, on the
      // same main thread that is trying to scroll. In the bundled Android app
      // there is no network latency for that prefetch to hide: the page is
      // already on the device, so the tap is fast either way.
      prefetch={false}
      // `press-card` owns the transition (transform + color + background on
      // the house curve), so the old `transition-all` is gone: it animated
      // every animatable property including layout ones, and the card had no
      // press response at all on a phone, where there is no hover.
      className="press-card group block rounded-lg bg-night border border-paper/8 p-5 hover:border-paper/25"
    >
      <div className="flex gap-5">
        <SaintIcon saint={saint} size="md" />
        <div className="min-w-0 flex flex-col">
          {saint.byname && (
            <p className="font-serif text-detail italic text-gold/90 mb-1 line-clamp-1">
              &ldquo;{saint.byname}&rdquo;
            </p>
          )}
          <h3 className="font-sans text-lede font-semibold text-paper leading-tight">
            {saint.name}
          </h3>
          <p className="font-sans text-detail text-paper/55 mt-1.5 line-clamp-1">
            {saint.epithet}
          </p>
          <p className="mt-3 font-sans text-ui text-paper/70 leading-relaxed line-clamp-3">
            {saint.shortBio}
          </p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-paper/8 flex items-center justify-between gap-3 text-caption">
        <span className="font-sans font-semibold uppercase tracking-[1.2px] text-paper/45">
          <T k="saints.feastLabel" /> {saint.feastDays[0]}
        </span>
        <span className="font-sans text-paper/55 tabular-nums">
          <T k="saints.workCount" count={saint.works.length} />
        </span>
        <span className="font-sans text-paper/45 group-hover:text-paper transition-colors duration-150">
          <T k="saints.read" /> →
        </span>
      </div>
    </Link>
  );
}
