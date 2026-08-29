"use client";

import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // Focus the sheet when it opens, and hand focus back to More when it closes.
  // Without this a keyboard or screen-reader user opens a panel they are not
  // in, and closes it into the top of the document.
  useEffect(() => {
    if (sheetOpen) sheetRef.current?.focus();
    else moreRef.current?.focus({ preventScroll: true });
  }, [sheetOpen]);

  function go(id: string) {
    onSelect(id);
    setSheetOpen(false);
  }

  return (
    <>
      {sheetOpen ? (
        <div className="adm lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close menu"
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
            className="relative max-h-[78dvh] overflow-y-auto rounded-t-3xl border-t px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 outline-none"
            style={{
              background: "var(--adm-rail)",
              borderColor: "var(--adm-line)",
            }}
          >
            {/* Grab handle: the affordance that says this panel came from the
                bottom and goes back there. */}
            <div
              aria-hidden
              className="mx-auto mb-4 h-1 w-10 rounded-full"
              style={{ background: "var(--adm-line)" }}
            />
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
