import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { PrayerStep } from "@/components/prayers/service/PrayerStep";
import { getMessages } from "@/lib/i18n";
import { libraryRule } from "@/lib/prayers/library";
import { serviceArt, serviceArtPairs } from "@/lib/prayers/serviceArt";

/**
 * While you pray (1.8), held to the owner's pick B, Immersive, of 2026-10-27:
 * "the line being prayed lit, the rest dim, the icon's light behind, chant
 * underneath" (Homebase/boards/purify-master/variants/05-praying.png), built
 * on the 1.7 prayer page and its one scroll-driven light, not beside it.
 * The 1.7 rules the page keeps (no count, the lit line behind the motion
 * switch) are prayerPages.test.ts.
 *
 * "The icon's light behind" was the page's own icon, blurred and grey, on
 * every palette. On build 90 he asked for the ground to fit the theme a
 * reader picked (note 8), and to its first call, his "All recommendations",
 * that light left the ground: the icon stays at the page's head, and the
 * light behind the prayer is the palette's own, a soft pool or nothing.
 * What is held here is that shape; every palette's own light and its sums
 * are prayerLight.test.ts.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
/** One rule's body in the stylesheet, by its selector exactly. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

const READER = "components/prayers/PrayerRuleReader.tsx";
const STEP = "components/prayers/service/PrayerStep.tsx";
const NAMES = "components/prayers/service/CommemorationStep.tsx";
const LIT = "components/prayers/service/useLitLine.ts";
const WITH = "components/player/PrayWith.tsx";
const css = read("app/globals.css");

const LIGHT = "components/prayers/service/PrayerLight.tsx";

describe("the light behind the prayer", () => {
  it("is no longer the page's icon: the icon stays at the head, and nothing of it lies behind the prayers", () => {
    const reader = code(READER);
    // The head's plate is still drawn from the page's own id.
    expect(reader).toContain("artId={artId ?? rule.id}");
    // Every prayer page has one, under Christ Pantocrator where no other is paired.
    for (const [id] of serviceArtPairs()) expect(serviceArt(id).src).toMatch(/^\/icons\/prayer\/.+\.jpg$/);
    // And the reader draws no picture of its own behind the words (build 90 note 8, his call 1).
    expect(reader).not.toContain("serviceArt(");
    expect(reader).not.toContain("backgroundImage");
    expect(reader).not.toContain('className="prayer-light"');
    const light = code(LIGHT);
    expect(light).not.toMatch(/backgroundImage|url\(|<img|serviceArt/);
  });

  it("stands behind the words: before them in the page, the words lifted over it", () => {
    const reader = code(READER);
    expect(reader.indexOf("<PrayerLight />")).toBeGreaterThan(-1);
    expect(reader.indexOf("<PrayerLight />")).toBeLessThan(reader.indexOf("<article"));
    expect(reader).toContain('<article ref={article} data-prayer-reader className="relative ');
    // Two layers and no more: the pool, and the breath over it. Neither is read aloud.
    const light = code(LIGHT);
    expect(light).toMatch(/<div aria-hidden className="prayer-light" \/>\s*<div\s+aria-hidden\s+className="prayer-light-breath"\s+data-mock-allow="mirror"\s+data-mock-why="[^"]+"\s*\/>/);
  });

  it("is a soft pool in the palette's own ink: no picture, no blur, no white typed in", () => {
    const both = rule(css, ".prayer-light,\n.prayer-light-breath");
    expect(both).toContain("position: fixed;");
    expect(both).toContain("pointer-events: none;");
    const pool = /\n\.prayer-light \{\n([^}]*)\}/.exec(css)?.[1] ?? "";
    const breath = /[^,]\n\.prayer-light-breath \{\n([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(pool).toMatch(/background: radial-gradient\([^;]*color-mix\(in srgb, var\(--color-paper\) var\(--prayer-pool\), transparent\), transparent \d+%\);/);
    expect(breath).toMatch(/background: radial-gradient\([^;]*color-mix\(in srgb, var\(--color-paper\) var\(--prayer-breath\), transparent\), transparent \d+%\);/);
    for (const body of [both, pool, breath]) {
      expect(body).not.toMatch(/filter|url\(|opacity|conic|rgba?\(|#[0-9a-f]{3,8}\b|sepia|saturate|hue-rotate/i);
    }
  });

  it("is drawn once and never moves; only the breath drifts, and only with motion on", () => {
    const pool = /\n\.prayer-light \{\n([^}]*)\}/.exec(css)?.[1] ?? "";
    const breath = /[^,]\n\.prayer-light-breath \{\n([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(pool).toBeTruthy();
    expect(pool).not.toContain("animation");
    expect(rule(css, ".prayer-light,\n.prayer-light-breath")).not.toContain("animation");
    expect(breath).toMatch(/animation: prayer-light-drift \d+s ease-in-out infinite alternate;/);
    expect(rule(css, ':where([data-motion="reduce"]) .prayer-light-breath')).toContain("animation: none;");
  });

  it("is nothing at all on paper, on a look, and in a fast: neither pool nor breath is drawn", () => {
    const none = [
      'html[data-reading-mode="parchment"] .prayer-light',
      'html[data-reading-mode="parchment"] .prayer-light-breath',
      "html[data-look] .prayer-light",
      "html[data-look] .prayer-light-breath",
      "html[data-candle-season] .prayer-light",
      "html[data-candle-season] .prayer-light-breath",
    ].join(",\n");
    expect(rule(css, none)).toContain("display: none;");
  });
});

describe("the line being prayed lit, the rest dim", () => {
  it("marks the prayer the lit line stands in, from the same scroll", () => {
    const lit = code(LIT);
    expect(lit).toContain('line?.closest<HTMLElement>("[data-step]")');
    expect(lit).toContain('step.dataset.praying = ""');
    expect(lit).toContain("delete praying.dataset.praying");
    // One engine: still the scroll, still behind the motion switch.
    expect(lit).toContain('addEventListener("scroll", schedule, { passive: true })');
    expect(lit).toMatch(/if \(!root \|\| reduced\) return;/);
  });

  it("knows every prayer of the page as a step, and ticks nothing under a prayer", () => {
    for (const file of [STEP, NAMES]) {
      expect(code(file), file).toMatch(/<section[^>]*\bdata-step\b/);
    }
    // No circle and no bookmark under each prayer since 1.9 (build 89 note 7,
    // his "ok to all" of 2026-11-10): one Amen at the end of the page marks
    // the whole rule (prayerPages.test.ts). The names step lost its own mark
    // the same day (the arbiter's yes): the Amen marks it with the rule.
    for (const file of [STEP, NAMES]) {
      const src = code(file);
      expect(src, file).not.toContain("data-step-actions");
      expect(src, file).not.toContain('t("prayers.reader.markPrayed")');
    }
    expect(code(STEP)).not.toContain("togglePrayerBookmark(");
  });

  it("steps the other prayers back with motion on only: their lines and names, never a caption or an action", () => {
    // Each palette's own step, every word still 4.5:1 (1.9, his page's 131;
    // the arithmetic is prayerLight.test.ts).
    const around = ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-step]:not([data-praying])';
    expect(rule(css, `${around} [data-line],\n${around} > h2`)).toContain("opacity: var(--prayer-rest);");
    expect(css).not.toMatch(/:where\(\[data-motion="reduce"\]\)[^{]*\[data-step\][^{]*\{\s*opacity/);
  });

  it("lights the line being prayed with a soft glow of the palette's own ink, plain ink on Parchment", () => {
    // White on Dark and True black, whose ink is that white (the owner, 2026-10-28: the accent is a
    // glowing white, never yellow); a look's own light on a look. Never a colour typed in (note 8).
    const lit = rule(css, ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit]');
    expect(lit).toMatch(/text-shadow: 0 0 \d+px color-mix\(in srgb, var\(--color-paper\) \d+%, transparent\);/);
    expect(lit).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}\b/i);
    expect(rule(css, 'html[data-reading-mode="parchment"] [data-prayer-reader] [data-line][data-lit]')).toContain("text-shadow: none;");
  });

  it("sets the prayers in the middle of the page", () => {
    // `relative` holds Easy Scroll's rests, placed inside each step (build 90 note 6).
    expect(code(STEP)).toMatch(/className="relative scroll-mt-16 border-t border-paper\/10 py-9 text-center md:scroll-mt-24"/);
    expect(code(NAMES)).toMatch(/className="relative scroll-mt-16 border-t border-paper\/10 py-9 text-center md:scroll-mt-24"/);
  });

  it("draws a prayer as a step, its words line by line, nothing to tick under it", () => {
    type ProviderProps = Parameters<typeof MessagesProvider>[0];
    const trisagion = libraryRule("morning", "en")!.prayers.find((p) => p.id === "trisagion")!;
    const html = renderToString(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as ProviderProps,
        createElement(PrayerStep, {
          ruleId: "morning",
          prayer: trisagion,
          title: trisagion.title,
          contentLang: "en",
        }),
      ),
    );
    // A bare data attribute is written "true"; the stylesheet asks only that it is there.
    expect(html).toMatch(/<section id="trisagion" data-step="true"[^>]*class="[^"]*text-center/);
    expect(html.match(/data-line="true"/g)?.length).toBeGreaterThanOrEqual(5);
    expect(html).not.toContain("data-step-actions");
    expect(html).not.toContain("Mark prayed");
    expect(html).not.toContain('aria-label="Bookmark this prayer"');
  });
});

describe("chant underneath", () => {
  const prayWith = code(WITH);

  it("waits at the foot of the screen once Pray with has scrolled away and nothing sounds", () => {
    expect(prayWith).toContain("new IntersectionObserver(");
    expect(prayWith).toContain("const silent = !audio.src && !ambience.playing && !ambience.loading;");
    expect(prayWith).toContain("const underneath = scrolledPast && silent && !asking && !picker;");
    // Where the mini player stands while a chant plays, above the apps' tab bar.
    expect(prayWith).toMatch(/\{underneath \? \(\s*<div className="now-playing-lift /);
  });

  it("is the same picker, in the app's own words", () => {
    const chip = prayWith.slice(prayWith.indexOf("{underneath ?"));
    expect(chip).toContain("onClick={openPicker}");
    expect(chip).toContain('t("chant.button")');
  });

  it("rises in with motion on, and is simply there with it off", () => {
    expect(rule(css, ".pray-chip-in")).toContain("animation: pray-chip-in");
    expect(rule(css, ':where([data-motion="reduce"]) .pray-chip-in')).toContain("animation: none;");
  });
});
