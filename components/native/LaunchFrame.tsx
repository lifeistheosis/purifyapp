import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LAUNCH_CROSS_PX, LIFT_AT_FIRST_PAINT } from "@/lib/platform/launchFrame";

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
 */

// The real cross, not a redraw, read at build and written into the document
// as it is, so it is there at the first paint with nothing to fetch (as
// app/icon.tsx does). The file is 177 by 311.
const CROSS = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/purify-cross-mark.png")).toString("base64")}`;
const CROSS_W = (LAUNCH_CROSS_PX * 177) / 311;

// The same stars on every open: a seeded scatter, kept above the horizon (its
// crest is at 71% of the screen and it falls away to the sides) and clear of
// the cross. Faint, a few brighter, as on the cards.
const STARS = (() => {
  let seed = 11;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: { left: string; top: string; size: number; opacity: number; delay: number }[] = [];
  while (out.length < 34) {
    const x = 3 + rnd() * 94;
    const y = 3 + rnd() * 57;
    const u = rnd();
    const opacity = 0.18 + 0.5 * rnd();
    const delay = Math.round(40 + rnd() * 400);
    if (Math.abs(x - 50) < 11 && Math.abs(y - 50) < 9) continue;
    out.push({ left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%`, size: Number((1 + 1.5 * u ** 5).toFixed(2)), opacity: Number(opacity.toFixed(2)), delay });
  }
  return out;
})();

export function LaunchFrame() {
  return (
    <>
      <div data-launch-frame="" aria-hidden="true" className="dark-island fixed inset-0 z-[200] overflow-hidden bg-night">
        {/* Everything that lifts away together when the cover goes. */}
        <div data-launch-stage="" className="absolute inset-0 text-paper">
          <div className="launch-stars">
            {STARS.map((s) => (
              <i
                key={`${s.left}${s.top}`}
                className="absolute rounded-full bg-paper"
                style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDelay: `${s.delay}ms` }}
              />
            ))}
          </div>
          {/* The horizon. Its crest sits at 71% of the screen and its curve
              is a circle 1.68 screens wide, the proportions of the cards. In
              a 1000 unit drawing: the circle, a haze and a glow behind its
              edge, the planet drawn over their inner half so the light falls
              outward only, then the edge itself. */}
          <div className="launch-horizon absolute inset-x-0 top-[71%]">
            <div className="launch-level">
              <svg viewBox="0 0 1000 1000" className="absolute left-1/2 top-0 h-[168vw] w-[168vw] -translate-x-1/2 overflow-visible">
                <defs>
                  <filter id="launch-haze" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600">
                    <feGaussianBlur stdDeviation="38" />
                  </filter>
                  <filter id="launch-glow" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600">
                    <feGaussianBlur stdDeviation="7.6" />
                  </filter>
                  <linearGradient id="launch-line" gradientUnits="userSpaceOnUse" x1="191" y1="0" x2="809" y2="0">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.13" />
                    <stop offset="0.5" stopColor="currentColor" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.13" />
                  </linearGradient>
                  <radialGradient id="launch-rim" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="500">
                    <stop offset="0.9" stopColor="currentColor" stopOpacity="0" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
                  </radialGradient>
                </defs>
                <circle cx="500" cy="500" r="500" fill="none" stroke="currentColor" strokeWidth="50" opacity="0.15" filter="url(#launch-haze)" />
                <ellipse cx="500" cy="6" rx="198" ry="38" fill="currentColor" opacity="0.2" filter="url(#launch-haze)" />
                <circle cx="500" cy="500" r="500" fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="4.5" opacity="0.42" filter="url(#launch-glow)" />
                <circle cx="500" cy="500" r="500" style={{ fill: "var(--color-night)" }} />
                <circle cx="500" cy="500" r="500" fill="url(#launch-rim)" />
                <circle cx="500" cy="500" r="500" fill="none" stroke="url(#launch-line)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
              </svg>
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
