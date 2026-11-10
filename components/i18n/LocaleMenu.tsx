"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { coverageWords } from "@/lib/i18n/coverage";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";
import { useIsNative } from "@/lib/platform/native";
import { useTranslate } from "./MessagesProvider";

/** How near a side of the screen, or the tab bar, the open list may come, in CSS pixels. */
const EDGE_PX = 16;
/** The space between the trigger and the list (the classes' mt-2 and mb-2). */
const GAP_PX = 8;
/** Below this, a list that opens downward opens upward instead, where there is more room: about four languages. */
const MIN_LIST_PX = 200;

/**
 * The grouped locale list shared by the footer switcher and the account
 * settings picker: fully-ready locales under "Available", editorial
 * previews under "In progress", then not-yet-started ones under "Coming
 * soon". Selectable rows call onSelect; coming-soon rows link to the
 * "become a language editor" page on the web and render as plain rows in
 * the native app, where that route is stashed out of the static export.
 */
export function LocaleMenu({
  locale,
  onSelect,
  onNavigate,
  placement,
}: {
  locale: LocaleCode;
  onSelect: (next: LocaleCode) => void;
  /** Called when a coming-soon link is followed so the popover closes. */
  onNavigate: () => void;
  placement: "up" | "down";
}) {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const listRef = useRef<HTMLUListElement>(null);

  // The list opens from its trigger, at the trigger's start, wherever the
  // trigger stands, and stays whole on the screen (1.9). On a phone a trigger
  // part way along a row ran a list this wide past the screen's edge: in
  // Settings, with the picker after the globe, it opened off the left edge
  // and its names could not be seen at 390px. And opened downward it ran on
  // under the tab bar, where its last languages could never be scrolled into
  // sight. So once drawn it moves sideways, if it must, to keep EDGE_PX from
  // either side; a list that opens downward stops EDGE_PX above the tab bar,
  // and opens upward instead, under the top bar, when there is not room for
  // MIN_LIST_PX below and there is more above. Again if the screen turns.
  // Written to the element, not kept as state: nothing is drawn twice for it.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const edge = (selector: string, side: "top" | "bottom"): number | null => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box && box.height > 0 ? box[side] : null;
    };
    const fit = () => {
      el.style.translate = "";
      el.style.maxHeight = "";
      el.style.top = el.style.bottom = el.style.marginTop = el.style.marginBottom = "";
      const r = el.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const dx = r.left < EDGE_PX ? EDGE_PX - r.left : r.right > width - EDGE_PX ? width - EDGE_PX - r.right : 0;
      if (dx) el.style.translate = `${Math.round(dx)}px 0`;
      if (placement !== "down") return;
      const anchor = (el.offsetParent ?? el.parentElement)?.getBoundingClientRect();
      if (!anchor) return;
      const floor = Math.min(window.innerHeight, edge("[data-tab-bar]", "top") ?? Infinity) - EDGE_PX;
      const ceiling = (edge("[data-mobile-topbar]", "bottom") ?? 0) + EDGE_PX;
      const below = floor - anchor.bottom - GAP_PX;
      const above = anchor.top - GAP_PX - ceiling;
      if (r.height <= below) return;
      if (below >= MIN_LIST_PX || below >= above) {
        el.style.maxHeight = `${Math.max(0, Math.floor(below))}px`;
        return;
      }
      el.style.top = "auto";
      el.style.bottom = "100%";
      el.style.marginTop = "0";
      el.style.marginBottom = `${GAP_PX}px`;
      el.style.maxHeight = `${Math.floor(Math.min(r.height, above))}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [placement]);

  const ready = LOCALES.filter((l) => l.ready);
  const editorial = LOCALES.filter((l) => !l.ready && l.editorial);
  const notReady = LOCALES.filter((l) => !l.ready && !l.editorial);
  const inProgressLabel = t("footer.localeGroupInProgress");

  const position =
    placement === "up" ? "bottom-full start-0 mb-2" : "top-full start-0 mt-2";

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={t("footer.languageLabel")}
      className={`absolute ${position} z-50 w-[20rem] text-start max-w-[calc(100vw-2rem)] max-h-[min(60vh,22rem)] overflow-y-auto overscroll-contain rounded-lg border border-paper/12 bg-night-soft py-1.5 shadow-xl shadow-black/40 [scrollbar-width:thin]`}
    >
      {/* Menu title */}
      <li
        role="presentation"
        className="px-3 pb-2 pt-1.5 font-sans text-caption font-semibold text-paper/60"
      >
        {t("footer.languageLabel")}
      </li>

      {/* Available */}
      <li
        role="presentation"
        className="px-3 pb-1 pt-1 font-sans text-caption text-paper/55"
      >
        {t("footer.localeGroupAvailable")}
      </li>
      {ready.map((l) => {
        const active = l.code === locale;
        return (
          <li key={l.code} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(l.code)}
              dir={l.dir}
              className={`flex min-h-11 w-full items-center gap-3 px-3 py-1.5 text-left font-sans text-caption transition-colors ${
                active ? "bg-paper/[0.04]" : "hover:bg-paper/[0.06]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  <span lang={l.code} dir={textDir(l.code)} className={`${active ? "text-gold" : "text-paper/90"} ${l.englishLabel !== l.nativeLabel ? "me-1.5" : ""}`}>
                    {l.nativeLabel}
                  </span>
                  {l.englishLabel !== l.nativeLabel && (
                    <span lang="en" dir="ltr" className="text-[11px] text-paper/55">
                      ({l.englishLabel})
                    </span>
                  )}
                </span>
                {/* What the language covers, in its own words (lib/i18n/coverage.ts). */}
                <span lang={l.code} dir={textDir(l.code)} data-language-covers={l.code} className="block truncate text-[11px] leading-snug text-paper/60">
                  {coverageWords(l.code)}
                </span>
              </span>
              {active ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-gold" />
              ) : null}
            </button>
          </li>
        );
      })}

      {/* In progress (editorial preview) — selectable, English fallback */}
      {editorial.length > 0 && (
        <>
          <li
            role="presentation"
            className="mt-1 border-t border-paper/8 px-3 pb-1 pt-2.5 font-sans text-caption text-paper/55"
          >
            {inProgressLabel}
          </li>
          {editorial.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => onSelect(l.code)}
                  dir={l.dir}
                  className={`flex min-h-11 w-full items-center gap-3 px-3 py-1.5 text-left font-sans text-caption transition-colors ${
                    active ? "bg-paper/[0.04]" : "hover:bg-paper/[0.06]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      <span lang={l.code} dir={textDir(l.code)} className={`${active ? "text-gold" : "text-paper/90"} ${l.englishLabel !== l.nativeLabel ? "me-1.5" : ""}`}>
                        {l.nativeLabel}
                      </span>
                      {l.englishLabel !== l.nativeLabel && (
                        <span lang="en" dir="ltr" className="text-[11px] text-paper/55">
                          ({l.englishLabel})
                        </span>
                      )}
                    </span>
                    <span lang={l.code} dir={textDir(l.code)} data-language-covers={l.code} className="block truncate text-[11px] leading-snug text-paper/60">
                      {coverageWords(l.code)}
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-gold" />
                  ) : (
                    <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-gold/10 px-2 text-caption text-gold/70">
                      {inProgressLabel}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </>
      )}

      {/* Coming soon (hidden while every locale ships public) */}
      {notReady.length > 0 && (
        <li
          role="presentation"
          className="mt-1 border-t border-paper/8 px-3 pb-1 pt-2.5 font-sans text-caption text-paper/55"
        >
          {t("signin.comingSoon")}
        </li>
      )}
      {notReady.map((l) => {
        const inner = (
          <>
            <span className="min-w-0 flex-1 truncate">
              <span className="me-1.5 text-paper/85">{l.nativeLabel}</span>
              <span className="text-[11px] text-paper/55">
                ({l.englishLabel})
              </span>
            </span>
            <span className="inline-flex h-5 w-[6.5rem] shrink-0 items-center justify-center rounded-full bg-paper/[0.07] text-caption text-paper/55">
              {l.comingSoon}
            </span>
          </>
        );
        return (
          <li key={l.code} role="option" aria-selected={false}>
            {isNative ? (
              // The language-editor route is web-only (stashed from the
              // Android export): render a plain, non-navigating row.
              <span
                dir={l.dir}
                className="flex h-11 w-full items-center gap-3 px-3 text-left font-sans text-caption"
              >
                {inner}
              </span>
            ) : (
              // Not-yet-translated languages route to the "become a
              // language editor" page (personalized by ?lang=).
              <Link
                href={`/language-editor?lang=${l.code}`}
                onClick={onNavigate}
                dir={l.dir}
                className="flex h-11 w-full items-center gap-3 px-3 text-left font-sans text-caption transition-colors hover:bg-paper/[0.06]"
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5 L10 17.5 L19 6.5" />
    </svg>
  );
}
