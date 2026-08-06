"use client";

import type { SectionVoice } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import { cn } from "@/lib/cn";

/**
 * Says whose words the paragraphs below are, when they are not the saint's.
 *
 * A reader skimming a Father's page is entitled to assume the serif body
 * text is the Father speaking. On several works that assumption is wrong,
 * and until now nothing on the page said so except a sentence buried at the
 * end of a 60-word editor's note. The Martyrdom of Polycarp is the church of
 * Smyrna writing about him; St Nicholas's troparion is the Church's hymn to
 * him; the miracles in the Life of Antony are Athanasius narrating.
 *
 * Deliberately set in SANS against the reading serif, at reduced contrast,
 * with a rule down the left. It has to be legible without competing with
 * the text it introduces: the point is that a skimmer registers it, not
 * that it shouts.
 *
 * `saint` renders nothing. That is the expected case, and labelling it
 * would train readers to ignore the band exactly where it matters.
 */
export function VoiceBand({
  voice,
  voiceAuthor,
  saint,
}: {
  voice?: SectionVoice;
  voiceAuthor?: string;
  saint: Saint;
}) {
  if (!voice || voice === "saint") return null;

  const possessive = saint.pronoun === "her" ? "her" : "his";
  const label = LABELS[voice];
  const body = describe(voice, voiceAuthor, saint.name, possessive);
  if (!body) return null;

  return (
    <p
      className={cn(
        "mb-5 border-l-2 pl-4 font-sans text-caption leading-[1.55]",
        // Editorial is the one a reader is most likely to mistake for the
        // saint, so it carries the warmer rule; the rest stay neutral.
        voice === "editorial"
          ? "border-gold/40 text-paper/60"
          : "border-paper/20 text-paper/55",
      )}
    >
      <span className="font-semibold uppercase tracking-[1.2px] text-paper/45">
        {label}
      </span>
      <span className="mx-2 text-paper/25" aria-hidden>
        ·
      </span>
      {body}
    </p>
  );
}

const LABELS: Record<Exclude<SectionVoice, "saint">, string> = {
  editorial: "Summary by Purify",
  witness: "Another hand",
  liturgical: "The Church's hymn",
  scripture: "Scripture",
};

function describe(
  voice: SectionVoice,
  voiceAuthor: string | undefined,
  saintName: string,
  possessive: string,
): string | null {
  switch (voice) {
    case "editorial":
      return `Written by Purify, not ${saintName}'s words.`;
    case "witness":
      return voiceAuthor
        ? `Recorded by ${voiceAuthor}. Verbatim, but not ${saintName}'s words.`
        : `Verbatim words of another hand, not ${saintName}'s.`;
    case "liturgical":
      return `Sung by the Church about ${saintName}, not written by ${possessive === "her" ? "her" : "him"}.`;
    case "scripture":
      return "Verbatim Scripture.";
    default:
      return null;
  }
}
