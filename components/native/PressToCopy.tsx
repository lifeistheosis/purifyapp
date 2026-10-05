"use client";

// Purify's own hold, for text that has no tools of its own.
//
// In the phone apps the system's text selection is off (app/globals.css, "The
// apps select nothing by themselves"), at the owner's word: holding the screen
// and moving turned everything blue, as if to copy the whole page, and he
// wanted the app's own way to copy in its place. A verse and a paragraph of
// the Fathers open the tool pill on a hold. Everything else that is text gets
// this: hold a paragraph of a prayer, a line of commentary, a post, a step of
// a recipe, and a Copy pill rises above the tab bar while the block under the
// finger takes the same quiet wash a held verse does.
//
// WHICH block, and what its words are, is lib/ui/pressCopy.ts, tested there.
// This file is the gesture and the pill.
//
// Mounted once in the root layout. Does nothing in a browser: there the
// reader has the browser's own selection, a keyboard and a right click.
//
// The listeners are passive and never prevent anything. A hold that turns
// into a scroll is simply dropped, so scrolling is untouched; a tap is too
// short to count. Nothing is written or changed by a hold: it only offers.

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Copy } from "@/components/ui/icons/Copy";
import { isNativeClient } from "@/lib/platform/native";
import { copyText } from "@/lib/ui/copyText";
import { createLiftGuard } from "@/lib/ui/liftGuard";
import { haptic } from "@/lib/ui/motion";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { PRESS_MS, blockText, hasDrifted, pressBlock } from "@/lib/ui/pressCopy";

/** How long "Copied" stands before the pill goes. */
const COPIED_MS = 900;

/**
 * A page can settle by a pixel as the pill appears. A scroll this soon after
 * opening is that, not the reader moving on.
 */
const OPENING_MS = 350;

export function PressToCopy() {
  const { t } = useTranslate();
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const held = useRef<HTMLElement | null>(null);
  const openedAt = useRef(0);
  // The finger that opened the pill is still on the glass when it appears,
  // and its lift can arrive as a tap on the backdrop or on Copy itself
  // (lib/ui/liftGuard.ts). A tap that soon after a lift is the lift.
  const [lift] = useState(createLiftGuard);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (closing.current) clearTimeout(closing.current);
    closing.current = null;
    held.current?.removeAttribute("data-held");
    held.current = null;
    setText(null);
    setCopied(false);
  }, []);

  // The gesture.
  useEffect(() => {
    if (!isNativeClient()) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let origin: { x: number; y: number } | null = null;

    const drop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      origin = null;
    };

    const onStart = (e: TouchEvent) => {
      drop();
      // Two fingers are a pinch, and a pill that is already up owns the screen.
      if (e.touches.length !== 1 || held.current) return;
      const block = pressBlock<HTMLElement>(e.target as Element | null);
      if (!block) return;
      const touch = e.touches[0];
      origin = { x: touch.clientX, y: touch.clientY };
      timer = setTimeout(() => {
        timer = null;
        origin = null;
        // The page may have changed under a finger that never moved.
        if (!block.isConnected) return;
        const words = blockText(block);
        if (!words) return;
        held.current = block;
        block.setAttribute("data-held", "");
        openedAt.current = Date.now();
        lift.reset();
        haptic("light");
        setCopied(false);
        setText(words);
      }, PRESS_MS);
    };
    const onMove = (e: TouchEvent) => {
      if (!origin) return;
      const touch = e.touches[0];
      if (!touch || hasDrifted(origin, { x: touch.clientX, y: touch.clientY })) drop();
    };

    const onEnd = () => {
      if (held.current) lift.noteLift();
      drop();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      drop();
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [lift]);

  // While the pill is up: the page scrolling away, Escape, or another screen
  // puts it down, and the app's other floating things step aside.
  const open = text !== null;
  useEffect(() => {
    if (!open) return;
    setOverlayOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onScroll = () => {
      if (Date.now() - openedAt.current > OPENING_MS) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("popstate", close);
    return () => {
      setOverlayOpen(false);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("popstate", close);
    };
  }, [open, close]);

  // Nothing of it may outlive the component.
  useEffect(() => close, [close]);

  if (text === null) return null;

  const onCopy = async () => {
    if (lift.isLift()) return;
    const ok = await copyText(text);
    if (!ok) {
      close();
      return;
    }
    haptic("light");
    setCopied(true);
    closing.current = setTimeout(close, COPIED_MS);
  };

  return (
    <div className="fixed inset-0 z-[140]" role="dialog" aria-modal="false" aria-label={t("press.textActions")}>
      {/* Anywhere else puts it down. */}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => {
          if (!lift.isLift()) close();
        }}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      {/* Where the verse pill sits, so the two are one habit: bottom centre,
          clear of the tab bar, the player and the home indicator. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center px-4"
        style={{
          bottom:
            "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        {/* One surface: the button is the pill. The verse's pill is a tray
            because it holds seven things; this holds one. */}
        <button
          type="button"
          onClick={onCopy}
          disabled={copied}
          className={
            "press-pill-in tap-press pointer-events-auto inline-flex h-12 items-center gap-2.5 rounded-full border px-6 font-sans text-detail font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-colors duration-150 " +
            (copied
              ? "border-emerald-500/60 bg-night text-emerald-300"
              : "border-paper/20 bg-night text-paper active:bg-night-soft")
          }
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          <span aria-live="polite">{copied ? t("common.copied") : t("common.copy")}</span>
        </button>
      </div>
    </div>
  );
}
