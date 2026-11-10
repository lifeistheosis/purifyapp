"use client";

import { useEffect, useRef, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { plusFeaturesNow, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { type FlorilegiumItemInput } from "@/lib/florilegium/florilegium";

import { FlorilegiumPickerSheet } from "./FlorilegiumPickerSheet";

/** How long the gathering's name stays said, for a screen reader to reach it. */
const SAID_MS = 2400;

/**
 * The Gather button: drop a line (a Father's passage) into one of the
 * reader's gatherings, or into a freshly named one. Local-first, so it is
 * instant and offline.
 *
 * Drop it anywhere a quotable line is drawn, handing it the item to gather.
 *
 * From 1.9 (with the Florilegium's redesign, build 89 notes 6 and 12) it
 * opens the one sheet that picks a gathering (FlorilegiumPickerSheet.tsx),
 * the same one a verse's tools open in the Bible. It had a small menu of its
 * own under the button, which on a phone ran off the edge of the screen, in
 * a look of its own: a blurred box, small rows, grey counts.
 *
 * The button itself keeps the size of its word. It stands in a row of three
 * as wide as a passage's card (components/theology/PassageDeck.tsx: Read
 * where it's from, Gather, Share), and that row is full: measured in all
 * twenty-one languages at 390 and 360px, French has one pixel to spare, and
 * a flower before the word, or the word in the weight of its neighbours,
 * pushed "Read where it's from" onto two lines in a dozen of them. So what
 * changed costs no width: its ink, which was half the page's and is now its
 * neighbour's, and its reach, 44px to the finger.
 *
 * Once a line has gone in, the sheet shows where (the row it went into wears
 * the check and counts one more) and closes; the button says the gathering's
 * name to a screen reader. It no longer changes its own word to "Gathered
 * into" and a name for a moment: that was wider than the row has room for.
 *
 * Plus: shown to every reader, marked Plus where it is locked, and for a
 * reader without Plus the button opens the upgrade sheet named for the
 * Florilegium (lib/entitlements/usePlusFeatures.ts).
 */
export function AddToFlorilegium({ item }: { item: FlorilegiumItemInput }) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const said = useRef<number | null>(null);
  const upgrade = useUpgradeModal();
  const plusAllowed = usePlusFeatures();

  useEffect(
    () => () => {
      if (said.current !== null) window.clearTimeout(said.current);
    },
    [],
  );

  function gathered(name: string) {
    setDone(name);
    if (said.current !== null) window.clearTimeout(said.current);
    said.current = window.setTimeout(() => {
      said.current = null;
      setDone(null);
    }, SAID_MS);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          void plusFeaturesNow().then((ok) => {
            if (ok === false) upgrade.open("florilegium");
            else setOpen(true);
          });
        }}
        // Its words and its Plus mark on one baseline, as far apart as a
        // doctrine's quotation keeps Source from Gather (components/theology/
        // TopicReader.tsx; the owner's note 22 of build 80).
        data-gather=""
        className="tap-press hit-44 inline-flex items-baseline gap-3 font-sans text-caption text-paper/82 transition-colors hover:text-paper"
      >
        {t("study.gather")}
        {plusAllowed === false ? (
          <span data-plus-pill="" className="rounded-pill border border-premium/40 bg-premium/[0.08] px-1.5 py-px font-sans text-caption font-semibold text-premium-ink">
            {t("settings.discordPlusPill")}
          </span>
        ) : null}
      </button>

      {/* Where the line went, said aloud; the sheet has shown it to the eye. */}
      <span className="sr-only" aria-live="polite">
        {done ? t("study.florilegium.gatheredInto", { name: done }) : ""}
      </span>

      <FlorilegiumPickerSheet open={open} item={item} onClose={() => setOpen(false)} onGathered={gathered} />
    </>
  );
}
