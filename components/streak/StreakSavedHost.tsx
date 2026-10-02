"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { haptic } from "@/lib/ui/motion";
import { acknowledgeSave, useStreak } from "@/lib/streak/useStreak";
import { StreakFlame } from "./StreakFlame";

/**
 * "It's okay. We got you this time." The one moment a hidden save shows
 * itself: the first time Purify is open after a save held a missed day. The
 * ember relights to a full red flame, and the sheet never says how many saves
 * there were or that there are more (the owner, 2026-10-02: "so they don't get
 * used to it").
 *
 * Mounted once, app-wide. Told once per save: closing it tells the server
 * (or, signed out, this device).
 */
export function StreakSavedHost() {
  const { t, tn } = useTranslate();
  const view = useStreak();
  const [open, setOpen] = useState(false);
  const due = view.ready && view.saved && view.current > 0;

  useEffect(() => {
    if (!due || open) return;
    // A beat after the page settles, so it reads as a moment, not a pop-up
    // that arrived with the page.
    const id = window.setTimeout(() => {
      setOpen(true);
      haptic("medium");
    }, 900);
    return () => window.clearTimeout(id);
  }, [due, open]);

  function close() {
    setOpen(false);
    acknowledgeSave();
  }

  return (
    <Sheet open={open} onClose={close} title={t("streak.title")} desktop openFull>
      <div className="flex flex-col items-center pb-1 pt-2 text-center">
        <div className="relative grid place-items-center">
          <span
            aria-hidden
            className="streak-glow-in pointer-events-none absolute inset-[-45%] rounded-full bg-[radial-gradient(circle,rgb(255_90_79/0.38),transparent_62%)]"
          />
          <span className="streak-relight relative inline-flex">
            <StreakFlame size={96} state="lit" flicker />
          </span>
        </div>
        <p className="mt-5 font-serif text-title-sm leading-tight text-paper">{t("streak.savedTitle")}</p>
        <p className="mt-2 font-sans text-ui text-paper/75">{tn("streak.savedBody", view.current)}</p>
        <button
          type="button"
          onClick={close}
          className="mt-6 inline-flex min-h-12 w-full max-w-[320px] items-center justify-center rounded-pill bg-crimson px-6 font-sans text-ui font-semibold text-white"
        >
          {t("streak.savedAction")}
        </button>
      </div>
    </Sheet>
  );
}
