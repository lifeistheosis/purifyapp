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
import { reportChange } from "@/lib/admin/sound";
import {
  columns,
  formatValue,
  hasDigits,
  isMoneyText,
  REEL_ITEMS,
  REEL_REPEATS,
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

  return (
    <span
      className="relative inline-block overflow-hidden align-baseline"
      style={{ height: "1em", width: "0.62em" }}
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
  if (!hasDigits(text)) {
    return <span className={className}>{text}</span>;
  }

  const cols = columns(text);

  return (
    <span className={className}>
      {/* The wheels are decoration. A screen reader gets the value once, as a
          word, rather than ten digits per column. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {cols.map((col) => {
          // Keyed from the RIGHT. lib/admin/odometer.ts explains why, and
          // lib/admin/__tests__/odometer.test.ts fails if it changes.
          const key = String(col.keyFromRight);
          if (!col.digit) {
            return (
              <span key={key} className="inline-block">
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
