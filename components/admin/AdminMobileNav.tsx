"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { larpOn, setLarp } from "@/lib/admin/larp";

import { ADMIN_TAB_ICONS, ADMIN_TAB_ICON_FALLBACK } from "./nav-icons";
import { StatusDot } from "./primitives";
import { cn } from "@/lib/cn";

/**
 * The admin's navigation below `lg`.
 *
 * ── Why a bar and not the rail ──────────────────────────────────────────
 *
 * The desktop rail is the right shape for a wide window and there is no
 * honest way to fold it into 390px. So the phone gets a different structure
 * rather than a squeezed one. Four destinations sit in the thumb's arc: the
 * rail's Daily, Home and the three pages he reads most (the owner's pick A,
 * 2026-10-28). Everything else is one tap away behind More.
 *
 * ── More, as rows (the owner's pick A on sheet r3-15, 2026-10-30) ───────
 *
 * More used to open a grid of boxed tiles over the whole screen. It is a
 * sheet above the bar now, and the bar stays in sight under it with More lit:
 * When needed as rows, each page with what it is for and who is waiting
 * behind it; the Tools as quiet two-column rows; and You, the account, when
 * the numbers were true, the Operations | Owner switch, Settings and Sign
 * out.
 *
 * ── Matching the app, not inventing a second grammar ────────────────────
 *
 * lg, NOT md: the desktop rail is `hidden lg:flex`, so a bar that stopped at
 * md would leave 768 to 1023 with no navigation at all. The geometry is
 * borrowed from components/nav/MobileTabBar.tsx: the same 58px target, the
 * same safe-bottom pad. No backdrop blur: a blurred bar over a scrolling
 * table re-blurs on every frame of the scroll.
 */

export type MobileNavTab = {
  id: string;
  label: string;
  /** The page's sentence, under its name in the sheet. */
  sentence?: string;
  /** Who is waiting behind the page, or null. */
  badge?: { count: number; title: string } | null;
};
export type MobileNavGroup = {
  group: string;
  tabs: MobileNavTab[];
  /** The rail's Tools: drawn as quiet text rows in the sheet. */
  quiet?: boolean;
};

/**
 * The bar's height, which the sheet stops above. 58px items with 8px over
 * them and at least 8px under, plus the home indicator. .adm-canvas in
 * admin-theme.css clears the same figure; change them together.
 */
const BAR_H = "calc(74px + env(safe-area-inset-bottom, 0px))";

