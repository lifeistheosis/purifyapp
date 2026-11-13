"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Grip } from "@/components/ui/icons/Grip";
import { SCROLL_SETTLE_MS } from "@/lib/bible/verseGesture";
import { dropPrepaint, keepOrder, moveDoor, readOrder, sameOrder, subscribeOrder } from "@/lib/discover/doorOrder";
import { HOLD_MS, IDLE, edgeSpeed, landingOffset, press, shiftOf, type Press, type PressEffect, type PressEvent, type Rows } from "@/lib/discover/holdToMove";
import { clicksOn } from "@/lib/ui/clicksSetting";
import { measureRows, playFlip } from "@/lib/ui/flip";
import { LIFT_MS } from "@/lib/ui/liftGuard";
import { prefersReducedMotion } from "@/lib/ui/motion";
import { lastPageScrollAt, watchPageScroll } from "@/lib/ui/pageScroll";
import { handTicks } from "@/lib/ui/scrollTicks";
import { softTick } from "@/lib/ui/softTick";

import { ArrangeSheet } from "./ArrangeSheet";

/** One of Discover's doors, as the server draws it. */
export type Door = {
  /** Its address: the door's name in the kept order (lib/discover/doorOrder.ts). */
  id: string;
  /** Its name's key, for the arrange sheet and for what is said aloud. */
  nameKey: string;
  /** The band itself (components/ui/GalleryBand), drawn by the server. */
  band: ReactNode;
};

/** How long a held door takes to go down into its place: --duration-fast. */
const LAND_MS = 200;
/** The rows of the page and of the sheet move to a new order on the house curve and time. */
const FLIP = { durationMs: LAND_MS, easing: "var(--ease-house)" };

/**
 * Discover's library, in the reader's order (1.9, build 95 note 9).
 *
 * His word, 2026-11-13: "allow the user to hold down each section and the
 * haptic feedback hits and they can move each section according to their
 * wants (and every time it switches a section a haptic feedback hits)".
 *
 *   - A tap opens the door, and a swipe scrolls the page, as they always did.
 *   - A finger that rests on a door for the house's hold (400 ms, a verse's
 *     own) lifts it: it rises a little from the page with its shadow under it,
 *     and a tick is felt.
 *   - Moved, it follows the finger, and the doors it passes step aside on the
 *     house curve, with a click each time it takes another's place. Near the
 *     top or the foot of the screen the page comes along with it.
 *   - Let go, it goes down into its new place, and the order is kept on this
 *     device (lib/discover/doorOrder.ts).
 *   - Without a drag (WCAG 2.5.7: a keyboard, a screen reader, a hand that
 *     cannot hold and draw): Arrange sections, under the list, opens a sheet
 *     where each door moves up or down with a tap or a key, each move said
 *     aloud, and where the original order comes back in one tap.
 *
 * What is decided (a tap, a hold, a change of place) is lib/discover/
 * holdToMove.ts, tested in plain node; this is the measuring and the drawing.
 * Only transform and opacity move, and nothing is laid out again while a door
 * is held: the doors are measured once, when it lifts (the Android WebView
 * drops frames on anything more, as components/prayers/mine/ReorderList.tsx
 * found). The look of a lifted door is app/globals.css, "Discover's doors,
 * held and moved".
 *
 * Reduced motion keeps the door under the finger, which is the reader's own
 * hand, and lets nothing else travel: no lift, no stepping aside, no gliding
 * into place. The clicks follow Settings, Clicks as you scroll
 * (lib/ui/clicksSetting.ts), whose own line promises "Off keeps the phone
 * still": with it off, nothing here moves the phone. In a browser the phone
 * has no clicks to give.
 */
