"use client";

// Loads a reading plan's guide (lib/plans/guide.ts) in the reader's language,
// with the English beside it for whatever that language has not reached.
// An explicit import map, as lib/i18n/client.ts has for the catalogs, so the
// bundler makes one small chunk per language and a reader only ever loads
// their own and the English, and only on a plan's pages.

import { useEffect, useState } from "react";

import type { LocaleCode } from "@/lib/i18n/locales";

import type { GuideContent, SayingsContent } from "./guide";

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

export type LoadedGuide = { own: GuideContent | null; en: GuideContent };

/** The guide in the reader's language and in English; null until loaded. */
export function usePlanGuide(locale: LocaleCode): LoadedGuide | null {
  const [guide, setGuide] = useState<{ locale: LocaleCode; value: LoadedGuide } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([load("en"), locale === "en" ? Promise.resolve(null) : load(locale)]).then(([en, own]) => {
      if (!alive || !en) return;
      setGuide({ locale, value: { en, own: locale === "en" ? en : own } });
    });
    return () => {
      alive = false;
    };
  }, [locale]);
  return guide && guide.locale === locale ? guide.value : null;
}

let sayings: Promise<SayingsContent | null> | null = null;

/** The Fathers' sayings, English, loaded when a finished day first shows one. */
export function useSayings(wanted: boolean): SayingsContent | null {
  const [value, setValue] = useState<SayingsContent | null>(null);
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    sayings ??= import("@/data/plans/sayings.json")
      .then((m) => m.default as SayingsContent)
      .catch(() => {
        sayings = null;
        return null;
      });
    void sayings.then((s) => {
      if (alive) setValue(s);
    });
    return () => {
      alive = false;
    };
  }, [wanted]);
  return value;
}
