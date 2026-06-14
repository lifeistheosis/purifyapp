import { getVerseOfDay } from "@/lib/today/verseOfDay";
import { VerseCardActions } from "./VerseCardActions";

/**
 * Verse-of-the-day card on the mobile Today shell.
 *
 * Dark card with a faint warm candle-glow bleeding from the lower right,
 * a small label, a bold reference, and the verse text in a large serif
 * treatment that fades to transparent at the bottom (mask). Bottom: a
 * quiet two-action footer (Save + overflow) handled by the small client
 * island VerseCardActions.
 *
 * Verse text is rendered server-side from Purify's public-domain Bible
 * (Brenton LXX / KJV) via lib/today/verseOfDay.ts. No copyrighted
 * translation is reproduced anywhere on this surface.
 */
export async function VerseOfDayCard({
  labelTop = "Verse of the Day",
}: {
  labelTop?: string;
}) {
  const vod = await getVerseOfDay();
  const text = vod.passage?.verses
    .map((v) => v.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <article
      className="relative overflow-hidden rounded-[20px] border border-paper/10 p-5 pt-5"
      style={{
        background:
          "radial-gradient(130% 90% at 82% 92%, rgba(212,175,55,0.08) 0%, transparent 56%), linear-gradient(180deg, #161109 0%, #0a0706 100%)",
      }}
    >
      {/* Soft wave shape at lower-right, owned SVG */}
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-50"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 80 120, 160 200, 240 150 S 400 120, 400 160 L 400 200 L 0 200 Z"
          fill="rgba(10,7,6,0.85)"
        />
      </svg>

      <div className="relative">
        {/* Eyebrow row: label + a small owned three-bar cross anchoring
            this as the day's word, with the kind chip on the right. */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
            <ThreeBarCross />
            {labelTop}
          </span>
          {vod.source !== "rotation" && (
            <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.05] px-2.5 py-[2px] font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/60">
              {vod.source === "gospel"
                ? "Gospel"
                : vod.source === "epistle"
                  ? "Epistle"
                  : "OT"}
            </span>
          )}
        </div>

        <p className="mt-3 font-sans text-detail font-semibold tracking-[0.01em] text-paper/80">
          {vod.ref.label}
        </p>

        <div
          className="mt-2 font-serif text-title-sm leading-[1.32] text-paper/95"
          style={{
            // Fade the body to transparent near the bottom so it reads
            // as a teaser, the full chapter is one tap away via Expand.
            WebkitMaskImage:
              "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
            maskImage:
              "linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)",
            maxHeight: "188px",
            overflow: "hidden",
          }}
        >
          {text ?? <span className="text-paper/45 italic">Loading verse…</span>}
        </div>

        <VerseCardActions
          refLabel={vod.ref.label}
          href={vod.href}
          shareText={text ?? vod.ref.label}
          shareUrl={vod.href}
          book={vod.ref.book}
          bookName={vod.passage?.name ?? vod.ref.book}
          chapter={vod.ref.chapter}
          verse={vod.ref.from}
        />
      </div>
    </article>
  );
}

function ThreeBarCross() {
  return (
    <svg
      width={11}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="shrink-0"
      aria-hidden
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
