"use client";

import Link from "next/link";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { useIsNative } from "@/lib/platform/native";
import { useTranslate } from "./MessagesProvider";

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

  const ready = LOCALES.filter((l) => l.ready);
  const editorial = LOCALES.filter((l) => !l.ready && l.editorial);
  const notReady = LOCALES.filter((l) => !l.ready && !l.editorial);
  const inProgressLabel = t("footer.localeGroupInProgress");

  const position =
    placement === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2";

  return (
    <ul
      role="listbox"
      aria-label={t("footer.languageLabel")}
      className={`absolute ${position} z-50 w-[20rem] max-w-[92vw] max-h-[min(60vh,22rem)] overflow-y-auto overscroll-contain rounded-lg border border-paper/12 bg-night-soft py-1.5 shadow-xl shadow-black/40 [scrollbar-width:thin]`}
    >
      {/* Menu title */}
      <li
        role="presentation"
        className="px-3 pb-2 pt-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-paper/40"
      >
        {t("footer.languageLabel")}
      </li>

      {/* Available */}
      <li
        role="presentation"
        className="px-3 pb-1 pt-1 font-sans text-[10px] uppercase tracking-[0.1em] text-paper/30"
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
              className={`flex h-11 w-full items-center gap-3 px-3 text-left font-sans text-caption transition-colors ${
                active ? "bg-paper/[0.04]" : "hover:bg-paper/[0.06]"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className={active ? "text-gold" : "text-paper/90"}>
                  {l.nativeLabel}
                </span>
                {l.englishLabel !== l.nativeLabel && (
                  <span className="ml-1.5 text-[11px] text-paper/35">
                    ({l.englishLabel})
                  </span>
                )}
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
            className="mt-1 border-t border-paper/8 px-3 pb-1 pt-2.5 font-sans text-[10px] uppercase tracking-[0.1em] text-paper/30"
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
                  className={`flex h-11 w-full items-center gap-3 px-3 text-left font-sans text-caption transition-colors ${
                    active ? "bg-paper/[0.04]" : "hover:bg-paper/[0.06]"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className={active ? "text-gold" : "text-paper/90"}>
                      {l.nativeLabel}
                    </span>
                    {l.englishLabel !== l.nativeLabel && (
                      <span className="ml-1.5 text-[11px] text-paper/35">
                        ({l.englishLabel})
                      </span>
                    )}
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-gold" />
                  ) : (
                    <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-gold/10 px-2 text-[10px] uppercase tracking-[0.02em] text-gold/70">
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
          className="mt-1 border-t border-paper/8 px-3 pb-1 pt-2.5 font-sans text-[10px] uppercase tracking-[0.1em] text-paper/30"
        >
          {t("signin.comingSoon")}
        </li>
      )}
      {notReady.map((l) => {
        const inner = (
          <>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-paper/85">{l.nativeLabel}</span>
              <span className="ml-1.5 text-[11px] text-paper/35">
                ({l.englishLabel})
              </span>
            </span>
            <span className="inline-flex h-5 w-[6.5rem] shrink-0 items-center justify-center rounded-full bg-paper/[0.07] text-[10px] uppercase tracking-[0.02em] text-paper/55">
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
