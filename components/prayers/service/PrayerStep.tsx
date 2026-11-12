"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, useReaderPrefs, type ReaderSize } from "@/components/reader/ReaderPrefs";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";
import { stanzasOf } from "@/lib/prayers/lines";
import type { Prayer, PrayerVariant } from "@/lib/prayers/types";
import { textDir } from "@/lib/i18n/textDir";

/**
 * One prayer of a prayer page (1.7): its name, the rubric that says how it is
 * prayed, then its words line by line, as the lyrics of a chant are set in
 * Now Playing (lib/prayers/lines.ts), in the reader's own font and size from
 * the reader settings. Where the faithful make the sign of the Cross, the
 * app's drawn cross stands at the head of that line (the prayer's own rubric
 * says where: lib/prayers/__tests__/cross.test.ts).
 *
 * Nothing is ticked under it since 1.9 (build 89 note 7, his "ok to all" of
 * 2026-11-10): one Amen at the end of the page marks the whole rule prayed
 * (PrayerRuleReader.tsx), and it is still a mark, never a count, a fraction
 * or a bar.
 *
 * Set in the middle of the page since 1.8, as the owner's pick B, Immersive,
 * draws a prayer being prayed (Homebase/boards/purify-master/variants/
 * 05-praying.png): the name, the rubric and the lines centred, the way the
 * lyrics stand in the player. It is a step of the page (`data-step`), which
 * the scroll marks while it is being prayed; the prayers around it step back
 * (app/globals.css, "The rest dim").
 */

/** The lyrics' sizes: a step above the reader's verse sizes, since a prayer page is read standing. */
export const LINE_SIZE: Record<ReaderSize, string> = {
  sm: "text-body md:text-lede",
  md: "text-lede md:text-title-sm",
  lg: "text-title-sm md:text-title",
  xl: "text-title md:text-heading",
};

/**
 * The reader's own face, but never the retired display face: the owner set
 * it aside for Purify ("the font we keep changing"), so a reader who chose it
 * for the Bible is given Lora here.
 */
export function lineFont(font: keyof typeof FONT_CLASSES): string {
  return font === "sans" ? FONT_CLASSES.sans : FONT_CLASSES.serif;
}

