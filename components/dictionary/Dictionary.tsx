"use client";

// The Orthodox dictionary (1.7): one page, the words A to Z, a field that
// finds a word as it is typed, and each word's own anchor (/dictionary#theosis)
// so the app's search can open it where it stands. Drawn like Start here: a
// short header, then one ruled list. One tree for phone and desktop.
//
// The words of the page go through the catalog; the definitions are English
// data (lib/dictionary/terms.ts) and say so in other languages.

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DICTIONARY, fold, letterOf, termsMatching, type DictionaryTerm } from "@/lib/dictionary/terms";

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

function Chevron() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function Entry({ term, lit }: { term: DictionaryTerm; lit: boolean }) {
  const { t } = useTranslate();
  return (
    <article
      id={term.id}
      className={`scroll-mt-24 rounded-xl py-5 transition-colors ${lit ? "bg-paper/[0.05] px-3" : ""}`}
    >
      <h2 className="font-serif text-title-sm font-bold leading-tight text-paper">{term.term}</h2>
      {term.greek ? (
        <p lang="el" className="mt-0.5 font-serif text-detail text-paper/55">
          {term.greek}
        </p>
      ) : null}
      {term.also && term.also.length > 0 ? (
        <p className="mt-0.5 font-sans text-caption text-paper/50">{t("dictionary.also", { names: term.also.join(", ") })}</p>
      ) : null}
      <p lang="en" className="mt-2 max-w-[62ch] font-serif text-body leading-[1.65] text-paper/85">
        {term.definition}
      </p>
      {term.see && term.see.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {term.see.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap-press inline-flex items-center gap-1 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1 font-sans text-caption text-paper/80 transition-colors hover:border-paper/30 hover:text-paper"
            >
              {link.label}
              <Chevron />
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function Dictionary() {
  const { t, locale } = useTranslate();
  const [query, setQuery] = useState("");
  const found = useMemo(() => termsMatching(query), [query]);
  const lit = useSyncExternalStore(subscribeHash, hashNow, noHash);
  // A-Z under letters while nothing is typed; the best matches first once
  // something is.
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
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
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

        <label className="mt-8 block">
          <span className="sr-only">{t("dictionary.filter")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dictionary.filter")}
            autoComplete="off"
            className="h-12 w-full rounded-[14px] border border-paper/10 bg-paper/[0.04] px-4 font-sans text-ui text-paper placeholder:text-paper/45 focus:border-paper/30 focus:outline-none"
          />
        </label>

        {query.trim() ? (
          found.length > 0 ? (
            <div className="mt-4 divide-y divide-paper/[0.07]">
              {found.map((term) => (
                <Entry key={term.id} term={term} lit={term.id === lit} />
              ))}
            </div>
          ) : (
            <p className="mt-6 font-sans text-ui text-paper/55">{t("dictionary.none", { query: query.trim() })}</p>
          )
        ) : (
          <div className="mt-6">
            {letters.map(([letter, terms]) => (
              <section key={letter} aria-labelledby={`letter-${letter}`} className="mt-6 first:mt-0">
                <p
                  id={`letter-${letter}`}
                  className="border-b border-paper/[0.08] pb-2 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45"
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
        )}
      </div>
    </section>
  );
}
