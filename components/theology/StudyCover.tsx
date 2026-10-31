"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintFace } from "@/components/today/SaintFace";
import { Book } from "@/components/ui/icons/Book";
import { Share } from "@/components/ui/icons/Share";
import { isNativeClient } from "@/lib/platform/native";
import { COVER_LINES, COVER_TEXT, type DeckPassage } from "@/lib/theology/page";
import { saintPicture } from "@/lib/today/saintFaces";
import { useMounted } from "@/lib/useMounted";

import { PassagePicture, ReadSource } from "./PassageTools";
import { WholeIcon } from "./WholeIcon";
import { useFolds } from "./useFolds";

const PILL =
  "tap-press hit-44 inline-flex h-[34px] items-center gap-[7px] rounded-pill border border-paper/22 bg-night/45 px-3 font-sans text-[12.5px] font-semibold text-paper";

/**
 * A doctrine's cover (1.8, round 3 r3-13, B's "a Father's words as the
 * cover" in the owner's hybrid of B and C): his portrait above his words, so
 * the page is already the picture it shares; under them Read where it's from
 * and Share as a picture. The words are the study's epigraph, the editors'
 * pick where one is set, else its first passage (lib/theology/page.ts,
 * epigraphIndex), verbatim, with his name, the work and the place.
 *
 * Behind it, the icon of the study's subject whole in its own light: all
 * that shows when he has no portrait whose rights are recorded, or it cannot
 * be had (no signal), so the cover is never empty. The portrait is asked of
 * the website in the apps, so it is chosen on the device. On a phone the
 * cover starts under the clear bar.
 */
export function StudyCover({ subject, passage }: { subject: { src: string }; passage: DeckPassage | null }) {
  const { t } = useTranslate();
  const onDevice = useMounted();
  const native = onDevice && isNativeClient();
  const [sharing, setSharing] = useState(false);
  const words = useRef<HTMLElement>(null);
  useFolds(words, passage?.text);
  // His portrait only, never the icon the app carries: a standing figure,
  // too narrow to fill a cover.
  const portrait = onDevice && passage?.saintSlug ? saintPicture({ slug: passage.saintSlug }, native) : null;

  return (
    <>
      <div data-study-cover="" className="study-cover saint-icon-in under-topbar relative -mx-5 overflow-hidden md:mx-0 md:rounded-[18px]">
        <WholeIcon src={subject.src} eager className="study-cover-picture absolute inset-0 h-full w-full" />
        {portrait?.kind === "cover" ? (
          <span className="study-cover-picture absolute inset-0 overflow-hidden">
            <SaintFace key={portrait.src} picture={{ ...portrait, fallback: null }} />
          </span>
        ) : null}
        {/* The clock and the bar's plates stay readable over the picture. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/55 to-transparent md:hidden" />
      </div>

      {passage ? (
        <figure ref={words} data-study-epigraph="" className="study-cover-words relative px-3 text-center">
          <blockquote
            lang="en"
            data-card-words=""
            className="post-fold doctrine-shadow font-serif font-medium text-paper"
            style={
              {
                fontSize: COVER_TEXT.size,
                lineHeight: COVER_TEXT.lineHeight,
                "--fold-lines": COVER_LINES,
                "--fold-lead": COVER_TEXT.lineHeight,
              } as CSSProperties
            }
          >
            {passage.text}
          </blockquote>
          <div aria-hidden className="mx-auto mt-3 h-[1.5px] w-[30px] bg-paper/75" />
          <figcaption>
            <span lang="en" className="mt-[9px] block font-sans text-[9.5px] font-bold uppercase tracking-[0.16em] text-paper/82">
              {passage.saintSlug ? (
                <Link href={`/saints/${passage.saintSlug}`} prefetch={false} className="hover:text-paper">
                  {passage.name}
                </Link>
              ) : (
                passage.name
              )}
            </span>
            {passage.work || passage.place ? (
              <span lang="en" className="mt-1 block font-sans text-[11px] leading-[1.35] text-paper/55">
                {passage.work}
                {passage.work && passage.place ? <br /> : null}
                {passage.place}
              </span>
            ) : null}
            {passage.inexact ? <span className="mt-1 block font-sans text-[10.5px] text-paper/45">{t("cite.inexact")}</span> : null}
          </figcaption>
          <div data-quote-tools="" className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {passage.source ? (
              <ReadSource source={passage.source} className={PILL}>
                <Book size={15} />
                {t("today.saintWords.readSource")}
              </ReadSource>
            ) : null}
            <button type="button" data-quote-share="" onClick={() => setSharing(true)} className={PILL}>
              <Share size={14} />
              {t("today.verse.shareAsPicture")}
            </button>
          </div>
        </figure>
      ) : null}

      {passage ? <PassagePicture passage={passage} open={sharing} onClose={() => setSharing(false)} onDevice={onDevice} native={native} /> : null}
    </>
  );
}
