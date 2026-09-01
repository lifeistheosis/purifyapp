"use client";

// A split-flap / slot-wheel number for the admin panel.
//
// WHY NOT COUNTUP. CountUp eases the whole value from old to new, so a jump
// from 4 to 4,912 renders every integer between them and the eye reads a blur,
// not a change. An odometer moves only the digits that actually moved: 1,204 to
// 1,207 spins one wheel and leaves three still, which tells you at a glance
// both THAT it changed and HOW MUCH. That is the whole reason to animate a
// number on a dashboard rather than just swapping it.
//
// HOW IT WORKS. Each digit is a 1em window over a strip of 0 through 9 stacked
// vertically. Showing digit d is translateY(-d * 10%) of a strip ten times the
// window's height. Only the transform changes, so the browser composites it on
// the GPU and never re-lays-out the card. Separators, currency symbols and
// signs are static text between the wheels.
//
// COLUMNS ARE KEYED FROM THE RIGHT. This is the part that is easy to get wrong.
// Key by index from the left and 999 -> 1,000 shifts every digit one place, so
// React reuses the wrong columns and the whole row appears to scramble. Keyed
// from the right, the units wheel stays the units wheel as the number grows,
// and only the new leading digit mounts.

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { reportChange, scheduleReelClicks } from "@/lib/admin/sound";
import { clickGain, clickTimes } from "@/lib/admin/reelClicks";
import { SENSITIVE } from "@/lib/admin/streamer";
import {
  columns,
  formatValue,
  hasDigits,
  isMoneyText,
  REEL_ITEMS,
  restIndex as reelRestIndex,
  reelDuration,
  restIndex,
} from "@/lib/admin/odometer";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Three copies of 0-9, so a reel has something to spin THROUGH. */
const REEL = Array.from({ length: REEL_ITEMS }, (_, i) => DIGITS[i % 10]);

/**
 * One wheel. Rendered even for a character that never changes, because a
 * static char in the same flow keeps the baseline identical to its neighbours.
 */
