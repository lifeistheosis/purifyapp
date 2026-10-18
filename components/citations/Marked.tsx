import type { ReactNode } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { T } from "@/components/i18n/T";
import type { ShownCite } from "@/lib/citations/cite";

/**
 * Words inside a longer text that a source is given for (1.8): a quotation,
 * or a line that credits a Father with a teaching. Each is numbered where it
 * stands, and the number leads to where the words come from, listed below
 * the text. Learn to pray's lessons and the Bible's "Before you read" share
 * it, so a mark and its list look and work the same in both.
 */
export type Mark = { words: string; n: number };

/** A source in the list under a text: its number, the words, and their line (null when it is not in the app). */
export type ListedSource = Mark & { shown: ShownCite | null };

/** A closing quotation mark, which a mark follows rather than sits inside. */
const CLOSE = new Set(['"', "”", "’", "'", "»"]);

/**
 * Where the words stand in a text: as written, or else with a capital the
 * text does not give them (a sentence that opens on them, a line that runs
 * on into them). -1 where they are not there.
 */
export function findWords(text: string, words: string): number {
  const at = text.indexOf(words);
  if (at >= 0) return at;
  const lower = text.toLowerCase();
  return lower.length === text.length ? lower.indexOf(words.toLowerCase()) : -1;
}

/**
 * A text with its marks: after each run of words a source is given for, a
 * small number that leads to it (`#${idPrefix}${n}`). The words themselves
 * are as the file writes them. A run found nowhere in the text is left out.
 */
export function marked(text: string, marks: Mark[], idPrefix: string): ReactNode {
  const found = marks
    .map((m) => ({ ...m, at: findWords(text, m.words) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at);
  if (!found.length) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of found) {
    if (m.at < from) continue;
    let end = m.at + m.words.length;
    while (end < text.length && CLOSE.has(text[end])) end++;
    out.push(text.slice(from, end));
    out.push(
      <sup key={m.n} className="ms-0.5 font-sans text-eyebrow font-medium text-paper/55 align-super">
        <a href={`#${idPrefix}${m.n}`} className="hover:text-paper">
          {m.n}
        </a>
      </sup>,
    );
    from = end;
  }
  out.push(text.slice(from));
  return out;
}

/**
 * The list of where the marked words come from: each number, the words, and
 * the line every quotation in the app has (components/citations/SourceLine.tsx),
 * which for some says plainly that they are not yet traced.
 */
export function SourceList({
  id,
  idPrefix,
  sources,
  lang,
  heading: Heading = "h2",
  compact = false,
  className,
}: {
  id: string;
  idPrefix: string;
  sources: ListedSource[];
  lang: string;
  heading?: "h2" | "h3";
  /** Each number with its line alone, the words left where they stand (a short text, as a plan's day). */
  compact?: boolean;
  className?: string;
}) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby={id} className={className}>
      {/* A sans label: the heading rule in globals.css sets Lora on every
          heading, so the face is set here. */}
      <Heading id={id} className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
        <T k="cite.sources" />
      </Heading>
      <ol className={compact ? "mt-2 space-y-1.5" : "mt-4 space-y-5"}>
        {sources.map((s) =>
          compact ? (
            <li key={s.n} id={`${idPrefix}${s.n}`} className="flex scroll-mt-24 items-baseline gap-2">
              <span className="w-3 shrink-0 font-sans text-caption text-paper/45">{s.n}</span>
              {s.shown ? <SourceLine cite={s.shown} /> : null}
            </li>
          ) : (
            <li key={s.n} id={`${idPrefix}${s.n}`} className="scroll-mt-24">
              <p lang={lang} className="font-serif text-ui leading-[1.6] text-paper/70">
                <span className="me-1.5 font-sans text-caption text-paper/45">{s.n}</span>
                {s.words}
              </p>
              {s.shown ? <SourceLine cite={s.shown} className="mt-1" /> : null}
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
