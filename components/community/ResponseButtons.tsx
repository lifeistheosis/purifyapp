"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Candle } from "@/components/ui/icons/Candle";
import { cn } from "@/lib/cn";
import { setResponse } from "@/lib/community/client";
import {
  RESPONSE_KEYS,
  RESPONSE_KINDS,
  TRAY_GAP,
  answered,
  applyResponse,
  toggleMine,
  trayPlace,
  type ResponseCounts,
  type ResponseKind,
  type TrayPlace,
} from "@/lib/community/responses";
import { visibleBand } from "@/lib/ui/readingPlace";

/**
 * Amen, Praying, Glory to God, beside the like (lib/community/responses.ts).
 *
 * 1.8, the owner's pick of r3-30, A, "a tray over the row", with mark 1 of
 * r3-30b, "the lit candle" (Homebase/boards/purify-master/variants; note 80
 * of build 86: "it moves the whole UI when you click on the guy with his
 * hands up"). Until then the praying figure opened the three inside the row
 * itself, so the row grew a line and every post under it dropped.
 *
 *  - The row holds one mark, the candle (components/ui/icons/Candle.tsx), lit
 *    white once the reader has answered, and while its tray is open.
 *  - One tap opens a small tray above the row with Amen, Praying and Glory to
 *    God, the reader's own lit. A choice, a tap anywhere else, Escape or a
 *    scroll closes it. Each is still a toggle, and a reader may give all
 *    three, each once.
 *  - The tray is drawn at the top of the page, fixed over the candle, never
 *    inside the post: a post is content-visibility: auto, which clips what
 *    is drawn outside its box. So nothing under the row moves, ever, which
 *    the walk measures (scripts/export-walk.mjs, section 49).
 *  - No figures on prayer (his rule; this default was told to him and not
 *    refused): no count beside the candle and none in the tray. The server
 *    still sends the totals; nothing draws them. The like keeps its count.
 *  - A reply's row works the same, one size smaller.
 *
 * Signed out, the candle is there and does nothing, as the like is: the row
 * has the same parts for every reader, and the reader's session arriving
 * after the first paint changes nothing in it.
 *
 * Like the like button, nothing waits on the network: a tap lights the candle
 * at once and sends the END state wanted for that one response, so quick taps
 * can never leave the database out of step with the screen. The props are
 * the truth; the reader's own taps are held beside them, tagged with the
 * read they were made against, until a newer read arrives. A save that fails
 * puts the candle back as it was and says so over it, in the tray's place,
 * for a few seconds: a line in the row would move what is under it.
 */

type Props = {
  postId?: string;
  replyId?: string;
  counts: ResponseCounts;
  mine: readonly ResponseKind[];
  canRespond: boolean;
  size?: "post" | "reply";
};

type Guess = { from: string; counts: ResponseCounts; mine: ResponseKind[] };

/**
 * What floats over the candle: the three to choose from, or a save that
 * failed. `place` is null for the one frame it is drawn hidden to be measured.
 */
type Tray = { kind: "choose" | "failed"; place: TrayPlace | null };

/** How long a failed save is said over the candle. */
const FAILED_MS = 4000;

const keyOf = (counts: ResponseCounts, mine: readonly ResponseKind[]) =>
  `${counts.amen}:${counts.praying}:${counts.glory}:${[...mine].sort().join(",")}`;

/** Whether the candle is in the part of the screen the page is seen through. */
function inView(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const band = visibleBand();
  return r.width > 0 && r.bottom > band.top && r.top < band.bottom;
}