function Wheel({
  digit,
  durationMs,
  animate,
}: {
  digit: number;
  durationMs: number;
  animate: boolean;
}) {
  // EVERY WHEEL ROLLS UP FROM ZERO ON MOUNT, and the number is correct the
  // whole time regardless of whether that roll ever happens.
  //
  // It used to animate only on a CHANGE, reasoning that "the first paint is not
  // a change". True, and useless: this dashboard's figures rarely move, so a
  // reader could open the panel every day for a week and never see it animate
  // once. The feature was invisible in exactly the case it was built for.
  //
  // The first fix for that was wrong in a way worth recording. It held the
  // digit in React state and advanced it inside requestAnimationFrame, so the
  // wheel had somewhere to move from. rAF does not fire in a hidden tab, the
  // state never advanced, and the panel rendered 00,000 where the figure was
  // 12,480. A wrong number on a dashboard is far worse than a still one, and
  // the lesson generalises: never let what is DISPLAYED depend on a frame
  // callback firing. Timing may; truth may not.
  //
  // So the transform below is always the real digit, and the CSS animation
  // (app/globals.css, @keyframes odo-roll-in) only animates INTO it. It carries
  // no fill-mode, so a wheel whose animation is skipped, throttled or finished
  // rests on the right digit either way.
  //
  // Rolling on load is the half that is wanted. The half that is not is the
  // register sounding for money that has sat there since yesterday, and that
  // stays gated on a real change, up in Odometer.

  // ONE RUN OF CLICKS PER SPIN, fired on mount beside the animation that
  // causes them. Not on later digit changes: those are the short transition,
  // not a spin, and a ratchet for a figure moving by one would be a fruit
  // machine going off every time a poll landed.
  useEffect(() => {
    if (!animate) return;
    const rest = restIndex(digit);
    const times = clickTimes(rest, durationMs);
    scheduleReelClicks(
      times,
      times.map((_, i) => clickGain(i, times.length)),
      performance.now(),
    );
    // Mount only. digit and durationMs are stable for the life of a wheel in
    // the same column, and re-running on a value change is the thing above
    // that is deliberately not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{
        height: "1em",
        // 0.66em, and the number is measured rather than chosen.
        //
        // DM SANS HAS NO TABULAR FIGURES. font-variant-numeric: tabular-nums
        // is inert in it, verified in the browser: "1" is 0.348em and "0" is
        // 0.698em, exactly twice as wide, with or without the property. So the
        // tabular-nums on the row below buys nothing for the digits and every
        // column has to be padded to a common width by hand.
        //
        // It used to be padded to 0.698em, the widest ADVANCE, which is what
        // both 1ch and an invisible "0" sizer resolve to. That is defensible
        // and it is what the owner reported as too spaced out: a "1" is half
        // the width of the column it sits in, so 111,111 read as 1 1 1, 1 1 1.
        //
        // The floor is the widest INK, 0.643em (the "0" and the "4", measured
        // off canvas TextMetrics), not the widest advance. The difference
        // between them is DM Sans's generous sidebearing on round glyphs, and
        // that is the part worth reclaiming. 0.66em clears the ink floor, so
        // no glyph is ever clipped and no two digits ever touch, while taking
        // 5.4% off every column.
        //
        // Do not go below 0.643em. overflow: hidden clips BOTH axes, so a
        // narrower column would slice the sides off 0, 4, 8 and 9. The clip is
        // deliberately kept rather than replaced with a mask-only version,
        // because if mask-image ever fails to apply the fallback is a strip of
        // thirty digits spilling down the card.
        width: "0.66em",
        // The mask is what stops a spinning reel looking sawn off. overflow
        // hidden alone gives a hard edge, so the digit arriving at the top and
        // the one leaving at the bottom are cut clean through mid-stroke,
        // which reads as broken rather than as motion.
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
      }}
    >
      <span
        className="odo-wheel absolute left-0 top-0 flex flex-col"
        style={{
          transform: `translateY(-${(restIndex(digit) * 100) / REEL_ITEMS}%)`,
          // Mount only. Re-rendering with the same animation value does not
          // restart it, and a later digit change is carried by the transition
          // below instead.
          // The spin. cubic-bezier here is a long decelerate with no
          // overshoot: a reel that bounced at the end would look like it had
          // slipped a tooth rather than been braked.
          animation: animate
            ? `odo-roll-in ${durationMs}ms cubic-bezier(0.12, 0.62, 0.15, 1)`
            : undefined,
          // A LATER change, once the mount spin is over, is a short slide to
          // the new digit rather than a second spin. Re-spinning the whole reel
          // every time a poll moves one figure by one would be a fruit machine
          // going off in the corner of the room all day.
          transition: animate
            ? "transform 620ms cubic-bezier(0.16, 1.02, 0.3, 1)"
            : "none",
          height: `${REEL_ITEMS * 100}%`,
        }}
      >
        {REEL.map((d, i) => (
          <span
            key={i}
            className="flex items-center justify-center tabular-nums"
            style={{ height: `${100 / REEL_ITEMS}%` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Odometer({
  value,
  className,
  /** Force the money sound. Otherwise inferred from a currency mark. */
  money,
}: {
  value: string | number;
  className?: string;
  money?: boolean;
}) {
  const text = formatValue(value);
  const isMoney = money ?? isMoneyText(text);

  const reduced = useReducedMotion();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const first = previous.current === null;
    const changed = !first && previous.current !== text;
    previous.current = text;

    // The first paint is not a change. Firing here would ring the register for
    // money that has been sitting there since yesterday.
    //
    // Nothing sets state: the roll needs no flag, because a CSS transition only
    // runs when a property CHANGES on an element that already exists. A wheel
    // that mounts already showing its digit has no previous transform to move
    // from, so the first paint is still, and every later change animates. This
    // effect exists purely for the sound.
    if (first || !changed) return;
    if (reduced) return;
    // Only a numeric value is worth a sound. A placeholder becoming another
    // placeholder is not.
    if (hasDigits(text)) reportChange(isMoney);
  }, [text, isMoney, reduced]);

  // A value with no digits in it at all ("Not recorded", an em dash placeholder)
  // has nothing to roll. Rendered as plain text so the card still reads.
  // Money marks ITSELF for streamer mode. Every revenue, payout and MRR figure
  // in the panel renders through this component, so covering it here reaches
  // all of them; marking cards by hand would be one missed card away from a
  // real number on a stream.
  const cls = [className, isMoney ? SENSITIVE : null].filter(Boolean).join(" ");

  if (!hasDigits(text)) {
    return <span className={cls}>{text}</span>;
  }

  const cols = columns(text);

  return (
    <span className={cls}>
      {/* The wheels are decoration. A screen reader gets the value once, as a
          word, rather than ten digits per column. */}
      <span className="sr-only">{text}</span>
      {/* items-center, not items-baseline, and tabular figures on the whole
          row.

          An overflow:hidden inline-block reports its BOTTOM MARGIN EDGE as its
          baseline, not the baseline of the text inside it. So every wheel sat
          low against the "$" and "," beside it, by roughly the descender
          depth, and the drop grew with the font size. Aligning the boxes
          instead of their baselines makes it geometric and exact: every child
          is 1em tall and centred, so they line up by construction.

          tabular-nums is kept but it is NOT doing any work: DM Sans ships no
          tnum feature, so the property is inert in the font this panel
          actually renders in. It stays because it costs nothing and becomes
          correct the moment the face changes, and because the digit columns
          above are hand-padded to a common width precisely BECAUSE it is
          inert. Do not delete it and assume the columns will hold. */}
      <span
        aria-hidden
        className="inline-flex items-center"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {cols.map((col) => {
          // Keyed from the RIGHT. lib/admin/odometer.ts explains why, and
          // lib/admin/__tests__/odometer.test.ts fails if it changes.
          const key = String(col.keyFromRight);
          if (!col.digit) {
            return (
              <span
                key={key}
                className="inline-flex items-center justify-center"
                style={{ height: "1em" }}
              >
                {col.char}
              </span>
            );
          }
          return (
            <Wheel
              key={key}
              digit={Number(col.char)}
              durationMs={reelDuration(col.fromLeft)}
              animate={!reduced}
            />
          );
        })}
      </span>
    </span>
  );
}
