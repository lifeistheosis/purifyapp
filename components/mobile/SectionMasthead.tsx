import { sectionMedia, type SectionKey } from "@/lib/media/sections";

/**
 * The photographic masthead for a mobile section.
 *
 * The mobile shells were built entirely out of SVG glyphs on grey gradients.
 * This is the one place a real Orthodox image enters each surface.
 *
 * Redrawn for 1.5.2 (the owner, 2026-10-05: "I want the images that are
 * displayed to ... either have a better design or to have better images").
 * It was a band the full width of the screen with a dark wash over its lower
 * two thirds and a line of grey credit under it:
 *
 *   - It is a plate now: set in from the screen's edges, with the round
 *     corners, hairline and shadow of every other card on these screens, so
 *     the picture reads as part of the page and not as a strip laid over it.
 *     (The Discover loading screen always drew it this way; the page itself
 *     did not, so the picture jumped wider as it arrived.)
 *   - The wash covers only the foot of the picture, where the words sit. It
 *     used to start at the top, which dimmed gold grounds to brown and blacked
 *     out whatever was in the lower half: on Prayers, the face.
 *   - The credit is inside the plate, at its foot.
 *
 * Two shapes, chosen by the picture (lib/media/sections.ts):
 *
 *   wide      a 16:9 plate, the picture filling it, the eyebrow at its foot.
 *   portrait  an icon. A panel painting is tall and its subject is a face,
 *             and a wide crop of one cuts that face (the Prayers plate until
 *             1.5.2 ended at the beard). So the icon stands whole at the side
 *             of the plate, in the warm light the shop gives a piece, and the
 *             section's own words stand beside it (`children`).
 *
 * Rights: the image and its credit both come from `lib/media/sections.ts`,
 * which is rights-checked by `lib/media/__tests__/sections.test.ts`. The
 * credit line is rendered, not optional, so an attribution license stays
 * satisfied without anyone remembering to add it. Same `work · artist ·
 * license` form the history hero uses.
 *
 * A section with no registry entry renders nothing, so this can be adopted
 * one surface at a time.
 *
 * There is deliberately no `title` prop. It used to render an <h1> over the
 * plate, and MobileShell's header already carries the surface's h1, so
 * Discover and Reading announced themselves twice before the reader had
 * read anything. The name of the surface belongs to the header bar.
 * lib/ui/__tests__/oneH1.test.ts holds this.
 */
export function SectionMasthead({
  section,
  eyebrow,
  children,
}: {
  section: SectionKey;
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const media = sectionMedia(section);
  if (!media) return null;

  const credit = (
    <figcaption className="font-sans text-[10px] leading-snug text-paper/50">
      {media.work} · {media.artist} · {media.license}
    </figcaption>
  );

  if (media.portrait) {
    return (
      <figure className="icon-niche relative mb-6 overflow-hidden rounded-[26px] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-paper/10">
        <div className="flex items-stretch gap-4 p-4">
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
            <div>
              {eyebrow ? (
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85">
                  {eyebrow}
                </p>
              ) : null}
              {children}
            </div>
            {credit}
          </div>
          {/* Plain <img>: the Android build sets images.unoptimized, so
              next/image would degrade to this anyway, and this keeps the
              native shell and the web on one code path. The file's own
              size is given so the plate holds its height before it loads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            className="h-auto w-[42%] max-w-[176px] shrink-0 self-center rounded-[18px] object-cover shadow-[0_14px_28px_-12px_rgba(0,0,0,0.85)] ring-1 ring-premium/35"
          />
        </div>
      </figure>
    );
  }

  return (
    <figure className="relative mb-6 overflow-hidden rounded-[26px] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-paper/10">
      <div className="relative aspect-[16/9] w-full">
        {/* Plain <img>, for the reason above. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: media.focus ?? "center" }}
        />
        {/* The wash: the foot of the plate only, under the words. The top
            half of the picture is left exactly as it was painted. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-night/95 from-0% via-night/45 via-[26%] to-transparent to-[58%]"
        />
        <div className="absolute inset-x-4 bottom-3 space-y-1">
          {eyebrow ? (
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/90">
              {eyebrow}
            </p>
          ) : null}
          {children}
          {credit}
        </div>
      </div>
    </figure>
  );
}
