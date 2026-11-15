import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Build 98 note 9 (his word of 2026-11-15, about 21:41 UTC): "optimize the small
// text that appears here. it moves the whole UI and it doesn't move well". Now
// Playing's saved line stood in the flow with no room of its own and said the
// title again ("The Prayer Rope Anthem (English) is saved to listen offline"),
// two lines at phone width, so the cover and title jumped as it came and went.
// The walk that measures the boxes on the export is scripts/gate/saved-line.mjs.

const ROOT = path.resolve(__dirname, "../../..");
const source = fs.readFileSync(path.join(ROOT, "components/player/SaveOffline.tsx"), "utf8");
const note = source.slice(source.indexOf("export function SaveOfflineNote("));
const languages = fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).filter((f) => f.endsWith(".json"));
const messages = Object.fromEntries(languages.map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages", f), "utf8"))]));

/** Every key the line's words are said with. */
const keys = [...note.matchAll(/t\("([\w.]+)"/g)].map((m) => m[1]);

describe("Now Playing's saved line keeps its room (build 98 note 9)", () => {
  it("is always drawn, one line tall, whether it speaks or not", () => {
    expect(note).not.toMatch(/return null/);
    expect(note).toMatch(/data-saved-line=\{line \? "speaks" : "silent"\}/);
    expect(note).toMatch(/className=\{cn\("h-5 min-w-0", className\)\}/);
    expect(note).toContain("whitespace-nowrap");
  });

  it("fades in and out on the house curve, and only where Purify's motion is on", () => {
    expect(note).toContain("motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house),visibility_0s]");
    expect(note).toContain("invisible opacity-0 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house),visibility_0s_linear_var(--duration-fast)]");
  });

  it("says every state in words that never repeat the title, in every language", () => {
    for (const state of ["downloads.savedToListen", "player.offline.waitWifi", "player.offline.waitSignal", "player.offline.saving", "downloads.saving", "player.offline.failedSome", "player.offline.failedChant", "player.offline.remove", "player.offline.useData", "common.cancel"]) {
      expect(keys).toContain(state);
    }
    expect(languages.length).toBe(21);
    for (const key of keys) {
      for (const [lang, m] of Object.entries(messages)) {
        expect(typeof m[key], `${key} in ${lang}`).toBe("string");
        expect(m[key], `${key} in ${lang}`).not.toContain("{book}");
        // One short line: no second sentence.
        expect(m[key], `${key} in ${lang}`).not.toMatch(/[.।۔]\s+\S/u);
      }
    }
  });
});
