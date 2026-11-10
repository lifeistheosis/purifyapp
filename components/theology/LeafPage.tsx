import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { T } from "@/components/i18n/T";
import { textDir } from "@/lib/i18n/textDir";

import { WholeIcon } from "./WholeIcon";
import { LEAF_TITLE, WAY_FACT, WAY_H2 } from "./wayStyle";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type LeafKind = "topic" | "heresy" | "answer" | "creed";

/**
 * A page one of Theology's four lists opens (1.9; his word of 2026-11-10,
 * "I want everything in version 1.9", which brought in what build 89's note 2
 * left for later): a topic, a heresy, an answer, and the Creed line by line.
 * The frame the four kinds share, as components/theology/WayPage.tsx is the
 * frame of the lists themselves. Of the lists he said "it still looks like
 * the old version, and it still looks AI like vibe coded slop ... revamp it
 * using our style"; these wore the same old shell: a back bar with no name,
 * the "Theology" label over a row of four pills, a small label over a giant
 * headline, boxed quotations, and the search pill floating over the words.
 * docs/1.9-build/notes/theology-fable.md has the plan.
 *
 *   the head   the row that was tapped, grown: the same mark (a question's
 *              icon whole on its plate, an error's scroll, an answer's
 *              shield, lit), the same name in Lora, and the one small line
 *              the row or the path gives it (how many of the Fathers a
 *              question cites, an error's century, an answer's length). The
 *              mark takes the row's as the page opens (data-carry-into;
 *              lib/ui/routeMotion.ts, "A picture that leads to its own
 *              page").
 *   the body   the page's own words, at the size a study is read at; its
 *              parts each named in Lora (LeafPart); a Father's or a
 *              council's words on their own type on a raised surface, his
 *              face beside them; places to go as rows in one tray.
 *   the foot   what the page leads to, as rows, and who curated it, small,
 *              under a hairline, as the lists close (LeafNote).
 *
 * The page's file mounts its own bar over this: the page's name once its
 * heading has gone up under it, back to its list, and the search turned to
 * Theology (lib/nav/__tests__/backBar.test.ts looks for a bar in pages and
 * layouts only). The floating search pill is gone from these as it went from
 * the lists and the hub: the bar's magnifier opens the same search.
 *
 * No word on these pages is new or changed: each is the registry's own or
 * the catalog's, as it stood.
 */
export function LeafPage({
  kind,
  up,
  mark,
  name,
  nameLang,
  line,
  lineLang,
  children,
}: {
  kind: LeafKind;
  /** The list this page belongs to: its address and the catalog key of its name. */
  up: { href: string; label: string };
  /** What the page wears at its head: LeafPicture or LeafGlyph. */
  mark: ReactNode;
  name: ReactNode;
  /**
   * The language the name is written in, where it is a registry's own and
   * not the catalog's ("en"): it says so, and its direction with it, so an
   * English name reads left to right under Arabic and Urdu (build 90 note 4,
   * lib/i18n/textDir.ts). None for a name from the catalog, which is the
   * reader's own language.
   */
  nameLang?: string;
  /** The one small line under the name. */
  line?: ReactNode;
  /** The same for the line: a heresy's century is the registry's English; a count is the catalog's. */
  lineLang?: string;
  children: ReactNode;
}) {
  // A name and a line both in one language that is not the page's: the two
  // are one block of it, and say so together.
  const both = line && nameLang && nameLang === lineLang ? nameLang : undefined;
  return (
    <section data-leaf-page={kind} className="bg-night px-5 pb-10 pt-6 md:px-8 md:py-14">
      <article className="cascade cascade-tight mx-auto w-full max-w-[640px]">
        {/* On a computer, the way back up to the list; a phone has the bar's. */}
        <p className="mb-5 hidden font-sans text-detail font-semibold text-paper/55 md:block native-md-hidden">
          <Link href={up.href} className="hover:text-paper">
            <T k={up.label} />
          </Link>
        </p>

        <header data-leaf-head="" className="flex items-center gap-3.5">
          {mark}
          <div className="min-w-0" lang={both} dir={textDir(both)}>
            {/* A long word breaks where its language allows (in German, "Glaubensbekenntnis" ran off a phone's edge). */}
            <h1
              id={LEAF_TITLE}
              data-leaf-name=""
              lang={nameLang}
              dir={textDir(nameLang)}
              className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-balance text-paper hyphens-auto break-words"
            >
              {name}
            </h1>
            {line ? (
              <p data-leaf-line="" lang={lineLang} dir={textDir(lineLang)} className="mt-1.5 font-sans text-detail leading-[1.4] text-paper/55">
                {line}
              </p>
            ) : null}
          </div>
        </header>

        {children}
      </article>
    </section>
  );
}

/** A leaf page's mark where there is no picture: its kind's glyph, lit, as a way's page wears its own. */
export function LeafGlyph({ icon: Glyph, carry }: { icon: Icon; /** The name the row's mark travels under. */ carry?: string }) {
  return (
    <span aria-hidden data-leaf-mark="glyph" data-carry-into={carry} className="theology-glyph shrink-0 text-paper">
      <Glyph size={32} />
    </span>
  );
}

/** A leaf page's picture: its subject's icon whole, in its own light, on the plate its card holds it on. */
export function LeafPicture({ src, carry }: { src: string; carry?: string }) {
  return (
    <span aria-hidden data-leaf-mark="picture" data-carry-into={carry} className="path-plate w-[96px] shrink-0">
      <WholeIcon src={src} eager className="aspect-[4/5] w-full rounded-[3px]" />
    </span>
  );
}

/** A part of a leaf page: its name in Lora, how many it holds at the line's end, then what it holds. */
export function LeafPart({
  id,
  title,
  count,
  children,
  ...rest
}: {
  id: string;
  title: ReactNode;
  count?: number;
  children: ReactNode;
} & Record<`data-${string}`, string>) {
  return (
    <section aria-labelledby={id} className="mt-9" {...rest}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className={WAY_H2}>
          {title}
        </h2>
        {count === undefined ? null : <span className={WAY_FACT}>{count}</span>}
      </div>
      {children}
    </section>
  );
}

/** What a leaf page says of itself at its end: small, under a hairline, as the lists close. */
export function LeafNote({ children }: { children: ReactNode }) {
  return (
    <div data-leaf-note="" className="mt-10 space-y-3 border-t border-paper/8 pt-5 font-sans text-detail leading-[1.6] text-paper/55">
      {children}
    </div>
  );
}
