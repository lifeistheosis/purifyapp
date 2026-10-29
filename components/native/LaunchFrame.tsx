import { readFileSync } from "node:fs";
import { join } from "node:path";

import { INTRO_PACE_AT_FIRST_PAINT, LAUNCH_CROSS_PX, LIFT_AT_FIRST_PAINT } from "@/lib/platform/launchFrame";

import { HORIZON_STARS, HorizonDrawing } from "./Horizon";

/**
 * The cover the apps paint before any of their code has run: Purify's own
 * intro (1.8), and the few lines of script that lift the phone's logo screen
 * once it is painted. lib/platform/launchFrame.ts says why, what it costs,
 * and how to take it out.
 *
 * A server component with nothing in it but shapes: it is written into the
 * apps' one document as plain markup, so the browser can paint it from the
 * document and the stylesheet alone. Its motion is app/globals.css's.
 *
 * WHAT IT SHOWS. The phone's logo screen, the cross on the night ground,
 * comes alive: a few stars come out, and the horizon from the ads and the
 * cards (purify-ads src/brand/parts.tsx, Limb: a planet's edge at night, a
 * thin line brightest at the crest, its glow falling outward only) rises
 * under the cross while the cross takes the light. Then it lifts away into
 * the screen that has arrived under it. The owner's pick of three, 2026-10-27.
 *
 * NO WORDS, and nothing that could be read as one. The apps are built in
 * English; a word here would be English on every phone until the app comes
 * up. The test and the walk both hold this.
 *
 * Always dark, as the phone's own logo screen is. On the light Parchment
 * palette `dark-island` hands it the night tokens back, so a light page still
 * opens on the night and the horizon. Every other palette draws it in its own
 * night and paper.
 *
 * It covers the page, over everything, as the logo screen did, until <html>
 * carries both data-launch="ready" (the app's first screen is drawn, in the
 * reader's language: NativeBridge) and data-intro="played" (the intro has had
 * its time: the script below). So that screen can come in pieces unseen, as
 * it did under the logo.
 *
 * TWO PACES. Slow on the first cold start of the reader's day, quick on every
 * later one that day (the owner, 2026-10-28). The script above the cover marks
 * which on <html> before the cover is in the page, and the stylesheet and the
 * script below follow the mark. Each star carries its own moment as
 * `--star-at`, so the quick pace can bring it forward (app/globals.css).
 */

// The real cross, not a redraw, read at build and written into the document
// as it is, so it is there at the first paint with nothing to fetch (as
// app/icon.tsx does). The file is 177 by 311.
const CROSS = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/purify-cross-mark.png")).toString("base64")}`;
const CROSS_W = (LAUNCH_CROSS_PX * 177) / 311;

export function LaunchFrame() {
  return (
    <>
      {/* The intro's pace, before the cover, so the cover is never in the page
          on the wrong one. */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: INTRO_PACE_AT_FIRST_PAINT }} />
      <div data-launch-frame="" aria-hidden="true" className="dark-island fixed inset-0 z-[200] overflow-hidden bg-night">
        {/* Everything that lifts away together when the cover goes. */}
        <div data-launch-stage="" className="absolute inset-0 text-paper">
          <div className="launch-stars">
            {HORIZON_STARS.map((s) => (
              <i
                key={`${s.left}${s.top}`}
                className="absolute rounded-full bg-paper"
                style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, ["--star-at" as string]: `${s.delay}ms` }}
              />
            ))}
          </div>
          {/* The horizon (./Horizon.tsx, drawn once for here and for the
              welcome flow's first question). Its crest sits at 71% of the
              screen and its curve is a circle 1.68 screens wide, the
              proportions of the cards. */}
          <div className="launch-horizon absolute inset-x-0 top-[71%]">
            <div className="launch-level">
              <HorizonDrawing id="launch" className="absolute left-1/2 top-0 h-[168vw] w-[168vw] -translate-x-1/2 overflow-visible" />
            </div>
          </div>
          {/* The cross, where and as large as the phone's logo screen draws
              it: the middle of the screen, LAUNCH_CROSS_PX tall, in pixels
              and not rem, so a reader's text size cannot move it. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- written into the document as it is, before any of the app's code */}
          <img
            src={CROSS}
            alt=""
            decoding="sync"
            className="launch-cross absolute left-1/2 top-1/2 max-w-none"
            style={{ width: CROSS_W, height: LAUNCH_CROSS_PX, marginLeft: -CROSS_W / 2, marginTop: -LAUNCH_CROSS_PX / 2 }}
          />
        </div>
      </div>
      {/* After the cover, so it is in the document before this runs. No
          nonce: the apps' export has none and needs none (app/layout.tsx). */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: LIFT_AT_FIRST_PAINT }} />
    </>
  );
}
