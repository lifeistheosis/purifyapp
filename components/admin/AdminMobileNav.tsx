"use client";

import { useEffect, useRef, useState } from "react";

import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { larpOn, setLarp } from "@/lib/admin/larp";

import { ADMIN_TAB_ICONS, ADMIN_TAB_ICON_FALLBACK } from "./nav-icons";
import { cn } from "@/lib/cn";

/**
 * The admin's navigation below `lg`.
 *
 * ── Why a bar and not the rail ──────────────────────────────────────────
 *
 * The desktop rail carries twenty tabs in five labelled groups down the left
 * edge. That is the right shape for a 1400px window and there is no honest way
 * to fold it into 390px: a scaled rail is a 44px-wide column of truncated
 * words, and a hamburger charges a tap for every move an operator makes.
 *
 * So the phone gets a different structure rather than a squeezed one. Four
 * destinations sit in the thumb's arc, chosen from what the operator said they
 * actually do standing up: read the numbers, fulfil orders, answer people,
 * work the shop. Everything else, and there is a lot of it, lives one tap away
 * behind More, still in its groups, because full parity was the brief.
 *
 * ── Matching the app, not inventing a second grammar ────────────────────
 *
 * lg, NOT md: the desktop rail is `hidden lg:flex`, so a bar that stopped at
 * md would leave 768 to 1023 with no navigation at all.
 *
 * Purify already has a bottom bar in components/nav/MobileTabBar.tsx. This
 * borrows its geometry deliberately: the same 58px target, the same
 * safe-bottom-pad, the same rounded slab. An operator who uses both should not
 * have to learn two bottom bars.
 *
 * No backdrop blur. The surface is opaque. A blurred bar over a scrolling
 * table asks the compositor to re-blur on every frame of the scroll, which is
 * the same cost that made the product dialog crawl.
 */

export type MobileNavTab = { id: string; label: string };
export type MobileNavGroup = { group: string; tabs: MobileNavTab[] };

/**
 * The four that earn a permanent slot. Everything else is reachable in one
 * more tap, which is the correct trade for a destination nobody opens while
 * standing in a queue.
 */
const PRIMARY = ["overview", "orders", "messages", "shop"] as const;

