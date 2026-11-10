"use client";

// The light behind the prayer (1.9, build 90 note 8).
//
// His words on build 90: "let's change the background design also. Like, make
// it more, like, fit the theme the user picked." Until then the prayer page
// drew its own icon here, large, blurred and without its colour, with a white
// breath over it: one neutral grey-white light, the same on every palette and
// laid over it. True black was grey, a look's colour went grey where the
// prayer is read, and paper took an even grey shade.
//
// Now the ground is the palette's own, whole, and the light is the palette's
// own light, a soft pool or nothing (app/globals.css, "While you pray"):
//
//  - the six plain dark palettes: a soft pool of the palette's ink where the
//    prayer is read, and its slow breath over it while motion is on;
//  - a look: nothing. Its picture is its sign, and nothing moves on a look;
//  - Light and the light looks: nothing. Light cannot glow on paper;
//  - Candlelight in one of the Church's three long fasts: the fast's colour,
//    as in the Bible (components/reader/CandleVeil.tsx). The page says the
//    season on the root and the stylesheet lays that light in the room.
//
// Two still layers, fixed behind the prayers. No picture, no blur, and
// nothing here reads the scroll: Easy Scroll and the lit line are not its
// business (./useEasyScroll.ts, ./useLitLine.ts).

import { useCandleSeason } from "@/components/reader/CandleVeil";
import { useCandlelightWorn } from "@/components/theme/useWornPalette";

export function PrayerLight() {
  // The palette worn, not the one stored: Candlelight at Vespers wears it over a reader's own.
  useCandleSeason(useCandlelightWorn());
  // The breath drifts a little from side to side and back, the same way in every language, so
  // the mirror check of scripts/mock-check.mjs is told why it does not turn in Arabic.
  return (
    <>
      <div aria-hidden className="prayer-light" />
      <div
        aria-hidden
        className="prayer-light-breath"
        data-mock-allow="mirror"
        data-mock-why="a slow light that drifts from side to side and back, the same in every language: it has no start and no end"
      />
    </>
  );
}
