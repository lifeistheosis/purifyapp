"use client";

// A paragraph of patristic text with its harder vocabulary tappable.
//
// The interruption is deliberately small: a faint dotted underline, no colour
// change, no icon. A reader who does not need it should be able to read the
// paragraph without noticing the marks at all, which is why only false friends
// and technical terms are marked and never the plain older forms. See
// lib/bible/glossary.ts for why "thou" is left alone.
//
// One gloss is open at a time, inline, pushing the text down rather than
// floating over it. A popover would land under the thumb on a phone, and this
// text is read on phones.

import { useState } from "react";
import { segment, type GlossaryEntry } from "@/lib/bible/glossary";

export function GlossedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const parts = segment(text);

  // Fast path: nothing marked in this paragraph, which is most of them.
  if (parts.length === 1 && !parts[0].entry) {
    return <p className={className}>{text}</p>;
  }

  let openEntry: GlossaryEntry | null = null;
  if (open !== null) {
    const part = parts[open];
    if (part?.entry) openEntry = part.entry;
  }

  return (
    <>
      <p className={className}>
        {parts.map((part, i) =>
          part.entry ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen((v) => (v === i ? null : i))}
              aria-expanded={open === i}
              // Inherit everything: this must read as a word in a sentence,
              // not as a control that happens to sit in one.
              className={
                "cursor-help border-b border-dotted border-paper/35 bg-transparent p-0 font-inherit text-inherit leading-inherit transition-colors hover:border-paper/70 " +
                (open === i ? "border-gold/70 text-paper" : "")
              }
            >
              {part.text}
            </button>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>
      {openEntry && (
        <p className="mt-1 mb-1 rounded-md border-l-2 border-gold/40 bg-paper/[0.04] px-3 py-2 font-sans text-caption leading-[1.6] text-paper/70">
          <span className="font-semibold text-paper/85">{openEntry.word}</span>
          {": "}
          {openEntry.gloss}
        </p>
      )}
    </>
  );
}
