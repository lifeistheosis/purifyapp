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

describe("the icon's light behind the prayer", () => {
  it("is the page's own icon, the one at its head", () => {
    const reader = code(READER);
    expect(reader).toContain("const light = serviceArt(artId ?? rule.id);");
    expect(reader).toMatch(/<div aria-hidden className="prayer-light" style=\{\{ backgroundImage: `url\(\$\{light\.src\}\)` \}\} \/>/);
    // The head's plate is drawn from the same id.
    expect(reader).toContain("artId={artId ?? rule.id}");
    // Every prayer page has one, under Christ Pantocrator where no other is paired.
    for (const [id] of serviceArtPairs()) expect(serviceArt(id).src).toMatch(/^\/icons\/prayer\/.+\.jpg$/);
  });

  it("stands behind the words: before them in the page, the words lifted over it", () => {
    const reader = code(READER);
    expect(reader.indexOf('className="prayer-light"')).toBeLessThan(reader.indexOf("<article"));
    expect(reader).toContain('<article ref={article} data-prayer-reader className="relative ');
  });

  it("is soft, dim and white: the icon without its colour, never the gold of the panel", () => {
    const light = rule(css, ".prayer-light");
    expect(light).toContain("position: fixed;");
    expect(light).toMatch(/filter: blur\(\d+px\) grayscale\(1\);/);
    expect(light).not.toMatch(/sepia|saturate|hue-rotate/);
    expect(Number(/opacity: ([\d.]+);/.exec(light)?.[1])).toBeLessThanOrEqual(0.3);
    expect(rule(css, ".prayer-light-breath")).toMatch(/rgb\(255 255 255 \/ 0\.\d+\)/);
  });

  it("is drawn once and never moves; only the breath drifts, and only with motion on", () => {
    expect(rule(css, ".prayer-light")).not.toContain("animation");
    expect(rule(css, ".prayer-light-breath")).toMatch(/animation: prayer-light-drift \d+s ease-in-out infinite alternate;/);
    expect(rule(css, ':where([data-motion="reduce"]) .prayer-light-breath')).toContain("animation: none;");
    // No blur on the layer that moves.
    expect(rule(css, ".prayer-light-breath")).not.toContain("filter");
  });

  it("is a soft shade on Parchment, where white cannot be seen", () => {
    expect(rule(css, 'html[data-reading-mode="parchment"] .prayer-light')).toMatch(/opacity: 0\.1;/);
    expect(rule(css, 'html[data-reading-mode="parchment"] .prayer-light-breath')).toContain("display: none;");
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

  it("knows every prayer of the page as a step, with its actions apart", () => {
    for (const file of [STEP, NAMES]) {
      const src = code(file);
      expect(src, file).toMatch(/<section[^>]*\bdata-step\b/);
      expect(src, file).toContain("data-step-actions");
    }
    // Mark prayed and the bookmark stand together under the prayer.
    const step = code(STEP);
    const actions = step.slice(step.indexOf("data-step-actions"));
    expect(actions).toContain('t("prayers.reader.markPrayed")');
    expect(actions).toContain("togglePrayerBookmark(");
  });

  it("steps the other prayers back with motion on only, and never their actions", () => {
    const dim = ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-step]:not([data-praying]) > :not([data-step-actions])';
    expect(rule(css, dim)).toContain("opacity: 0.5;");
    expect(css).not.toMatch(/:where\(\[data-motion="reduce"\]\)[^{]*\[data-step\][^{]*\{\s*opacity/);
  });

  it("lights the line being prayed in white with a soft glow, plain ink on Parchment", () => {
    expect(rule(css, ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit]')).toBeTruthy();
    expect(css).toMatch(
      /:where\(\[data-motion="full"\]\) \[data-prayer-reader\]\[data-following\] \[data-line\]\[data-lit\] \{\s*text-shadow: 0 0 \d+px rgba\(255, 255, 255, 0\.\d+\);/,
    );
    expect(rule(css, 'html[data-reading-mode="parchment"] [data-prayer-reader] [data-line][data-lit]')).toContain("text-shadow: none;");
  });

  it("sets the prayers in the middle of the page", () => {
    expect(code(STEP)).toMatch(/className="scroll-mt-16 border-t border-paper\/10 py-9 text-center md:scroll-mt-24"/);
    expect(code(NAMES)).toMatch(/className="scroll-mt-16 border-t border-paper\/10 py-9 text-center md:scroll-mt-24"/);
  });

  it("draws a prayer as a step, its words line by line, its actions together under it", () => {
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
          isDone: false,
          hydrated: true,
          onToggle: () => {},
        }),
      ),
    );
    // A bare data attribute is written "true"; the stylesheet asks only that it is there.
    expect(html).toMatch(/<section id="trisagion" data-step="true"[^>]*class="[^"]*text-center/);
    expect(html.match(/data-line="true"/g)?.length).toBeGreaterThanOrEqual(5);
    const actions = html.slice(html.indexOf("data-step-actions"));
    expect(actions).toContain("Mark prayed");
    expect(actions).toContain('aria-label="Bookmark this prayer"');
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
