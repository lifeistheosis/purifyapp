import { ScriptureAttribution } from "./ScriptureAttribution";
import { Fums } from "./Fums";
import type { LicensedChapter } from "@/lib/bible/api-bible";

/**
 * Renders a licensed translation (NKJV/NIV/NLT) exactly as API.Bible delivers
 * it: the chapter HTML is shown verbatim (footnotes included), with no
 * Strong's/interlinear/word-tagging overlay (content integrity), followed by
 * the required attribution and FUMS tracker.
 */
export function LicensedChapterReader({
  chapter,
  transId,
  translationLabel,
}: {
  chapter: LicensedChapter;
  transId: string;
  translationLabel: string;
}) {
  return (
    <article>
      <div
        className={[
          "font-serif text-[18px] md:text-[19px] leading-[1.85] text-paper/90",
          // Section headings within the passage
          "[&_.s1]:font-sans [&_.s1]:text-[13px] [&_.s1]:font-semibold [&_.s1]:uppercase [&_.s1]:tracking-[1.5px] [&_.s1]:text-paper/55 [&_.s1]:mt-8 [&_.s1]:mb-3",
          "[&_.s2]:font-sans [&_.s2]:text-[12px] [&_.s2]:uppercase [&_.s2]:tracking-[1.2px] [&_.s2]:text-paper/45 [&_.s2]:mt-6 [&_.s2]:mb-2",
          // Paragraphs
          "[&_p]:mb-4",
          // Verse numbers
          "[&_.v]:align-super [&_.v]:text-[11px] [&_.v]:font-sans [&_.v]:font-semibold [&_.v]:text-gold/80 [&_.v]:mr-1",
          // Footnotes / cross-reference markers (kept accessible per the license)
          "[&_.note]:text-gold/70 [&_.note]:text-[12px]",
          "[&_.fr]:text-paper/40 [&_.ft]:text-paper/60",
        ].join(" ")}
        dangerouslySetInnerHTML={{ __html: chapter.html }}
      />
      <ScriptureAttribution
        transId={transId}
        copyright={chapter.copyright}
        translationLabel={translationLabel}
      />
      <Fums fumsToken={chapter.fumsToken} />
    </article>
  );
}
