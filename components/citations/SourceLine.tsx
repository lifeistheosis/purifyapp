"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { ShownCite } from "@/lib/citations/cite";
import { cn } from "@/lib/cn";

type T = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * The line under a quotation (1.8): where the words come from, exactly, the
 * same everywhere the app quotes Scripture or a Father. It began as the
 * place under each passage of the reading room's collections and is shared
 * from there.
 *
 *   John 3:16, King James Version
 *   St. Augustine of Hippo, Confessions, Book I, Chapter 1, §1, tr. Pusey
 *
 * The place is the link, and it opens the words where they stand: the
 * verses in the Bible, the paragraph in its work. A text the library does
 * not carry is named with its edition and has no link. Words no
 * public-domain text we can find carries say so, quietly, in place of a
 * source (lib/citations/cite.ts, `untraced`).
 *
 * The book of the Bible and the translation are in the reader's language
 * (bible.books.*); the Fathers' works keep their English names, as the
 * library has them.
 */
export function SourceLine({ cite, className }: { cite: ShownCite; className?: string }) {
  const { t } = useTranslate();
  const words = "font-sans text-detail leading-[1.45]";
  if (cite.kind === "untraced") {
    return (
      <p data-cite="untraced" className={cn(words, "text-paper/45", className)}>
        {t("cite.untraced")}
      </p>
    );
  }
  if (cite.kind === "text") {
    return (
      <p data-cite="text" className={cn(words, "text-paper/60", className)}>
        <Words cite={cite} t={t} />
      </p>
    );
  }
  if (cite.kind === "inexact") {
    // Close to a passage the app carries, not as its edition prints it: said
    // plainly, then the passage, to read and compare.
    return (
      <div data-cite="inexact" className={cn(words, className)}>
        <p className="text-paper/45">{t("cite.inexact")}</p>
        <Link
          href={cite.of.href}
          prefetch={false}
          className="tap-press mt-0.5 inline-flex max-w-full items-start gap-1.5 text-paper/60 hover:text-paper"
        >
          <span className="min-w-0">
            <Words cite={cite.of} t={t} />
          </span>
          <ChevronRight size={14} className="mt-[3px] shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    );
  }
  return (
    <Link
      href={cite.href}
      prefetch={false}
      data-cite={cite.kind}
      className={cn("tap-press inline-flex max-w-full items-start gap-1.5 text-paper/60 hover:text-paper", words, className)}
    >
      <span className="min-w-0">
        <Words cite={cite} t={t} />
      </span>
      <ChevronRight size={14} className="mt-[3px] shrink-0 rtl:-scale-x-100" />
    </Link>
  );
}

function Words({ cite, t }: { cite: Exclude<ShownCite, { kind: "untraced" | "inexact" }>; t: T }) {
  if (cite.kind === "scripture") {
    return (
      <>
        <span className="font-medium text-paper/80">{`${t(`bible.books.${cite.book}`)} ${cite.reference}`}</span>
        <span>{`, ${t(cite.translation === "kjv" ? "reading.collection.kjv" : "reading.collection.brenton")}`}</span>
      </>
    );
  }
  if (cite.kind === "text") {
    return (
      <span lang="en">
        <span className="font-medium text-paper/80">{cite.author}</span>
        {`, ${cite.work}, ${cite.place}, ${cite.edition}`}
      </span>
    );
  }
  const where = cite.place ? `${cite.work}, ${cite.place}` : cite.work;
  const mark = cite.mark ? `, ${cite.mark}` : "";
  return (
    <span lang="en">
      {cite.author ? (
        <>
          <span className="font-medium text-paper/80">{cite.author}</span>
          {`, ${where}${mark}`}
        </>
      ) : (
        // A work no one signed is cited by its title alone.
        <span className="font-medium text-paper/80">{`${where}${mark}`}</span>
      )}
      {cite.edition ? <span className="text-paper/45">{`, ${cite.edition}`}</span> : null}
    </span>
  );
}
