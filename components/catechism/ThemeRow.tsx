"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { apiFetch } from "@/lib/api/client";
import { READING_THEME_KEY, coerceReadingTheme, themeLabel, type ReadingTheme } from "@/lib/reader/readingModes";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

/**
 * The one sentence under a completed collection about its palette, and the
 * one control that applies it.
 *
 * Entitled: "This collection carries the Councils palette." and a button.
 * Not entitled: the same sentence with ", a Purify Plus tool." and a plain
 * link to /plan. No padlock, no countdown, no modal. While the gate is
 * still resolving, the sentence alone.
 *
 * Applying, signed in, goes through PUT /api/account/theme first and the
 * palette is set only on a 200: the entitlement is enforced on the server
 * at the write (lib/reader/themeWrite.ts), and the client gate is the fast
 * path that decides what to offer. Signed out there is no account to
 * enforce against, and the palette follows the client gate exactly as
 * Candlelight does from the reader's settings.
 *
 * The palette itself is written the way ReaderPrefs writes it: the storage
 * key and the in-tab event AppThemeController listens to, which sets the
 * attribute and lets the 350ms body transition carry the change. Nothing
 * else moves.
 */
const PREFS_EVENT = "purify:reader-prefs";

function readStored(): ReadingTheme {
  try {
    return coerceReadingTheme(window.localStorage.getItem(READING_THEME_KEY));
  } catch {
    return "default";
  }
}

function writeStored(theme: ReadingTheme): void {
  try {
    window.localStorage.setItem(READING_THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  } catch {
    /* storage blocked: the palette holds for nothing, and says so below */
  }
}

export function ThemeRow({ themeId }: { themeId: string }) {
  const { t } = useTranslate();
  const theme = coerceReadingTheme(themeId);
  const palette = themeLabel(theme);
  const { allows, locked } = usePlusReadingModes();
  const [current, setCurrent] = useState<ReadingTheme>("default");
  const [state, setState] = useState<"idle" | "busy" | "refused" | "failed">("idle");

  useEffect(() => {
    const sync = () => setCurrent(readStored());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const apply = useCallback(
    async (next: ReadingTheme) => {
      setState("busy");
      if (!readLocalSessionUser()) {
        writeStored(next);
        setState("idle");
        return;
      }
      try {
        const r = await apiFetch("/api/account/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_id: next }),
        });
        if (r.status === 200) {
          writeStored(next);
          setState("idle");
        } else if (r.status === 403) {
          setState("refused");
        } else {
          setState("failed");
        }
      } catch {
        setState("failed");
      }
    },
    [],
  );

  if (theme === "default") return null;

  const active = current === theme;
  const entitled = allows(theme) && state !== "refused";
  const plusOnly = locked || state === "refused";

  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p className="font-serif text-detail leading-[1.6] text-paper/70">
        {plusOnly
          ? t("catechism.collections.theme.plus", { palette })
          : active
            ? t("catechism.collections.theme.on", { palette })
            : t("catechism.collections.theme.carries", { palette })}
      </p>
      {plusOnly ? (
        <Link
          href="/plan"
          className="font-sans text-caption text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm"
        >
          {t("catechism.collections.theme.planLink")}
        </Link>
      ) : entitled ? (
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => void apply(active ? "default" : theme)}
          className="font-sans text-caption text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 rounded-sm transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
        >
          {t(active ? "catechism.collections.theme.remove" : "catechism.collections.theme.apply")}
        </button>
      ) : null}
      {state === "failed" && (
        <p role="status" className="basis-full font-sans text-caption text-paper/55">
          {t("catechism.collections.theme.failed")}
        </p>
      )}
    </div>
  );
}