export function ResponseButtons({ postId, replyId, counts, mine, canRespond, size = "post" }: Props) {
  const { t } = useTranslate();
  const [guess, setGuess] = useState<Guess | null>(null);
  const [tray, setTray] = useState<Tray | null>(null);
  // Saves still out: while any is, a poll landing mid-tap cannot flick the
  // candle back to what it was a moment ago.
  const [pending, setPending] = useState(0);
  const candleRef = useRef<HTMLButtonElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  // Opened with Enter or Space: focus goes into the tray, and comes back.
  const byKeys = useRef(false);
  const trayId = useId();

  const readKey = keyOf(counts, mine);
  const shown = guess && (guess.from === readKey || pending > 0) ? guess : { counts, mine: [...mine] };
  const compact = size === "reply";
  const choosing = tray?.kind === "choose";
  const open = tray !== null;
  const placed = tray?.place != null;

  // Where the tray goes, worked out before paint from the candle and the
  // tray's own size, so it never shows in the wrong place.
  useLayoutEffect(() => {
    if (!tray || tray.place) return;
    const candle = candleRef.current;
    const el = trayRef.current;
    if (!candle || !el) return;
    // The middle of what is drawn, at the size it is laid out: a tap can
    // still be easing the button back from its dip (tap-press), and the
    // dip scales the box the screen reports.
    const r = candle.getBoundingClientRect();
    const box = {
      left: r.left + r.width / 2 - candle.offsetWidth / 2,
      top: r.top + r.height / 2 - candle.offsetHeight / 2,
      width: candle.offsetWidth,
      height: candle.offsetHeight,
    };
    const screen = { width: document.documentElement.clientWidth, ...visibleBand() };
    setTray({ kind: tray.kind, place: trayPlace(box, { width: el.offsetWidth, height: el.offsetHeight }, screen, TRAY_GAP[size]) });
  }, [tray, size]);

  // While it is up: a tap anywhere else, a scroll, a turned phone or Escape
  // puts it down. It is fixed to the screen, so it closes rather than float
  // away from its row when the page moves.
  useEffect(() => {
    if (!open) return;
    const close = () => setTray(null);
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (trayRef.current?.contains(target) || candleRef.current?.contains(target)) return;
      close();
    }
    function onScroll(e: Event) {
      if (trayRef.current && e.target instanceof Node && trayRef.current.contains(e.target)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const inside = trayRef.current?.contains(document.activeElement) ?? false;
      close();
      if (inside) candleRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opened from the keyboard, focus goes to the first of the three.
  useEffect(() => {
    if (!choosing || !placed || !byKeys.current) return;
    byKeys.current = false;
    trayRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [choosing, placed]);

  // A failed save is said for a few seconds, then the candle stands alone.
  const failed = tray?.kind === "failed";
  useEffect(() => {
    if (!failed) return;
    const id = window.setTimeout(() => setTray(null), FAILED_MS);
    return () => window.clearTimeout(id);
  }, [failed]);

  async function press(kind: ResponseKind) {
    if (!canRespond) return;
    const on = !shown.mine.includes(kind);
    const before = shown;
    // A choice closes the tray. A reader on the keyboard stays on the candle.
    if (trayRef.current?.contains(document.activeElement)) candleRef.current?.focus({ preventScroll: true });
    setTray(null);
    setGuess({ from: readKey, counts: applyResponse(shown.counts, shown.mine, kind, on), mine: toggleMine(shown.mine, kind, on) });
    setPending((n) => n + 1);
    const res = await setResponse({ postId, replyId, kind, on });
    setPending((n) => n - 1);
    if (res.ok) {
      setGuess((g) => (g ? { from: readKey, counts: res.counts, mine: res.mine } : g));
    } else {
      setGuess({ from: readKey, counts: before.counts, mine: before.mine });
      if (inView(candleRef.current)) setTray({ kind: "failed", place: null });
    }
  }

  const label = t("community.respondCandle");
  const lit = choosing || answered(shown.mine);
  const place = tray?.place ?? null;

  // Bare on the page, as the like is (1.8, the owner's pick of r3-02, B): the
  // candle alone, grey, lit white softly when the reader has answered, never
  // in a colour (the owner, 2026-10-19 and 2026-10-28). At least 44px wide,
  // so `hit-44` only grows the touch up and down.
  return (
    <>
      <button
        ref={candleRef}
        type="button"
        data-response-candle={size}
        onClick={(e) => {
          // No detail is a press of Enter or Space, not a tap or a click.
          byKeys.current = e.detail === 0;
          setTray((cur) => (cur?.kind === "choose" ? null : { kind: "choose", place: null }));
        }}
        disabled={!canRespond}
        aria-expanded={choosing}
        aria-controls={choosing ? trayId : undefined}
        aria-label={label}
        title={canRespond ? label : t("community.signInToReact")}
        className={cn(
          "tap-press hit-44 inline-flex min-w-11 items-center justify-center rounded-pill transition-colors disabled:opacity-50",
          compact ? "h-7" : "h-9",
          lit ? "community-lit text-paper" : "text-paper/60 hover:text-paper",
        )}
      >
        <Candle size={compact ? 13 : 16} />
      </button>
      {tray && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={trayRef}
              id={trayId}
              role={choosing ? "group" : "alert"}
              aria-label={choosing ? t("community.respond") : undefined}
              data-response-tray={size}
              data-placed={place ? "" : undefined}
              data-below={place?.below ? "" : undefined}
              // Tabbing on past the last of the three puts it down.
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && !e.currentTarget.contains(next) && !candleRef.current?.contains(next)) setTray(null);
              }}
              className={cn(
                "community-tray fixed z-[95] flex max-w-[calc(100vw-28px)] items-center",
                compact ? "min-h-[42px] rounded-[14px] px-1 py-[3px]" : "min-h-[50px] rounded-[17px] px-[5px] py-1",
                !place && "invisible",
              )}
              style={place ? ({ left: place.left, top: place.top, "--caret": `${place.caret}px` } as CSSProperties) : { left: 0, top: 0 }}
            >
              {choosing ? (
                RESPONSE_KINDS.map((k, i) => {
                  const held = shown.mine.includes(k);
                  return (
                    <Fragment key={k}>
                      {i > 0 ? (
                        <span aria-hidden className={cn("w-px shrink-0 bg-paper/[0.12]", compact ? "h-[15px]" : "h-[18px]")} />
                      ) : null}
                      {/* Where the three run wider than the screen allows (Filipino,
                          Indonesian at 360px), each gives way down to its longest
                          word and wraps the rest, so the tray stays whole. */}
                      <button
                        type="button"
                        onClick={() => void press(k)}
                        aria-pressed={held}
                        className={cn(
                          "community-tray-choice tap-press hit-44 inline-flex items-center justify-center text-balance text-center font-sans font-semibold leading-tight transition-colors hover:bg-paper/[0.07]",
                          compact ? "min-h-[34px] rounded-[10px] px-[11px] text-[12.5px]" : "min-h-10 rounded-[12px] px-[13px] text-[14px]",
                          held && "community-lit",
                        )}
                      >
                        {t(RESPONSE_KEYS[k])}
                      </button>
                    </Fragment>
                  );
                })
              ) : (
                <p className={cn("font-sans font-semibold text-crimson-soft", compact ? "px-2.5 text-[12.5px]" : "px-3 text-[13px]")}>
                  {t("community.respondFailed")}
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