export function PrayerStep({
  ruleId,
  prayer,
  title,
  from,
  note,
  contentLang,
  bookmarkable = true,
}: {
  ruleId: string;
  prayer: Prayer;
  /** The prayer's name as shown: the catalog's where the app names it. */
  title: string;
  /** The rule it was brought from, in a reader's own rule. */
  from?: string;
  /** One line over its name, already in the reader's words: why it stands here (a campaign's psalm, 1.9). */
  note?: string;
  contentLang: string;
  /** False for a step that is no prayer of the prayer book (a reader's own names). */
  bookmarkable?: boolean;
}) {
  const { t } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs();
  const variants = prayer.variants ?? [];
  const [variantIdx, setVariantIdx] = useState(0);
  const active: PrayerVariant | undefined = variants.length
    ? variants[Math.min(variantIdx, variants.length - 1)]
    : undefined;
  const wordingBase = `${prayer.id}-wording`;

  // What is shown: the chosen wording when there are several, otherwise the
  // prayer's one text. Wordings are never merged.
  const instruction = active?.instruction ?? prayer.instruction;
  const text = active?.text ?? prayer.text;
  const refrain = active?.refrain ?? prayer.refrain;
  // The marks belong to the prayer's own text, not to another wording.
  const stanzas = text ? stanzasOf(text, active ? [] : (prayer.cross ?? [])) : [];
  const lineClass = cn(lineFont(font), LINE_SIZE[size], "text-paper");
  const leading = { lineHeight: leadingValue ?? 1.5 };
  // Saving one prayer is a long hold on its words (1.9, build 89 note 7): the
  // hold's pill (components/native/PressToCopy.tsx) reads these and offers
  // Save. A step brought from another rule is kept under its own rule.
  const where = prayer.origin ?? { ruleId, prayerId: prayer.id };
  const save = bookmarkable ? { "data-save-rule": where.ruleId, "data-save-prayer": where.prayerId, "data-save-title": title } : {};

  return (
    <section
      id={prayer.id}
      data-step
      {...save}
      aria-labelledby={`${prayer.id}-title`}
      className="relative scroll-mt-16 border-t border-paper/10 py-9 text-center md:scroll-mt-24"
    >
      {from ? <p className="mb-1 font-sans text-caption text-paper/50">{t("prayers.mine.fromRule", { rule: from })}</p> : null}
      {note ? <p className="mb-1 break-words font-sans text-caption text-paper/50">{note}</p> : null}
      <h2
        id={`${prayer.id}-title`}
        tabIndex={-1}
        lang={contentLang}
        dir={textDir(contentLang)}
        className="font-serif text-title-sm font-semibold leading-snug text-paper/90 text-balance focus:outline-none"
      >
        {title}
      </h2>

      {variants.length > 1 ? (
        <SegmentedSwitch
          label={t("prayers.reader.jurisdictionWordings")}
          idBase={wordingBase}
          items={variants.map((v, i) => ({ id: `v${i}`, label: v.jurisdiction, lang: contentLang }))}
          selected={`v${Math.min(variantIdx, variants.length - 1)}`}
          onSelect={(id) => setVariantIdx(Number(id.slice(1)))}
          className="mx-auto mt-4 max-w-[420px]"
        />
      ) : null}

      {instruction ? (
        <p lang={contentLang} dir={textDir(contentLang)} className="mx-auto mt-4 max-w-[46ch] font-serif text-detail italic leading-[1.55] text-paper/55">
          {instruction}
        </p>
      ) : null}

      {stanzas.length ? (
        // One block holds the whole prayer, so a hold copies all of it
        // (lib/ui/pressCopy.ts), and its lines keep the printed breaks.
        <div
          data-copy
          data-prayer-words
          lang={contentLang}
          dir={textDir(contentLang)}
          {...(variants.length > 1
            ? {
                id: `${wordingBase}-panel-v${Math.min(variantIdx, variants.length - 1)}`,
                role: "tabpanel",
                "aria-labelledby": `${wordingBase}-tab-v${Math.min(variantIdx, variants.length - 1)}`,
              }
            : {})}
          className="mt-5 whitespace-pre-line"
          style={leading}
          // The prayer's own words keep their edition's dashes, and say so (lib/ui/__tests__/editionDashes.test.ts).
          data-mock-allow="emdash"
          data-mock-why="the prayer's own words, as its edition prints them"
        >
          {stanzas.map((stanza, s) => (
            <div key={s} className={s > 0 ? "mt-[1.1em]" : undefined}>
              {stanza.map((line, l) => (
                // The first line is where this prayer begins (Easy Scroll rests at every line).
                <span key={l} data-line className={cn("block", l > 0 && "mt-[0.35em]", lineClass)}>
                  {line.cross ? (
                    <Cross
                      size={18}
                      role="img"
                      aria-hidden={false}
                      aria-label={t("prayers.reader.signOfTheCross")}
                      className="me-2 inline-block shrink-0 align-[-0.12em] text-paper/80"
                    />
                  ) : null}
                  {line.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {refrain ? (
        <p data-line lang={contentLang} dir={textDir(contentLang)} className={cn("mt-[1.1em] italic", lineClass, "text-paper/85")} style={leading}>
          {refrain}
        </p>
      ) : null}

      {active ? (
        <p lang={contentLang} dir={textDir(contentLang)} className="mt-4 font-sans text-caption text-paper/50">
          {active.jurisdiction} · {active.source}
        </p>
      ) : prayer.source ? (
        <p className="mt-4 font-sans text-caption text-paper/50">
          {t("prayers.reader.sourceLabel")}{" "}
          <span lang={contentLang} dir={textDir(contentLang)}>
            {prayer.source}
          </span>
        </p>
      ) : null}

      {prayer.audio ? <AudioRow src={prayer.audio} /> : null}
    </section>
  );
}

/**
 * A prayer's own recording, where one ships: the browser's player, so it
 * streams, scrubs and is read aloud by assistive technology for free. No
 * vendor code, no autoplay, no analytics. A file that will not load says so.
 */
function AudioRow({ src }: { src: string }) {
  const { t } = useTranslate();
  const [errored, setErrored] = useState(false);
  if (errored) {
    return <p className="mt-4 font-serif text-detail italic text-paper/45">{t("prayers.reader.audioNotShipped")}</p>;
  }
  return (
    <div className="mt-5 border-t border-paper/10 pt-4">
      <p className="mb-2 font-sans text-caption text-paper/55">{t("prayers.reader.sungChanted")}</p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- chanted prayer audio, no speech track to caption */}
      <audio controls preload="none" src={src} onError={() => setErrored(true)} className="h-8 w-full">
        {t("prayers.reader.audioUnsupported")}
      </audio>
    </div>
  );
}
