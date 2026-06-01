"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Right-click context menu for a verse. Used by VerseRow.
 *
 * Items are passed in groups; a thin divider renders between groups. The
 * menu positions itself at the cursor coordinates and flips above / left
 * when it would otherwise run off the viewport. Closes on click outside,
 * a second right-click, scroll, or Escape.
 */

export type ContextMenuItem = {
 label: string;
 onClick: () => void;
 /** Optional small secondary label rendered on the right (e.g. shortcut). */
 hint?: string;
 disabled?: boolean;
 /** Tints the hover state red for "remove / clear" style actions. */
 destructive?: boolean;
};

export type ContextMenuGroup = ContextMenuItem[];

export function VerseContextMenu({
 groups,
 x,
 y,
 onClose,
}: {
 groups: ContextMenuGroup[];
 /** Cursor X in viewport coordinates (event.clientX). */
 x: number;
 /** Cursor Y in viewport coordinates (event.clientY). */
 y: number;
 onClose: () => void;
}) {
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") onClose();
 }
 function onDocClick(e: MouseEvent) {
 if (!ref.current?.contains(e.target as Node)) onClose();
 }
 // Second right-click anywhere outside the menu also closes it. The
 // VerseRow's own onContextMenu handler will then open a fresh menu at
 // the new position; the close-first / reopen flow is handled by parent.
 function onContextMenuOutside(e: MouseEvent) {
 if (!ref.current?.contains(e.target as Node)) onClose();
 }
 function onScroll() {
 onClose();
 }
 document.addEventListener("keydown", onKey);
 // Defer the click/contextmenu listeners so the right-click that opened
 // the menu doesn't immediately close it.
 const t = setTimeout(() => {
 document.addEventListener("mousedown", onDocClick);
 document.addEventListener("contextmenu", onContextMenuOutside);
 }, 50);
 window.addEventListener("scroll", onScroll, {
 passive: true,
 capture: true,
 });
 return () => {
 clearTimeout(t);
 document.removeEventListener("keydown", onKey);
 document.removeEventListener("mousedown", onDocClick);
 document.removeEventListener("contextmenu", onContextMenuOutside);
 window.removeEventListener("scroll", onScroll, { capture: true });
 };
 }, [onClose]);

 // Position with viewport edge-flipping. Estimate height from item count so
 // we can flip ABOVE the cursor when the menu would otherwise overflow the
 // bottom edge, same trick the WordPopover uses.
 const PAD = 8;
 const MENU_W = 240;
 const itemCount = groups.reduce((s, g) => s + g.length, 0);
 const dividerCount = Math.max(0, groups.length - 1);
 const MENU_H_EST = 8 + itemCount * 34 + dividerCount * 9;
 let left = x;
 let top = y;
 if (left + MENU_W > window.innerWidth - PAD) {
 left = Math.max(PAD, window.innerWidth - MENU_W - PAD);
 }
 if (top + MENU_H_EST > window.innerHeight - PAD) {
 top = Math.max(PAD, y - MENU_H_EST);
 }

 return (
 <div
 ref={ref}
 role="menu"
 tabIndex={-1}
 aria-label="Verse actions"
 className="fixed z-50 rounded-md border border-paper/15 bg-night-soft shadow-pop py-1 backdrop-blur-sm"
 style={{ width: MENU_W, left, top }}
 // Suppress the native right-click on the menu itself so a second
 // right-click on a menu item doesn't open the browser's context menu.
 onContextMenu={(e) => e.preventDefault()}
 >
 {groups.map((g, gi) => (
 <div key={gi}>
 {gi > 0 && <div className="my-1 h-px bg-paper/10" />}
 {g.map((it, ii) => (
 <button
 key={ii}
 type="button"
 role="menuitem"
 disabled={it.disabled}
 onClick={() => {
 if (it.disabled) return;
 it.onClick();
 onClose();
 }}
 className={cn(
 "w-full text-left flex items-center justify-between gap-3 px-3 py-[7px] font-sans text-detail transition-colors",
 it.disabled
 ? "text-paper/30 cursor-not-allowed"
 : it.destructive
 ? "text-paper/85 hover:bg-crimson/20 hover:text-crimson-soft"
 : "text-paper/85 hover:bg-paper/8 hover:text-paper",
 )}
 >
 <span className="truncate">{it.label}</span>
 {it.hint && (
 <span className="shrink-0 font-sans text-eyebrow text-paper/40 tabular-nums">
 {it.hint}
 </span>
 )}
 </button>
 ))}
 </div>
 ))}
 </div>
 );
}
