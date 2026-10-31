"use client";

// Try the word study (r3-07 A): the study itself, as the Bible's word study
// sheet draws it (components/bible/WordStudySheet.tsx, WordStudyBody), for
// the Word of John 1:1, λόγος: its dictionary entry, how often it stands in
// each testament, and every verse it stands in with the word marked. Under
// it, the three words John 1 begins with, to study each in turn.
//
// The verses come from the website's public word study (app/api/bible/word),
// the texts being public domain: the same answer a subscriber gets.
//
// Switching the word is smooth (the owner's note 43 of build 80): the three
// are loaded as the preview opens, the window keeps the word it shows until
// the chosen one's verses are here, and the chosen one comes in over it as
// it goes (lib/premium/plusTry.ts, stepWordSwitch). The window keeps its own
// height whatever the study inside it holds.

import { useEffect, useLayoutEffect, useReducer, useRef } from "react";

import { WordStudyBody, preloadWordStudy } from "@/components/bible/WordStudySheet";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { TRY_WORDS, WORD_FADE_MS, startWordSwitch, stepWordSwitch } from "@/lib/premium/plusTry";

import { TrySwitch, TryWindow } from "./TryKit";

/** The Greek in the Bible's Greek face, as the study sets it. */
const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

const lemmaOf = (strongs: string) => TRY_WORDS.find((w) => w.strongs === strongs)?.lemma ?? null;

export default function TryWordStudy({ row }: TryProps) {
  const { t } = useTranslate();
  const [state, dispatch] = useReducer(stepWordSwitch, TRY_WORDS[0].strongs, startWordSwitch);
  const scroller = useRef<HTMLDivElement>(null);
  const { shown, leaving } = state;

  // All three as the preview opens. A word is ready once its verses are
  // here, or once asking for them failed, which its study then says.
  useEffect(() => {
    let alive = true;
    for (const w of TRY_WORDS) {
      void preloadWordStudy(w.strongs, "nt").then(() => {
        if (alive) dispatch({ type: "ready", strongs: w.strongs, y: scroller.current?.scrollTop ?? 0 });
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  // The word coming in opens at its top. The one going out is drawn from
  // where it was scrolled to (its `top` below), so it does not jump as it goes.
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [shown]);

  // The one going out is let go once it has gone.
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => dispatch({ type: "left" }), WORD_FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  // Keyed by the word, so the study going out is the very one that was shown.
  const layers = leaving && leaving.strongs !== shown ? [leaving.strongs, shown] : [shown];

  return (
    <>
      <TryWindow label={t(row.name)} tall loading={!state.ready.includes(shown)} scrollRef={scroller}>
        <div className="relative overflow-hidden">
          {layers.map((strongs) => {
            const out = strongs !== shown;
            return (
              <div
                key={strongs}
                data-word-layer={out ? "out" : "in"}
                aria-hidden={out || undefined}
                inert={out}
                // The one coming in stands over the one going out.
                className={cn("px-5 pb-16 pt-5", out ? "plus-try-word-out pointer-events-none absolute inset-x-0" : "plus-try-word-in relative")}
                style={out && leaving ? { top: -leaving.y } : undefined}
              >
                {/* Afresh for each word, as the sheet opens afresh for each. */}
                <WordStudyBody strongs={strongs} lemma={lemmaOf(strongs)} startIn="nt" />
              </div>
            );
          })}
        </div>
      </TryWindow>
      <TrySwitch
        label={t("bible.wordStudyTitle")}
        value={state.chosen}
        onChange={(strongs) => dispatch({ type: "choose", strongs, y: scroller.current?.scrollTop ?? 0 })}
        options={TRY_WORDS.map((w) => ({ id: w.strongs, label: <span style={GREEK}>{w.lemma}</span>, lang: "grc", className: "text-ui" }))}
      />
    </>
  );
}
