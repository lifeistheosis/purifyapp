"use client";

import Link from "next/link";
import { useState } from "react";

import { PLATE_LIGHT } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintFace } from "@/components/today/SaintFace";
import { cn } from "@/lib/cn";
import { faceLabelSize } from "@/lib/councils/faceLabel";
import type { CouncilFace } from "@/lib/councils/fathers";
import { avifFor } from "@/lib/media/streamed";
import type { SaintPicture } from "@/lib/today/saintFaces";

/**
 * "The Holy Fathers principally associated", one at a time (1.8, the owner's
 * pick of r3-03, C's "Nicaea, at a glance": "I love that design"). The Father
 * shown is a card: his face, his name, his byname and his part at the
 * council, the whole card opening his page where Purify has one. Under it a
 * row of the council's Fathers, a face each with his first name, and a tap on
 * a face shows him; the one shown is lit, ringed in the page's ink with a
 * soft white glow, never gold.
 *
 * A Father with no settled picture (lib/councils/fathers.ts) stands on the
 * plate a book with no cover wears, his name beside it, never a letter and
 * never another saint's face (1.9, build 90 note 3). A council with one
 * Father has no row to choose from.
 */
export function CouncilFathers({ fathers }: { fathers: CouncilFace[] }) {
  const { t } = useTranslate();
  const [shown, setShown] = useState(0);
  if (!fathers.length) return null;
  const f = fathers[Math.min(shown, fathers.length - 1)];

  const inner = (
    // Keyed by the Father, so a new one arrives as the page's own entrance does.
    <span key={f.name} className="cascade flex min-w-0 gap-3.5">
      <FatherFace face={f} shape="portrait" />
      {/* A Father's name, byname and part in the council are English (build 90 note 4). */}
      <span lang="en" dir="ltr" className="block min-w-0 flex-1">
        <span className="block font-serif text-[16px] font-semibold leading-[1.2] text-paper">{f.name}</span>
        {f.byname ? <span className="mt-0.5 block font-sans text-[11.5px] leading-snug text-paper/50">{f.byname}</span> : null}
        <span className="mt-2 block font-sans text-caption leading-[1.45] text-paper/80">{f.role}</span>
      </span>
    </span>
  );
  const card =
    "block rounded-[20px] bg-night-soft p-3.5 shadow-[0_22px_36px_-22px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-paper/8 overflow-hidden";

  return (
    <section aria-labelledby="council-fathers" data-council-fathers="" className="mt-7">
      <h2 id="council-fathers" className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-paper">
        {t("study.councils.fathersAssociated")}
      </h2>
      <div className="mt-3" aria-live="polite">
        {f.href ? (
          <Link href={f.href} prefetch={false} className={cn("press-card", card)}>
            {inner}
          </Link>
        ) : (
          <div className={card}>{inner}</div>
        )}
      </div>
      {fathers.length > 1 ? (
        <ul className="mt-4 grid grid-cols-6 gap-y-3 md:max-w-[440px]" aria-label={t("study.councils.fathersAssociated")}>
          {fathers.map((x, i) => {
            const on = i === shown;
            return (
              // A size container, so the word under the face is sized to its column and never cut.
              <li key={x.name} className="@container min-w-0">
                <button
                  type="button"
                  aria-pressed={on}
                  lang="en"
                  dir="ltr"
                  aria-label={x.name}
                  onClick={() => setShown(i)}
                  data-father-face={on ? "shown" : ""}
                  className="tap-press flex w-full flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                >
                  <span
                    className={cn(
                      "block rounded-full motion-safe:transition-shadow motion-safe:duration-200",
                      on
                        ? "shadow-[0_0_0_2px_var(--color-night),0_0_0_3.5px_var(--color-paper),0_0_18px_3px_rgb(255_255_255/0.3)]"
                        : "shadow-[0_0_0_1px_rgb(255_255_255/0.12)]",
                    )}
                  >
                    <FatherFace face={x} shape="round" />
                  </span>
                  <span
                    aria-hidden
                    data-father-label=""
                    className={cn(
                      "block whitespace-nowrap font-sans text-[10.5px] font-semibold leading-tight motion-safe:transition-colors motion-safe:duration-200",
                      on ? "text-paper" : "text-paper/50",
                    )}
                    style={{ fontSize: faceLabelSize(x.label) }}
                  >
                    {x.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * A Father's face, as a portrait for the card or a round to tap (1.9, build
 * 90 note 3; his words: "the profile pictures of the Holy Fathers principally
 * associated either don't show, or they do show and it's not framed
 * correctly"). It stands on the plate a book with no cover wears (the
 * reading room's own light, PLATE_LIGHT), and his settled picture comes over
 * it as it arrives, drawn by the house's one framed face
 * (components/today/SaintFace.tsx): cut about his face where his picture has
 * him to one side (`across`, lib/today/saintFaces.ts faceShift), and never
 * mirrored in Arabic, as a picture is not. With no signal a portrait the
 * website streams gives way to the icon the app carries of him, where its
 * rights are settled (lib/councils/fathers.ts, `fallback`); when nothing can
 * be had, or he has no settled picture, the plate is what is seen, his name
 * beside it. Never a letter, never another saint's face (the owner's yes).
 * Either way a dark island, as a cover is, on every palette.
 */
export function FatherFace({ face, shape }: { face: Pick<CouncilFace, "picture">; shape: "portrait" | "round" }) {
  const box = shape === "portrait" ? "h-32 w-24 rounded-[12px]" : "size-11 rounded-full";
  const p = face.picture;
  const picture: SaintPicture | null = p
    ? { kind: "cover", src: p.src, avif: avifFor(p.src), fallback: p.fallback?.src ?? null, focusY: p.focusY }
    : null;
  return (
    <span
      aria-hidden
      dir="ltr"
      className={cn(
        "dark-island relative block shrink-0 overflow-hidden bg-night shadow-[0_10px_20px_-10px_rgba(0,0,0,0.9)]",
        box,
      )}
    >
      <span data-father-plate="" className="absolute inset-0 rounded-[inherit]" style={{ backgroundImage: PLATE_LIGHT }} />
      {picture ? (
        <SaintFace key={picture.src} picture={picture} zoom={shape === "round" ? 1.9 : 1.4} across={p?.across} className="absolute inset-0" />
      ) : null}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
    </span>
  );
}
