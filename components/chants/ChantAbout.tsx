"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { hebrewLine } from "@/lib/bible/psalmNumbers";
import type { Chant } from "@/lib/chants/types";

import { EnglishForNow } from "./EnglishForNow";

/**
 * What a chant is, where it comes from and when it is sung (1.7), then its
 * sources. The prose is written as canonically as it can be, nothing
 * invented, every source public domain and named, and it is marked in its
 * file for a future clergy review (the owner's standing note of 2026-10-16).
 * A part with a catalog key is in the reader's language; the rest is English
 * for now, and a reader in another language is told so once.
 *
 * A psalm names its number both ways (the owner's "automatic it" of
 * 2026-10-15): ours, as the Church counts, and the one most Bibles use.
 */
export function ChantAbout({ chant }: { chant: Chant }) {
  const { t } = useTranslate();
  const part = (p: "what" | "history" | "when") => {
    const key = chant.aboutKeys?.[p];
    return key ? { text: t(key), english: false } : { text: chant.about[p], english: true };
  };
  const parts = [
    { id: "what", heading: t("chants.about.what"), ...part("what") },
    { id: "history", heading: t("chants.about.history"), ...part("history") },
    { id: "when", heading: t("chants.about.when"), ...part("when") },
  ];
  const someEnglish = parts.some((p) => p.english);
  const other = chant.psalm ? hebrewLine(chant.psalm) : null;

  return (
    <div className="space-y-8">
      {someEnglish ? <EnglishForNow className="-mb-4" /> : null}
      {parts.map((p) => (
        <section key={p.id} aria-labelledby={`chant-about-${p.id}`}>
          <h2 id={`chant-about-${p.id}`} className="text-lede font-bold leading-snug text-paper">
            {p.heading}
          </h2>
          <p lang={p.english ? "en" : undefined} className="mt-2 font-serif text-body leading-[1.7] text-paper/85">
            {p.text}
          </p>
          {p.id === "when" && chant.when.services?.length ? (
            <ul lang="en" className="mt-3 space-y-1 font-sans text-detail text-paper/65">
              {chant.when.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {chant.psalm ? (
        <section>
          <Link
            href={`/bible/psalms/${chant.psalm}`}
            className="tap-press inline-flex min-h-11 items-center gap-1 font-sans text-ui font-semibold text-paper hover:underline hover:underline-offset-4"
          >
            {t("chants.readPsalm", { n: chant.psalm })}
            <ChevronRight size={15} className="text-paper/50 rtl:-scale-x-100" />
          </Link>
          {other ? <p className="font-sans text-caption text-paper/50">{t(other.key, other.values)}</p> : null}
        </section>
      ) : null}

      {chant.sources.length > 0 ? (
        <section aria-labelledby="chant-about-sources">
          <h2 id="chant-about-sources" className="text-lede font-bold leading-snug text-paper">
            {t("chants.about.sources")}
          </h2>
          <ul lang="en" className="mt-3 space-y-3 font-sans text-detail leading-[1.55] text-paper/70">
            {chant.sources.map((s) => {
              const by = [s.author, s.year].filter(Boolean).join(", ");
              const after = by ? `, ${by}` : "";
              return (
                <li key={`${s.title}-${s.year ?? ""}`}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-paper hover:underline hover:underline-offset-4">
                      {s.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-paper">{s.title}</span>
                  )}
                  {after ? <span>{after}</span> : null}
                  {s.note ? <span className="block text-paper/50">{s.note}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
