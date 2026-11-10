"use client";

import Link from "next/link";
import { useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Cross } from "@/components/ui/icons/Cross";
import type { ShownCite } from "@/lib/citations/cite";
import { cn } from "@/lib/cn";
import { getLocale } from "@/lib/i18n/locales";
import { avifFor } from "@/lib/media/streamed";
import type { QuoteFace } from "@/lib/share/verseCard";
import { BAND_PORTRAIT, standsOn } from "@/lib/today/saintFaces";

import { FacePortrait } from "./FacePortrait";
import { ShareMark } from "./SaintWindow";

/** Words this long are set a step smaller, as his window set them, so a long saying does not make a tower of the band. */
export const LONG_WORDS = 180;

type Props = {
  /** "Today's Saint", "From the Desert Fathers". */
  eyebrow: string;
  /** The saint's name under the eyebrow; his page, which a tap anywhere on the band opens. */
  name?: { text: string; href: string } | null;
  /** The words as they are set: the saint's in quotation marks, a saying as it stands. */
  words: string;
  /** Who said them, under the words, where the band does not name him above. */
  who?: string | null;
  /** The line every quotation wears, opening the words where they stand. */
  cite: ShownCite | null;
  /** His face, or null for the lit cross. */
  face: QuoteFace | null;
  /** Share as a picture. */
  onShare: () => void;
  /** Names the share button for the export walk. */
  shareMark: "data-saint-share" | "data-saying-share";
} & { [attribute: `data-${string}`]: string | undefined };

/**
 * A quote standing with its speaker (1.8, round 3 r3-21, the owner's pick A,
 * "The face beside the words", his "Let's do A, the face beside the word."
 * of 2026-10-31; BUILD-80-NOTES 64). Today's saint's words and the Desert
 * Fathers' saying share it: the words whole in Lora, the speaker's portrait
 * beside them on the side he looks from (lib/today/saintFaces.ts, standsOn),
 * the source line that opens the words where they stand, and the share mark
 * that makes the picture. A speaker with no face the app may show keeps the
 * band, with the lit cross where he would stand and the words across it,
 * never a stand-in face.
 *
 * The quote is a card worth sharing, as the owner asks of every quote: Share
 * as a picture at its corner, and the tap to its source on the source line.
 * Where the band names a saint, a tap anywhere else on it opens his page, as
 * the band did before it had words, by the link on his name reaching over the
 * band (.today-band-link in app/globals.css); a saying asks nothing more, as
 * its card never did.
 *
 * Drawn in the palette's own tokens, so every palette re-inks it; the soft
 * light round him is left out on Parchment, where white cannot glow.
 */
export function SpeakerBand({ eyebrow, name, words, who, cite, face, onShare, shareMark, ...attributes }: Props) {
  const { t, locale } = useTranslate();
  // His picture could not be had at all: the band takes its form for no face.
  const [faceless, setFaceless] = useState(false);
  const shown = face && !faceless ? face : null;
  const side = shown ? standsOn(shown.looks, getLocale(locale).dir === "rtl") : null;
  const long = words.length > LONG_WORDS;

  return (
    <article
      {...attributes}
      data-face={side ?? "none"}
      // The band is placed by the face, not by the line: the portrait stands on
      // the side the speaker looks from in every language (standsOn), so the
      // mirror check of scripts/mock-check.mjs is told why it does not turn.
      data-mock-allow="mirror"
      data-mock-why="the portrait stands on the side the speaker looks from, in every language (lib/today/saintFaces.ts, standsOn)"
      className="today-band relative isolate overflow-hidden rounded-[18px] bg-night-deep text-start"
      style={side ? { minHeight: BAND_PORTRAIT.minHeight } : undefined}
    >
      {shown && side ? (
        <FacePortrait
          key={shown.src}
          face={{
            src: shown.src,
            avif: avifFor(shown.src),
            point: shown.point,
            fallback: shown.fallback ? { src: shown.fallback.src, point: shown.fallback.point } : null,
          }}
          side={side}
          onGone={() => setFaceless(true)}
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "today-band-glow pointer-events-none absolute -z-10 size-[280px] rounded-full",
          side === "right" ? "left-[120px] -top-[90px]" : side === "left" ? "-left-[30px] -top-[90px]" : "-start-[100px] -top-[130px]",
        )}
      />

      <div className={cn(side === "right" ? "mr-auto w-[58%] pb-4 pl-4 pr-3 pt-3.5" : side === "left" ? "ml-auto w-[55%] pb-4 pl-1 pr-4 pt-3.5" : "px-4 pb-[17px] pt-4")}>
        {side ? (
          <span className="block font-sans text-caption font-semibold text-paper/55">{eyebrow}</span>
        ) : (
          <span className="flex items-center gap-[9px] pe-10">
            <span aria-hidden data-band-cross="" className="verse-cross-lit inline-flex text-paper">
              <Cross size={20} />
            </span>
            <span className="font-sans text-caption font-semibold text-paper/55">{eyebrow}</span>
          </span>
        )}
        {name ? (
          <Link href={name.href} lang="en" dir="ltr" className="today-band-link mt-0.5 block font-heading text-lede font-bold leading-tight text-paper">
            {name.text}
          </Link>
        ) : null}
        <blockquote
          lang="en" dir="ltr"
          data-band-words=""
          className={cn(
            "font-heading italic font-medium text-paper/90",
            long ? "text-[15px] leading-[1.42]" : "text-[16px] leading-[1.44]",
            side ? "mt-2" : "mt-2.5 pe-5",
          )}
        >
          {words}
        </blockquote>
        {who ? <p className="mt-[9px] font-sans text-detail font-semibold leading-[1.3] text-paper/80">{who}</p> : null}
        {cite ? <SourceLine cite={cite} className={cn("relative z-[1] mt-1 text-[12.5px]", side === "left" && "pr-8")} /> : null}
      </div>

      <button
        type="button"
        onClick={onShare}
        aria-label={t("today.verse.shareAsPicture")}
        aria-haspopup="dialog"
        data-saint-share={shareMark === "data-saint-share" ? "" : undefined}
        data-saying-share={shareMark === "data-saying-share" ? "" : undefined}
        className={cn(
          "tap-press hit-44 absolute z-[1] grid size-[30px] place-items-center rounded-full bg-night/55 text-paper",
          side ? "bottom-2.5 right-2.5" : "end-2.5 top-2.5",
        )}
      >
        <ShareMark size={15} />
      </button>
    </article>
  );
}
