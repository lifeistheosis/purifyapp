// Which voice reads a text (1.9, build 95 note 25, and his "all recs" of
// 2026-11-13): Heart first where a recording exists, else the phone's own
// voice for the language; the reader's choice kept per language; a chosen
// voice that has gone falls back and is said once. What a reader would
// notice if this broke: a Russian chapter read by an English voice, the
// choice forgotten, or the same "voice gone" line at every chapter.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PhoneVoice } from "@/lib/listen/speech/engine";

const VOICES: PhoneVoice[] = [
  { id: "en-us-x-sfg-local", name: "en-us-x-sfg-local", lang: "en-US", quality: 400 },
  { id: "en-gb-x-gba-local", name: "en-gb-x-gba-local", lang: "en-GB", quality: 400, default: true },
  { id: "en-gb-x-rjs-local", name: "en-gb-x-rjs-local", lang: "en-GB", quality: 500 },
  { id: "ru-ru-x-dfc-local", name: "ru-ru-x-dfc-local", lang: "ru-RU", quality: 400 },
];

let m: typeof import("@/lib/listen/speech/voiceChoice");
const store = new Map<string, string>();

beforeEach(async () => {
  store.clear();
  vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } });
  vi.resetModules();
  m = await import("@/lib/listen/speech/voiceChoice");
});

describe("which voice reads a text", () => {
  it("is Heart where the text has its recording and the reader has chosen nothing", () => {
    expect(m.voiceToUse(null, VOICES, "en", true)).toEqual({ kind: "heart" });
  });

  it("is the phone's own voice for the text's language where there is no recording (the Old Testament, a life)", () => {
    expect(m.voiceToUse(null, VOICES, "en", false)).toMatchObject({ kind: "phone", voice: { id: "en-gb-x-gba-local" } });
    expect(m.voiceToUse(null, VOICES, "ru", false)).toMatchObject({ kind: "phone", voice: { id: "ru-ru-x-dfc-local" } });
  });

  it("never reads a text in another language's voice: none for a language the phone lacks", () => {
    expect(m.voiceToUse(null, VOICES, "sr", false)).toEqual({ kind: "none" });
    expect(m.voiceToUse("en-gb-x-rjs-local", VOICES, "ru", false)).toMatchObject({ kind: "phone", voice: { lang: "ru-RU" } });
  });

  it("is the reader's choice, kept for its language", () => {
    m.chooseVoice("en-GB", "en-gb-x-rjs-local");
    m.chooseVoice("ru", "ru-ru-x-dfc-local");
    m.forgetVoiceChoices();
    expect(m.chosenVoice("en")).toBe("en-gb-x-rjs-local");
    expect(m.chosenVoice("ru-RU")).toBe("ru-ru-x-dfc-local");
    expect(m.voiceToUse(m.chosenVoice("en"), VOICES, "en", true)).toMatchObject({ kind: "phone", voice: { id: "en-gb-x-rjs-local" } });
  });

  it("falls back to Heart, else the phone's own voice, when the chosen voice has gone, and names it", () => {
    expect(m.voiceToUse("en-au-x-gone-local", VOICES, "en", true)).toEqual({ kind: "heart", gone: "en-au-x-gone-local" });
    expect(m.voiceToUse("en-au-x-gone-local", VOICES, "en", false)).toMatchObject({ kind: "phone", voice: { id: "en-gb-x-gba-local" }, gone: "en-au-x-gone-local" });
  });

  it("takes Heart chosen on a text with no recording as the phone's own voice, with nothing to say", () => {
    expect(m.voiceToUse(m.HEART, VOICES, "en", false)).toMatchObject({ kind: "phone", voice: { id: "en-gb-x-gba-local" } });
    expect(m.voiceToUse(m.HEART, VOICES, "en", false)).not.toHaveProperty("gone");
  });

  it("lists a language's voices with the phone's own first, then its better ones", () => {
    expect(m.voicesFor(VOICES, "en").map((v) => v.id)).toEqual(["en-gb-x-gba-local", "en-gb-x-rjs-local", "en-us-x-sfg-local"]);
  });

  it("says a voice has gone once", () => {
    expect(m.goneSaid("x")).toBe(false);
    m.markGoneSaid("x");
    expect(m.goneSaid("x")).toBe(true);
  });
});
