"use client";

// The one question the desktop app asks when it first opens: show Purify on
// Discord?
//
// Discord status shipped in 1.4 switched off, reachable only from Settings,
// Discord status. It worked (checked 2026-09-27 in the installed app: turned
// on, it connected to Discord at once), but a reader who never opened that
// page never learned it existed, and the owner's verdict on the release was
// that it "never got shipped". Asking once, on first open, was the owner's
// choice over turning it on for everyone: nothing is shared until a reader
// says yes, and nobody has to go looking.
//
// Shown only in the desktop app, only while the reader has neither a saved
// Discord setting nor an answer to this card (lib/desktop/presencePref.ts),
// and never again once either button is pressed. "Turn on" chooses exactly
// what the switch in Settings chooses. Not a modal: it sits in the corner and
// the page stays usable around it. Sized with insets, never vw: Windows
// counts its scrollbar in 100vw, which pushed a vw-sized card off the left
// edge of a narrow window.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { isDesktopApp } from "@/lib/desktop/bridge";
import {
  markPresenceAsked,
  presenceAnswered,
  readPresencePrefs,
  writePresencePrefs,
} from "@/lib/desktop/presencePref";

/** Long enough for the first page to settle, so the card never lands on a half-drawn screen. */
const DELAY_MS = 2500;

export function DiscordFirstRun() {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDesktopApp() || presenceAnswered()) return;
    const timer = window.setTimeout(() => {
      // Asked again now: the reader may have used Settings meanwhile.
      if (!presenceAnswered()) setOpen(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  const answer = (turnOn: boolean) => {
    markPresenceAsked();
    if (turnOn) writePresencePrefs({ ...readPresencePrefs(), mode: "reading" });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="discord-first-run-title"
      aria-describedby="discord-first-run-body"
      className="fixed inset-x-4 bottom-4 z-[55] rounded-2xl border border-paper/15 bg-night/95 p-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
    >
      <p
        id="discord-first-run-title"
        role="heading"
        aria-level={2}
        className="font-sans text-ui font-semibold leading-snug text-paper"
      >
        {t("discordAsk.title")}
      </p>
      <p id="discord-first-run-body" className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/70">
        {t("discordAsk.body")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => answer(true)}
          className="min-h-11 rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
        >
          {t("discordAsk.turnOn")}
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          className="min-h-11 rounded-pill px-4 font-sans text-detail font-medium text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          {t("discordAsk.notNow")}
        </button>
      </div>
    </div>
  );
}
