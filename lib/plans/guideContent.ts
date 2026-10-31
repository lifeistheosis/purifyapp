"use client";

// Loads a reading plan's guide (lib/plans/guide.ts) in the reader's language,
// with the English beside it for whatever that language has not reached.
// An explicit import map, as lib/i18n/client.ts has for the catalogs, so the
// bundler makes one small chunk per language and a reader only ever loads
// their own and the English, and only where a plan's words are shown. A
// plan's own page is handed its English at build (lib/plans/words.ts) and
// loads nothing for it.

import { useEffect, useMemo, useState } from "react";

import type { LocaleCode } from "@/lib/i18n/locales";

import type { GuideCites, GuideContent, PlanWords } from "./guide";

type Module = { default: unknown };

const GUIDES: Partial<Record<LocaleCode, () => Promise<Module>>> = {
  en: () => import("@/data/plans/guide/en.json"),
};

const cache = new Map<string, Promise<GuideContent | null>>();

function load(code: LocaleCode): Promise<GuideContent | null> {
  const known = cache.get(code);
  if (known) return known;
  const importer = GUIDES[code];
  const p = importer
    ? importer()
        .then((m) => m.default as GuideContent)
        .catch(() => {
          cache.delete(code);
          return null;
        })
    : Promise.resolve(null);
  cache.set(code, p);
  return p;
}

/** Where the English guide's quoted verses stand (1.8), loaded with it. */
export type LoadedGuide = { own: GuideContent | null; en: GuideContent; cites: GuideCites | null };

let cites: Promise<GuideCites | null> | null = null;
function loadCites(): Promise<GuideCites | null> {
  cites ??= import("@/data/plans/guide/cites.json")
    .then((m) => m.default as GuideCites)
    .catch(() => {
      cites = null;
      return null;
    });
  return cites;
}

/** The English and its verses as a plan's page is handed them at build. */
export type GivenGuide = Pick<PlanWords, "en" | "cites">;

/**
 * The guide a plan's page brought with it, as usePlanGuide gives it: at once,
 * with nothing loaded. Null where there is none, or where the reader's
 * language has a guide of its own, which is still loaded. A language with
 * none yet reads the English, as it would once loaded.
 */
export function handedGuide(locale: LocaleCode, withCites: boolean, given: GivenGuide | undefined): LoadedGuide | null {
  if (!given || (locale !== "en" && GUIDES[locale])) return null;
  return { en: given.en, own: locale === "en" ? given.en : null, cites: withCites ? given.cites : null };
}

/**
 * The guide in the reader's language and in English; null until loaded.
 * With `withCites`, where its quoted verses stand too (a plan's own page;
 * the journal asks only for the questions).
 *
 * With `given`, the words a plan's page brought (lib/plans/words.ts), the
 * guide is there at the first render (handedGuide). Loaded here after the
 * page was drawn, the day's card arrived without its intro and grew it a
 * moment later (the owner's note 42 of build 80).
 */
export function usePlanGuide(locale: LocaleCode, withCites = false, given?: GivenGuide): LoadedGuide | null {
  const handed = useMemo(() => handedGuide(locale, withCites, given), [locale, withCites, given]);
  const [guide, setGuide] = useState<{ locale: LocaleCode; value: LoadedGuide } | null>(null);
  useEffect(() => {
    if (handed) return;
    let alive = true;
    void Promise.all([load("en"), locale === "en" ? Promise.resolve(null) : load(locale), withCites ? loadCites() : Promise.resolve(null)]).then(([en, own, placed]) => {
      if (!alive || !en) return;
      setGuide({ locale, value: { en, own: locale === "en" ? en : own, cites: placed } });
    });
    return () => {
      alive = false;
    };
  }, [locale, withCites, handed]);
  if (handed) return handed;
  return guide && guide.locale === locale ? guide.value : null;
}