export function DoorOrder({ doors }: { doors: Door[] }) {
  const { t } = useTranslate();
  const first = useMemo(() => doors.map((d) => d.id), [doors]);
  const byId = useMemo(() => new Map(doors.map((d) => [d.id, d])), [doors]);

  // The kept order. The server draws the first order, all it can know; the
  // page drawn whole then shows the reader's from the pre-paint
  // (orderPrepaint, in DiscoverMobile), and a page the router reaches reads
  // it before it is first drawn.
  const firstKey = first.join("\n");
  const orderKey = useSyncExternalStore(
    subscribeOrder,
    () => readOrder(first).join("\n"),
    () => firstKey,
  );
  const order = useMemo(() => orderKey.split("\n"), [orderKey]);
  const atFirst = orderKey === firstKey;

  const listRef = useRef<HTMLUListElement>(null);
  const sheetListRef = useRef<HTMLOListElement>(null);
  const orderRef = useRef(order);
  const [arranging, setArranging] = useState(false);
  const [said, setSaid] = useState("");

  const nameOf = (id: string) => {
    const door = byId.get(id);
    return door ? t(door.nameKey) : "";
  };
  const sayMoved = (next: readonly string[], id: string) =>
    setSaid(t("discover.moved", { name: nameOf(id), place: next.indexOf(id) + 1, total: next.length }));
  const sayMovedRef = useRef(sayMoved);

  useLayoutEffect(() => {
    orderRef.current = order;
    sayMovedRef.current = sayMoved;
  });

  // Once the list draws the kept order in its own markup, the pre-paint's
  // style has done its work, and goes: from here a move is the markup's.
  useLayoutEffect(() => {
    if (orderKey === readOrder(first).join("\n")) dropPrepaint();
  }, [orderKey, first]);

  // The hand on the doors.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    watchPageScroll();

    let state: Press = IDLE;
    let finger: number | null = null;
    let x = 0;
    let y = 0;
    let clock: ReturnType<typeof setTimeout> | undefined;
    let rows: Rows | null = null;
    let items: HTMLElement[] = [];
    let held: HTMLElement | null = null;
    let ticks: { tick: () => void; end: () => void } | null = null;
    let frame = 0;
    let landing: { timer: ReturnType<typeof setTimeout>; done: () => void } | null = null;
    // A click this soon after a held door is let go is the finger lifting,
    // not a tap (lib/ui/liftGuard.ts): it opens nothing.
    let quietUntil = 0;

    const run = (event: PressEvent) => {
      const [next, effects] = press(state, event);
      state = next;
      for (const effect of effects) apply(effect);
    };

    // Each door's place on the page, taken once, as it lifts.
    const measure = (): Rows => {
      items = Array.from(list.children) as HTMLElement[];
      const scroll = window.scrollY;
      const boxes = items.map((li) => li.getBoundingClientRect());
      return { tops: boxes.map((b) => b.top + scroll), heights: boxes.map((b) => b.height) };
    };

    // Between the bar at the top and the tab bar: where a finger brings the page along.
    const edges = (): [number, number] => {
      const bar = document.querySelector("[data-tab-topbar]")?.getBoundingClientRect();
      const tabs = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
      return [bar && bar.bottom > 0 ? bar.bottom : 0, tabs && tabs.height > 0 ? tabs.top : window.innerHeight];
    };

    // Each frame a door is held: near an edge the page scrolls, and the door stays under the finger.
    const carry = () => {
      frame = 0;
      if (state.phase !== "held") return;
      const [top, bottom] = edges();
      const speed = edgeSpeed(y, top, bottom);
      if (speed) {
        const before = window.scrollY;
        window.scrollBy(0, speed);
        if (window.scrollY !== before) run({ type: "move", x, y, pageY: y + window.scrollY });
      }
      frame = requestAnimationFrame(carry);
    };

    // The door is in its place: the order is kept and drawn in the markup,
    // and every transform goes in the same frame, so nothing moves.
    const settle = (from: number, to: number) => {
      if (landing) {
        clearTimeout(landing.timer);
        landing.done();
        landing = null;
      }
      const next = moveDoor(orderRef.current, from, to);
      if (to !== from) flushSync(() => keepOrder(next, first));
      for (const li of items) {
        li.style.transition = "none";
        li.style.transform = "";
      }
      delete list.dataset.moving;
      void list.offsetHeight;
      for (const li of items) li.style.transition = "";
      held = null;
      rows = null;
      if (to !== from) sayMovedRef.current(next, next[to]);
      run({ type: "landed" });
    };

    const apply = (effect: PressEffect) => {
      switch (effect.type) {
        case "arm":
          clearTimeout(clock);
          clock = setTimeout(() => {
            rows = measure();
            run({ type: "hold", rows, pageY: y + window.scrollY });
          }, HOLD_MS);
          return;
        case "disarm":
          clearTimeout(clock);
          return;
        case "lift":
          held = items[effect.door] ?? null;
          if (!held) return;
          held.dataset.lifted = "";
          list.dataset.moving = "";
          // The hold's own tick, and the clicks of each place to come.
          if (clicksOn()) softTick();
          ticks = handTicks();
          frame = requestAnimationFrame(carry);
          return;
        case "follow":
          if (held) held.style.transform = `translate3d(0, ${effect.dy}px, 0)`;
          return;
        case "place": {
          if (!rows || state.phase !== "held") return;
          const from = state.door;
          items.forEach((li, i) => {
            if (i === from) return;
            const shift = shiftOf(rows as Rows, i, from, effect.to);
            li.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
          });
          ticks?.tick();
          return;
        }
        case "land": {
          cancelAnimationFrame(frame);
          frame = 0;
          ticks?.end();
          ticks = null;
          const { from, to } = effect;
          const li = held;
          if (!li || !rows) {
            settle(from, from);
            return;
          }
          delete li.dataset.lifted;
          if (prefersReducedMotion()) {
            settle(from, to);
            return;
          }
          // Down into the place it was shown, on the house curve; the others already stand where they will.
          li.style.transition = `transform ${LAND_MS}ms var(--ease-house)`;
          li.style.transform = `translate3d(0, ${landingOffset(rows, from, to)}px, 0)`;
          const onEnd = (e: TransitionEvent) => {
            if (e.target === li && e.propertyName === "transform") settle(from, to);
          };
          li.addEventListener("transitionend", onEnd);
          // A belt: no transitionend comes for a door that was already where it lands.
          landing = { timer: setTimeout(() => settle(from, to), LAND_MS + 80), done: () => li.removeEventListener("transitionend", onEnd) };
          return;
        }
        case "tap":
          // The door opens, as a tap always did: nothing here stands in its way.
          return;
      }
    };

    const ours = (touches: TouchList) => {
      for (let i = 0; i < touches.length; i++) if (touches[i].identifier === finger) return touches[i];
      return null;
    };

    const onStart = (e: TouchEvent) => {
      if (finger !== null) {
        if (ours(e.touches)) {
          // A second finger is a pinch, not a hold. A door already lifted stays with the first.
          if (state.phase === "pressing") {
            run({ type: "cancel" });
            finger = null;
          }
          return;
        }
        // The last finger is gone without an end reaching the list (the web
        // view lost it): it is let go, and this touch is a touch of its own.
        finger = null;
        run({ type: "cancel" });
      }
      if (state.phase !== "idle") return;
      const touch = e.changedTouches[0];
      const door = (e.target as Element | null)?.closest?.("[data-door]");
      if (!touch || !door || door.parentElement !== list) return;
      finger = touch.identifier;
      x = touch.clientX;
      y = touch.clientY;
      run({
        type: "down",
        door: Array.prototype.indexOf.call(list.children, door),
        x,
        y,
        gliding: performance.now() - lastPageScrollAt() < SCROLL_SETTLE_MS,
      });
    };
    const onMove = (e: TouchEvent) => {
      const touch = finger === null ? null : ours(e.changedTouches);
      if (!touch) return;
      x = touch.clientX;
      y = touch.clientY;
      // A held door is moved, and the page is not scrolled by the same finger.
      if (state.phase === "held" && e.cancelable) e.preventDefault();
      run({ type: "move", x, y, pageY: y + window.scrollY });
    };
    const onEnd = (e: TouchEvent) => {
      const touch = finger === null ? null : ours(e.changedTouches);
      if (!touch) return;
      finger = null;
      if (state.phase === "held") {
        quietUntil = performance.now() + LIFT_MS;
        if (e.cancelable) e.preventDefault();
      }
      run({ type: e.type === "touchcancel" ? "cancel" : "up" });
    };
    const onScroll = () => {
      if (state.phase === "pressing") run({ type: "scroll" });
    };
    const onClick = (e: MouseEvent) => {
      if (state.phase === "held" || state.phase === "landing" || performance.now() < quietUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // A phone sends a held link its own menu: the hold is the door's here.
    const onMenu = (e: Event) => {
      if (state.phase === "pressing" || state.phase === "held" || performance.now() < quietUntil) e.preventDefault();
    };

    list.addEventListener("touchstart", onStart, { passive: true });
    // Not passive, from the start: a phone decides when a touch begins
    // whether its moves can be stopped, and a held door must stop them.
    list.addEventListener("touchmove", onMove, { passive: false });
    list.addEventListener("touchend", onEnd, { passive: false });
    list.addEventListener("touchcancel", onEnd, { passive: false });
    list.addEventListener("click", onClick, true);
    list.addEventListener("contextmenu", onMenu);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      list.removeEventListener("touchstart", onStart);
      list.removeEventListener("touchmove", onMove);
      list.removeEventListener("touchend", onEnd);
      list.removeEventListener("touchcancel", onEnd);
      list.removeEventListener("click", onClick, true);
      list.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(clock);
      cancelAnimationFrame(frame);
      ticks?.end();
      if (landing) {
        clearTimeout(landing.timer);
        landing.done();
      }
      // Leaving with a door in the hand: everything back as it was drawn.
      for (const li of items) {
        li.style.transition = "";
        li.style.transform = "";
        delete li.dataset.lifted;
      }
      delete list.dataset.moving;
    };
  }, [first]);

  // A move from the sheet: the page's doors and the sheet's rows go to their
  // new places on the house curve, with one click, and the move is said.
  const moveBy = (from: number, by: -1 | 1) => {
    const to = from + by;
    if (to < 0 || to >= order.length) return;
    const id = order[from];
    const next = moveDoor(order, from, to);
    const page = measureRows(listRef.current, "data-door");
    const sheet = measureRows(sheetListRef.current, "data-arrange-row");
    flushSync(() => keepOrder(next, first));
    playFlip(listRef.current, page, { ...FLIP, attr: "data-door" });
    playFlip(sheetListRef.current, sheet, { ...FLIP, attr: "data-arrange-row" });
    // The keyboard stays on the door it moved: React may have carried that
    // row's markup to its new place, which takes the focus off it. At an
    // end, the button that can still move it.
    const row = sheetListRef.current?.querySelector<HTMLElement>(`[data-arrange-row="${id}"]`);
    const same = row?.querySelector<HTMLButtonElement>(`[data-move="${by < 0 ? "up" : "down"}"]`);
    const other = row?.querySelector<HTMLButtonElement>(`[data-move="${by < 0 ? "down" : "up"}"]`);
    (same && !same.disabled ? same : other)?.focus({ preventScroll: true });
    const click = handTicks();
    click.tick();
    click.end();
    sayMoved(next, id);
  };

  const restore = () => {
    if (sameOrder(order, first)) return;
    const page = measureRows(listRef.current, "data-door");
    const sheet = measureRows(sheetListRef.current, "data-arrange-row");
    flushSync(() => keepOrder(first, first));
    playFlip(listRef.current, page, { ...FLIP, attr: "data-door" });
    playFlip(sheetListRef.current, sheet, { ...FLIP, attr: "data-arrange-row" });
    setSaid(t("discover.restored"));
  };

  return (
    // One child of the shell's cascade, as the list alone was.
    <div>
      <ul ref={listRef} data-door-list="" className="flex flex-col gap-2.5">
        {order.map((id) => (
          <li key={id} data-door={id}>
            <div data-door-face="">{byId.get(id)?.band}</div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setArranging(true)}
          className="tap-press inline-flex min-h-11 items-center gap-2 rounded-pill px-4 font-sans text-detail font-medium text-paper/75 hover:text-paper"
        >
          <Grip size={18} className="shrink-0" />
          {t("discover.arrange")}
        </button>
      </div>

      <ArrangeSheet
        open={arranging}
        onClose={() => setArranging(false)}
        listRef={sheetListRef}
        rows={order.map((id) => ({ id, name: nameOf(id) }))}
        atFirst={atFirst}
        onMove={moveBy}
        onRestore={restore}
      />

      {/* What a move did, for a screen reader: the door and its new place. */}
      <p role="status" className="sr-only">
        {said}
      </p>
    </div>
  );
}
