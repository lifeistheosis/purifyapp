import { sectionMedia, type SectionKey } from "@/lib/media/sections";

/**
 * The photographic masthead for a mobile section.
 *
 * The mobile shells were built entirely out of SVG glyphs on grey gradients.
 * This is the one place a real Orthodox image enters each surface: a wide
 * plate under the section header, scrimmed at the bottom so the title sitting
 * over it stays legible on any frame.
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
 * read anything. The plate keeps its eyebrow and its credit; the name of
 * the surface belongs to the header bar. lib/ui/__tests__/oneH1.test.ts
 * holds this.
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

  return (
    <figure className="relative -mx-5 mb-6 overflow-hidden">
      <div className="relative aspect-[16/9] w-full">
        {/* Plain <img>: the Android build sets images.unoptimized, so
            next/image would degrade to this anyway, and this keeps the
            native shell and the web on one code path. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: media.focus ?? "center" }}
        />
        {/* Scrim: the title sits on the lower third, and these images run
            from gold ground to dark mosaic, so the gradient is what keeps
            the type readable rather than luck. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/10"
        />
        <div className="absolute inset-x-5 bottom-4">
          {eyebrow ? (
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85">
              {eyebrow}
            </p>
          ) : null}
          {children}
        </div>
      </div>
      <figcaption className="px-5 pt-2 font-sans text-[10px] leading-snug text-paper/35">
        {media.work} · {media.artist} · {media.license}
      </figcaption>
    </figure>
  );
}
