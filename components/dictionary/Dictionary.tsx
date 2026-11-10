"use client";

// The Orthodox dictionary (1.7): one page, the words A to Z, and each word's
// own anchor (/dictionary#theosis) so the app's search can open it where it
// stands. Drawn like Start here: a short header, then one ruled list. One
// tree for phone and desktop.
//
// Its field is the door to the one search, turned to the dictionary (1.8,
// the owner's pick of r3-12, "C, with the mix of B"): Theology's door with
// its Dictionary chosen, where a word is found by its name, its other names,
// its Greek and, as this page's own field found it, its definition. Until
// 1.8 the field filtered this page in place.
//
// The words of the page go through the catalog; the definitions are English
// data (lib/dictionary/terms.ts) and say so in other languages.

import Link from "next/link";
import { Fragment, useMemo, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchDoor } from "@/components/search/SearchField";
import { DICTIONARY, fold, letterOf, type DictionaryTerm } from "@/lib/dictionary/terms";

// The word the address points at (/dictionary#theosis), lit so the eye finds
// it where the page scrolled to. Read from the address rather than with
// :target, which a client-side navigation does not set.
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}
const hashNow = () => decodeURIComponent(window.location.hash.slice(1));
const noHash = () => "";

function Entry({ term, lit }: { term: DictionaryTerm; lit: boolean }) {
  const { t } = useTranslate();
  return (
    <article
      id={term.id}
      className={`scroll-mt-24 rounded-xl py-5 transition-colors ${lit ? "bg-paper/[0.05] px-3" : ""}`}
    >
      <h2 lang="en" dir="ltr" className="font-serif text-title-sm font-bold leading-tight text-paper">{term.term}</h2>
      {term.greek ? (
        <p lang="el" dir="ltr" className="mt-0.5 font-serif text-detail text-paper/55">
          {term.greek}
        </p>
      ) : null}
      {term.also && term.also.length > 0 ? (
        <p className="mt-0.5 font-sans text-caption text-paper/50">{t("dictionary.also", { names: term.also.join(", ") })}</p>
      ) : null}
      <p lang="en" dir="ltr" className="mt-2 max-w-[62ch] font-serif text-body leading-[1.65] text-paper/85">
        {term.definition}
      </p>
      {term.see && term.see.length > 0 ? (
        // Where to read on, as a line of links (1.9). It was a row of outlined
        // pills, 29px tall: a list of places to go is not a row of pills (his
        // word of 2026-11-10, CLAUDE.md), and a link in a sentence is a whole
        // target as it stands (WCAG 2.5.5; checkMock's own exception).
        <p className="mt-3 max-w-[62ch] font-sans text-detail leading-[1.7] text-paper/70">
          <span className="me-1.5">{t("saints.see")}</span>
          {term.see.map((link, i) => (
            <Fragment key={link.href}>
              {i > 0 ? (
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              ) : null}
              <Link
                href={link.href}
                lang="en"
                dir="ltr"
                className="font-semibold text-paper/85 underline decoration-paper/30 underline-offset-[3px] hover:text-paper hover:decoration-paper/60"
              >
                {link.label}
              </Link>
            </Fragment>
          ))}
        </p>
      ) : null}
    </article>
  );
}

export function Dictionary() {
  const { t, locale } = useTranslate();
  const lit = useSyncExternalStore(subscribeHash, hashNow, noHash);
  // A-Z under letters.
  const letters = useMemo(() => {
    const by = new Map<string, DictionaryTerm[]>();
    const sorted = [...DICTIONARY].sort((a, b) => fold(a.term).localeCompare(fold(b.term), "en"));
    for (const term of sorted) {
      const l = letterOf(term.term);
      by.set(l, [...(by.get(l) ?? []), term]);
    }
    return [...by.entries()];
  }, []);

  return (
    <section className="bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <p className="font-sans text-caption font-semibold text-paper/55">
            {t("dictionary.eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display">
            {t("dictionary.title")}
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body leading-[1.75] text-paper/80">{t("dictionary.intro")}</p>
          {locale !== "en" ? (
            <p className="mt-3 font-sans text-caption text-paper/50">{t("dictionary.english")}</p>
          ) : null}
        </header>

        <SearchDoor place="dictionary" placeholderKey="dictionary.filter" className="mt-8" />

        <div className="mt-6">
          {letters.map(([letter, terms]) => (
            <section key={letter} aria-labelledby={`letter-${letter}`} className="mt-6 first:mt-0">
              <p
                id={`letter-${letter}`}
                className="border-b border-paper/[0.08] pb-2 font-sans text-caption font-semibold text-paper/45"
              >
                {letter}
              </p>
              <div className="divide-y divide-paper/[0.07]">
                {terms.map((term) => (
                  <Entry key={term.id} term={term} lit={term.id === lit} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
