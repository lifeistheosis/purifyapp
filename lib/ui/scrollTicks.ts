"use client";

// A small click in the hand for every item a row is scrolled past, the way a
// picker's wheel clicks (1.7.2, the owner's note of 2026-10-19: "give it a
// haptic feedback so it makes a small vibrational click as your scroll
// through them"): the Bible reader's chapter strip and the saints' century
// timeline.
//
// One click each time an item's middle passes the row's middle. Only a hand
// starts it: a row that moves itself (the chapter being read brought to the
// middle, an arrow pressed with a mouse) stays silent, and a tap that opens a
// chapter is not a scroll. A fling keeps clicking until it comes to rest.
//
// The phone apps only, like ./softTick.ts: a browser stays silent. The click
// is the shortest thing each phone has:
//   - iOS: the selection generator, the click of the system's own pickers.
//   - Android: a 10 ms pulse. The plugin's selection tick there is a 100 ms
//     pulse and its light impact a 50 ms one (node_modules/@capacitor/haptics,
//     HapticsSelectionType and HapticsImpactType), which run together into a
//     buzz once a fling passes twenty chapters a second.
// Clicks are at least MIN_GAP_MS apart, so a fling past a hundred psalms is a
// run of clicks and never a buzz.
//
// Fire-and-forget, as softTick is: nothing here answers, and nothing throws.

import { useEffect, type RefObject } from "react";

import { isNativeClient, nativePlatform } from "@/lib/platform/native";

/** The closest two clicks may come. */
export const MIN_GAP_MS = 40;
/** Android's click, in ms. */
export const PULSE_MS = 10;
/** No scroll for this long after the finger lifts, and the fling is over. */
export const SETTLE_MS = 180;

type HapticsModule = typeof import("@capacitor/haptics");

let plugin: Promise<HapticsModule | null> | null = null;

/** The plugin, loaded once. A failed load is not kept, so the next gesture tries again. */
function haptics(): Promise<HapticsModule | null> {
  plugin ??= import("@capacitor/haptics").catch(() => {
    plugin = null;
    return null;
  });
  return plugin;
}

/**
 * How many of the items' middles lie before `mid`, the row's middle: one
 * more, or one fewer, each time an item passes it. `middles` is sorted.
 */
export function slotAt(middles: readonly number[], mid: number): number {
  let lo = 0;
  let hi = middles.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (middles[m] < mid) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/**
 * Clicks as `ref`'s row is scrolled by hand past the items `items` picks out
 * (a selector run from the row; its children by default).
 */
export function useScrollTicks(
  ref: RefObject<HTMLElement | null>,
  { items = ":scope > *", enabled = true }: { items?: string; enabled?: boolean } = {},
): void {
  useEffect(() => {
    const row = ref.current;
    if (!enabled || !row) return;
    return attachScrollTicks(row, items);
  }, [ref, items, enabled]);
}

/** The hook's work, on a row already in the page. Answers the way to stop it. */
export function attachScrollTicks(row: HTMLElement, items = ":scope > *"): () => void {
  if (!isNativeClient()) return () => {};
  const ios = nativePlatform() === "ios";

  let middles: number[] = [];
  let slot = 0;
  let armed = false;
  let down = false;
  let moved = false;
  let lastAt = -Infinity;
  let settle: ReturnType<typeof setTimeout> | undefined;

  // Where each item's middle sits, measured from the row's own start so it
  // holds however far the row is scrolled, a right-to-left row included (its
  // scrollLeft runs negative). Taken when a hand arrives: the items do not
  // move under it.
  const measure = () => {
    const box = row.getBoundingClientRect();
    const origin = box.left + row.clientLeft - row.scrollLeft;
    middles = Array.from(row.querySelectorAll<HTMLElement>(items), (item) => {
      const r = item.getBoundingClientRect();
      return r.left + r.width / 2 - origin;
    }).sort((a, b) => a - b);
  };
  const slotNow = () => slotAt(middles, row.scrollLeft + row.clientWidth / 2);

  const click = () => {
    const now = performance.now();
    if (now - lastAt < MIN_GAP_MS) return;
    lastAt = now;
    void haptics().then((h) => {
      if (!h) return;
      const done = ios ? h.Haptics.selectionChanged() : h.Haptics.vibrate({ duration: PULSE_MS });
      return done.catch(() => {});
    });
  };

  const arm = () => {
    if (armed) return;
    armed = true;
    moved = false;
    measure();
    slot = slotNow();
    // iOS clicks only between a start and an end.
    if (ios) void haptics().then((h) => h?.Haptics.selectionStart().catch(() => {}));
  };
  const disarm = () => {
    clearTimeout(settle);
    if (!armed) return;
    armed = false;
    if (ios) void haptics().then((h) => h?.Haptics.selectionEnd().catch(() => {}));
  };
  const settleSoon = () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!down) disarm();
    }, SETTLE_MS);
  };

  const onTouchStart = () => {
    down = true;
    arm();
  };
  const onTouchEnd = () => {
    down = false;
    // A tap that opens a chapter is not a scroll: nothing more to click.
    if (moved) settleSoon();
    else disarm();
  };
  // A trackpad or a mouse wheel on an iPad.
  const onWheel = () => {
    arm();
    settleSoon();
  };
  const onScroll = () => {
    if (!armed) return;
    moved = true;
    if (!down) settleSoon();
    const now = slotNow();
    if (now === slot) return;
    slot = now;
    click();
  };

  const passive = { passive: true } as const;
  row.addEventListener("touchstart", onTouchStart, passive);
  row.addEventListener("touchend", onTouchEnd, passive);
  row.addEventListener("touchcancel", onTouchEnd, passive);
  row.addEventListener("wheel", onWheel, passive);
  row.addEventListener("scroll", onScroll, passive);
  return () => {
    row.removeEventListener("touchstart", onTouchStart);
    row.removeEventListener("touchend", onTouchEnd);
    row.removeEventListener("touchcancel", onTouchEnd);
    row.removeEventListener("wheel", onWheel);
    row.removeEventListener("scroll", onScroll);
    disarm();
  };
}