export function AdminMobileNav({
  groups,
  active,
  onSelect,
  footer,
}: {
  groups: MobileNavGroup[];
  active: string;
  onSelect: (id: string) => void;
  /**
   * The account block and the cache controls that used to live at the bottom
   * of the Sections drawer. They come here rather than being dropped, because
   * removing that drawer would otherwise make "Sign out" and "Rebuild caches"
   * unreachable on any screen below lg.
   */
  footer?: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  const all = groups.flatMap((g) => g.tabs);
  const primary = PRIMARY.map((id) => all.find((t) => t.id === id)).filter(
    (t): t is MobileNavTab => !!t,
  );
  // "More" carries the badge of being current whenever the open tab is not one
  // of the four, so the bar never shows nothing selected.
  const activeIsPrimary = primary.some((t) => t.id === active);

  const hasOpened = useRef(false);

  // LARP MODE, the phone's way in.
  //
  // On a desktop the mode is armed by typing "larp" with focus outside a text
  // field. A phone cannot do that: the soft keyboard only opens WHEN a field is
  // focused, and the listener deliberately ignores keystrokes from one, so the
  // gesture is unreachable on exactly the screens the mode was built to help
  // design. Five taps on the grab handle is the mobile equivalent: deliberate
  // enough that nobody arrives here by accident, on a target that is decorative
  // and does nothing else.
  const taps = useRef({ count: 0, at: 0 });
  function tapHandle() {
    const now = Date.now();
    const s = taps.current;
    s.count = now - s.at < 800 ? s.count + 1 : 1;
    s.at = now;
    if (s.count >= 5) {
      s.count = 0;
      setLarp(!larpOn());
      // Same reason as the keyboard path: every tab reads through adminJson, so
      // a full reload is the honest way to get a consistent panel.
      window.location.reload();
    }
  }

  // Escape closes, and Tab cycles INSIDE the sheet.
  //
  // The trap is not decoration. This panel claims aria-modal="true", and Modal
  // in primitives.tsx already spells out why that claim without a trap is worse
  // than neither: the reader goes quiet about the page while Tab walks straight
  // out into it. DOM order puts the <nav> after the sheet, so one Tab past the
  // last section button landed on the bottom bar, which is aria-hidden and
  // painted under the scrim, and kept going into the topbar search and every
  // control in the tab behind it.
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
  }, [sheetOpen]);

  // Freeze the page behind the sheet, through the same refcounted helper every
  // other overlay here uses. In ops mode the list is 19 tabs plus five group
  // headers plus the footer, comfortably more than the 78dvh the panel gets, so
  // the flick that reaches its end chained out into the document and closing
  // the sheet left the operator somewhere else in the tab they were reading.
  useEffect(() => {
    if (!sheetOpen) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [sheetOpen]);

  // Focus into the sheet on open, back to More on close.
  //
  // hasOpened is the entire reason this ref exists. Without it the else branch
  // runs on the FIRST commit, when sheetOpen is already false, so every load of
  // /admin below lg dropped focus on the last control in the document. The
  // preventScroll that keeps it visually quiet is what made it hard to see: the
  // only symptom was that the first Space pressed opened the sections sheet
  // instead of scrolling the page.
  useEffect(() => {
    if (sheetOpen) {
      hasOpened.current = true;
      sheetRef.current?.focus();
    } else if (hasOpened.current) {
      moreRef.current?.focus({ preventScroll: true });
    }
  }, [sheetOpen]);

  function go(id: string) {
    onSelect(id);
    setSheetOpen(false);
  }

  return (
    <>
      {sheetOpen ? (
        <div className="adm lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Tap-anywhere-to-close, and nothing else. aria-hidden and out of
              the tab order for the reason Modal states: a viewport-sized
              control announced only as "Close" was otherwise the first thing a
              reader met inside the dialog, ahead of the section list. Escape
              is the keyboard path, and unlike an invisible button it is one an
              operator can be told about. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0"
            style={{ background: "var(--adm-scrim)" }}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="All admin sections"
            tabIndex={-1}
            className="relative max-h-[78dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 outline-none"
            style={{
              background: "var(--adm-rail)",
              borderColor: "var(--adm-line)",
            }}
          >
            {/* Grab handle: the affordance that says this panel came from the
                bottom and goes back there. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={tapHandle}
              // Padding, not a height class: the hairline stays 4px while the
              // tappable box is ~40px, so the secret is findable by someone who
              // knows it is there and invisible to everyone else.
              className="mx-auto mb-2 block px-6 py-3"
            >
              <span
                className="block h-1 w-10 rounded-full"
                style={{ background: "var(--adm-line)" }}
              />
            </button>
            {groups.map((g) => (
              <div key={g.group} className="mb-5 last:mb-0">
                <p className="mb-2 font-sans text-caption font-semibold uppercase tracking-[1.1px] text-[color:var(--adm-ink-3)]">
                  {g.group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {g.tabs.map((t) => {
                    const on = t.id === active;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => go(t.id)}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "flex min-h-[52px] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left font-sans text-detail transition-colors",
                          on
                            ? "border-gold/45 bg-gold/[0.10] text-gold-pale"
                            : "border-paper/10 bg-paper/[0.03] text-paper/80 active:bg-paper/[0.07]",
                        )}
                      >
                        <span className="shrink-0 opacity-80">
                          {ADMIN_TAB_ICONS[t.id] ?? ADMIN_TAB_ICON_FALLBACK}
                        </span>
                        <span className="min-w-0 truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {footer ? (
              <div
                className="mt-5 space-y-3 border-t pt-4"
                style={{ borderColor: "var(--adm-line)" }}
              >
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav
        // Distinct from the desktop rail, which is also a <nav aria-label="Admin
        // sections">. Both sit in the DOM at once (each hides by breakpoint, not by
        // unmounting), and two landmarks sharing one accessible name is a real
        // navigation ambiguity for a screen reader even when only one is painted.
        aria-label="Admin sections, primary"
        aria-hidden={sheetOpen || undefined}
        className="adm lg:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        style={{
          // Opaque, with a hairline. See the note above on why this is not a
          // blurred bar.
          background: "var(--adm-rail)",
          borderTop: "1px solid var(--adm-line)",
        }}
      >
        <ul className="flex items-stretch justify-between gap-1">
          {primary.map((t) => {
            const on = t.id === active;
            return (
              <li key={t.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors",
                    on ? "text-gold-pale" : "text-paper/55 active:text-paper/80",
                  )}
                >
                  <span className={on ? "opacity-100" : "opacity-70"}>
                    {ADMIN_TAB_ICONS[t.id] ?? ADMIN_TAB_ICON_FALLBACK}
                  </span>
                  <span className="w-full truncate text-center font-sans text-eyebrow font-medium">
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
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className={cn(
                "flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors",
                activeIsPrimary
                  ? "text-paper/55 active:text-paper/80"
                  : "text-gold-pale",
              )}
            >
              <span aria-hidden className="flex h-[18px] items-end gap-[3px]">
                <i className="h-1 w-1 rounded-full bg-current" />
                <i className="h-1 w-1 rounded-full bg-current" />
                <i className="h-1 w-1 rounded-full bg-current" />
              </span>
              <span className="w-full truncate text-center font-sans text-eyebrow font-medium">
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