export function AdminMobileNav({
  groups,
  primary: primaryIds,
  active,
  onSelect,
  you,
}: {
  groups: MobileNavGroup[];
  /**
   * The ids that earn a permanent slot, in order: the rail's Daily. An id no
   * group holds is skipped. Everything else is reachable in one more tap.
   */
  primary: readonly string[];
  active: string;
  onSelect: (id: string) => void;
  /**
   * The You rows: the account, the mode switch, Settings and Sign out. They
   * come here because the rail's foot is not on screen below lg, and without
   * them Sign out would be unreachable on a phone.
   */
  you?: ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // The sheet follows the finger like every pop-up card: it slides with the
  // drag, closes on a flick down, and the scrim dims in step.
  const reduced = useReducedMotion();
  const {
    mounted,
    panelRef: sheetRef,
    scrimRef,
    bodyRef,
  } = useDraggableSheet({ open: sheetOpen, onClose: () => setSheetOpen(false), reduced, half: 1 });
  const moreRef = useRef<HTMLButtonElement | null>(null);

  const all = groups.flatMap((g) => g.tabs);
  const primary = primaryIds
    .map((id) => all.find((t) => t.id === id))
    .filter((t): t is MobileNavTab => !!t);
  const primarySet = new Set(primary.map((t) => t.id));
  // The sheet holds what the bar does not: When needed, the Tools, You.
  const sheetGroups = groups
    .map((g) => ({ ...g, tabs: g.tabs.filter((t) => !primarySet.has(t.id)) }))
    .filter((g) => g.tabs.length > 0);
  // More is lit whenever the open page is not one of the four, or the sheet
  // is open, so the bar never shows nothing selected.
  const activeIsPrimary = primary.some((t) => t.id === active);
  const moreOn = sheetOpen || !activeIsPrimary;

  const hasOpened = useRef(false);

  // LARP MODE, the phone's way in: five taps on the grab handle. A phone
  // cannot type "larp" outside a text field, which is how the desktop arms it.
  const taps = useRef({ count: 0, at: 0 });
  function tapHandle() {
    const now = Date.now();
    const s = taps.current;
    s.count = now - s.at < 800 ? s.count + 1 : 1;
    s.at = now;
    if (s.count >= 5) {
      s.count = 0;
      setLarp(!larpOn());
      window.location.reload();
    }
  }

  // Escape closes, and Tab cycles INSIDE the sheet: it claims aria-modal, and
  // that claim without a trap lets Tab walk out into the page behind it.
  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = sheetRef.current;
      if (!panel) return;
      const stops = focusablesIn(panel);
      if (stops.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const here = stops.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      stops[nextIndex(stops.length, here, e.shiftKey)]?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, sheetRef]);

  // Freeze the page behind the sheet, through the refcounted helper every
  // other overlay here uses, so a flick that reaches the sheet's end does not
  // chain out and scroll the page.
  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [mounted]);

  // Focus into the sheet on open, back to More on close. hasOpened keeps the
  // first commit, when the sheet is already closed, from moving focus at all.
  useEffect(() => {
    if (sheetOpen) {
      hasOpened.current = true;
      sheetRef.current?.focus({ preventScroll: true });
    } else if (hasOpened.current) {
      moreRef.current?.focus({ preventScroll: true });
    }
  }, [sheetOpen, mounted, sheetRef]);

  function go(id: string) {
    onSelect(id);
    setSheetOpen(false);
  }

  return (
    <>
      {mounted ? (
        // Above the bar, not over it: the container stops at the bar's top,
        // so the bar stays in sight with More lit while the sheet is open.
        <div className="adm lg:hidden fixed inset-x-0 top-0 z-[60] flex flex-col justify-end" style={{ bottom: BAR_H }}>
          {/* Tap-anywhere-to-close, and nothing else. aria-hidden and out of
              the tab order: Escape is the keyboard path. */}
          <button
            ref={scrimRef}
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0"
            style={{ background: "var(--adm-scrim)", opacity: 0 }}
          />
          <div
            ref={(el) => {
              sheetRef.current = el;
              bodyRef.current = el;
            }}
            role="dialog"
            aria-modal="true"
            aria-label="More admin pages"
            tabIndex={-1}
            className="relative mx-2 mb-2 max-h-[78dvh] overflow-y-auto overscroll-contain rounded-[22px] border px-4 pb-3 pt-1.5 outline-none will-change-transform"
            style={{
              background: "var(--adm-rail)",
              borderColor: "var(--adm-line-strong)",
              boxShadow: "var(--adm-shadow-pop)",
            }}
          >
            {/* Grab handle: this panel came from the bottom and goes back
                there. Five taps on it is the phone's way into larp mode. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={tapHandle}
              className="mx-auto mb-1 block px-6 py-3"
            >
              <span className="block h-[4px] w-10 rounded-full" style={{ background: "var(--adm-line-strong)" }} />
            </button>
            {sheetGroups.map((g) => (
              <div key={g.group} className="mb-4">
                {/* The same words, set the same way, as the rail's group names. */}
                <p className="mb-2 px-0.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {g.group}
                </p>
                {g.quiet ? (
                  // The Tools, quiet here too: two columns of text rows in one
                  // box, each a full thumb's height.
                  <div
                    className="grid grid-cols-2 gap-x-3 rounded-[12px] border px-2 py-1"
                    style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
                  >
                    {g.tabs.map((t) => {
                      const on = t.id === active;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => go(t.id)}
                          aria-current={on ? "page" : undefined}
                          className="flex min-h-11 items-center rounded-[8px] px-2 text-left font-sans text-[13.5px]"
                          style={{ color: on ? "var(--adm-ink)" : "var(--adm-ink-2)", fontWeight: on ? 600 : 400 }}
                        >
                          <span className="min-w-0 truncate">{t.label}</span>
                          {t.badge ? (
                            <span className="ml-1.5 font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }} title={t.badge.title}>
                              {t.badge.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // When needed as rows: the page's glyph, its name and what
                  // it is for, and who is waiting behind it as a ring and a
                  // count at the right.
                  <ul
                    className="divide-y rounded-[12px] border px-3.5"
                    style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
                  >
                    {g.tabs.map((t) => {
                      const on = t.id === active;
                      return (
                        <li key={t.id} className="border-[color:var(--adm-line)]">
                          <button
                            type="button"
                            onClick={() => go(t.id)}
                            aria-current={on ? "page" : undefined}
                            className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left font-sans"
                          >
                            <span className="shrink-0" style={{ color: on ? "var(--adm-ink)" : "var(--adm-ink-2)" }}>
                              {ADMIN_TAB_ICONS[t.id] ?? ADMIN_TAB_ICON_FALLBACK}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block truncate text-[13.5px]"
                                style={{ color: "var(--adm-ink)", fontWeight: on ? 600 : 400 }}
                              >
                                {t.label}
                              </span>
                              {t.sentence ? (
                                <span className="mt-0.5 block truncate text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                                  {t.sentence}
                                </span>
                              ) : null}
                            </span>
                            {t.badge ? (
                              <span
                                className="flex shrink-0 items-center gap-1.5 text-[12px]"
                                style={{ color: "var(--adm-ink-3)" }}
                                title={t.badge.title}
                              >
                                <StatusDot tone="wait" />
                                {t.badge.count} waiting
                              </span>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--adm-ink-3)" }}>
                                <path d="M8 4.5l5.5 5.5L8 15.5" />
                              </svg>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
            {you ? (
              <div className="mb-1">
                <p className="mb-2 px-0.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  You
                </p>
                {you}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav
        // Distinct from the desktop rail's "Admin sections": both sit in the
        // DOM at once, and two landmarks sharing a name is ambiguous for a
        // screen reader even when only one is painted.
        aria-label="Admin sections, primary"
        className="adm lg:hidden fixed inset-x-0 bottom-0 z-50 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: "var(--adm-rail)",
          borderTop: "1px solid var(--adm-line)",
        }}
      >
        <ul className="flex items-stretch justify-between gap-1">
          {primary.map((t) => {
            const on = t.id === active && !sheetOpen;
            return (
              <li key={t.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={t.id === active ? "page" : undefined}
                  className="flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1"
                  style={{ color: on ? "var(--adm-ink)" : "var(--adm-ink-3)" }}
                >
                  <span style={on ? { filter: "var(--adm-glow)" } : undefined}>
                    {ADMIN_TAB_ICONS[t.id] ?? ADMIN_TAB_ICON_FALLBACK}
                  </span>
                  <span className={cn("w-full truncate text-center font-sans text-[11px]", on ? "font-semibold" : "font-medium")}>
                    {t.label}
                  </span>
                </button>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              ref={moreRef}
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1"
              style={{ color: moreOn ? "var(--adm-ink)" : "var(--adm-ink-3)" }}
            >
              <span aria-hidden className="flex h-[18px] items-center gap-[3px]" style={moreOn ? { filter: "var(--adm-glow)" } : undefined}>
                <i className="h-1 w-1 rounded-full bg-current" />
                <i className="h-1 w-1 rounded-full bg-current" />
                <i className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className={cn("w-full truncate text-center font-sans text-[11px]", moreOn ? "font-semibold" : "font-medium")}>
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
