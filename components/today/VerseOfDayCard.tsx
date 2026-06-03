import { getVerseOfDay } from "@/lib/today/verseOfDay";
import { VerseCardActions } from "./VerseCardActions";

/**
 * Verse-of-the-day card on the mobile Today shell.
 *
 * Dark card with a warm rust radial-gradient backdrop bleeding from the
 * lower right, a small label, a bold reference, and the verse text in a
 * large serif treatment that fades to transparent at the bottom (mask).
 * Bottom: a 4-action footer (favourite, share, more, expand) handled by
 * the small client island VerseCardActions.
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
      className="relative overflow-hidden rounded-2xl border border-paper/10 p-4 pt-4"
      style={{
        background:
          "radial-gradient(120% 80% at 80% 90%, rgba(193,39,45,0.20) 0%, transparent 60%), linear-gradient(180deg, #18120f 0%, #0a0606 100%)",
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
          fill="rgba(20,8,8,0.85)"
        />
      </svg>

      <div className="relative">
        <p className="font-sans text-detail text-paper/65">
          {labelTop}
          {vod.source !== "rotation" && (
            <span className="ml-2 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.04] px-2 py-[1px] font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/60 align-middle">
              {vod.source === "gospel"
                ? "Gospel"
                : vod.source === "epistle"
                  ? "Epistle"
                  : "OT"}
            </span>
          )}
        </p>
        <p className="mt-0.5 font-sans text-ui font-bold text-paper">
          {vod.ref.label}
        </p>

        <div
          className="mt-3 font-serif text-lede leading-[1.4] text-paper/95"
          style={{
            // Fade the body to transparent near the bottom so it reads
            // as a teaser, the full chapter is one tap away via Expand.
            WebkitMaskImage:
              "linear-gradient(180deg, #000 0%, #000 65%, transparent 100%)",
            maskImage:
              "linear-gradient(180deg, #000 0%, #000 65%, transparent 100%)",
            maxHeight: "160px",
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
