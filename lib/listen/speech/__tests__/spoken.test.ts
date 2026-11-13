// A text read by the phone's voice, as the one player knows it (1.9, build 95
// note 25, Updates 17): its address says what it is, so the player's Speed,
// Read (at the verse), Share and the page's lit verse know a spoken chapter
// as they know a recorded one; the phone's voices are named as a reader can
// read them; each voice's pace is kept for its next reading. What a reader
// would notice if this broke: no Speed or Read for a chapter the phone reads,
// Read opening the wrong page, a Greek Bible with no voice at all, voices
// listed as "en-gb-x-gba-local", or the seek bar's length wrong every time.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PhoneVoice } from "@/lib/listen/speech/engine";
import { spokenBibleSrc, spokenOf, spokenTextSrc, voiceLang } from "@/lib/listen/speech/spoken";
import { voiceRows } from "@/lib/listen/speech/voices";
import { playingOf, readHref, shareHref } from "@/lib/player/steps";

describe("a spoken text's address", () => {
  it("names a chapter of the English Bible, and of a downloaded one", () => {
    expect(spokenOf(spokenBibleSrc("genesis", 1))).toEqual({ kind: "bible", book: "genesis", chapter: 1, bible: null });
    expect(spokenOf(spokenBibleSrc("psalms", 50, "ru-synodal"))).toEqual({ kind: "bible", book: "psalms", chapter: 50, bible: "ru-synodal" });
  });

  it("names a life, a council's section, a study's part, an event and a work's section, with the language read", () => {
    expect(spokenOf(spokenTextSrc("life/xenia-of-petersburg", "ru"))).toEqual({ kind: "text", id: "life/xenia-of-petersburg", lang: "ru" });
    expect(spokenOf(spokenTextSrc("council/nicaea-i/creed/2", "en"))).toEqual({ kind: "text", id: "council/nicaea-i/creed/2", lang: "en" });
    expect(spokenOf(spokenTextSrc("work/antony-the-great/life-of-antony/3", "en"))?.kind).toBe("text");
  });

  it("is nothing for a recording's address or a name that is no text's", () => {
    expect(spokenOf("https://audio.purifyapp.net/read/john/1.mp3")).toBeNull();
    expect(spokenOf("speech:genesis/1")).toBeNull();
    expect(spokenOf("speech:bible/genesis/x")).toBeNull();
    expect(spokenOf(null)).toBeNull();
  });

  it("is a chapter to the player: Speed, Read at the verse being read, and Share", () => {
    const playing = playingOf(spokenBibleSrc("genesis", 1));
    expect(playing).toEqual({ kind: "chapter", book: "genesis", chapter: 1 });
    expect(readHref(playing, 7)).toBe("/bible/genesis/1#v7");
    expect(shareHref(playing)).toBe("/bible/genesis/1");
    expect(playingOf(spokenBibleSrc("john", 3, "ar-van-dyck"))).toEqual({ kind: "chapter", book: "john", chapter: 3 });
  });

  it("is a text to the player, opened at its part", () => {
    expect(playingOf(spokenTextSrc("council/nicaea-i/creed/2", "en"))).toEqual({ kind: "text", id: "council/nicaea-i/creed/2", href: "/councils/nicaea-i/creed#s2" });
    expect(playingOf(spokenTextSrc("life/xenia-of-petersburg", "ru"))).toEqual({ kind: "text", id: "life/xenia-of-petersburg", href: "/saints/xenia-of-petersburg" });
  });

  it("asks a voice for the text's language, the Greek of the Septuagint read in the Greek of today", () => {
    expect(voiceLang("grc")).toBe("el");
    expect(voiceLang("ru")).toBe("ru");
    expect(voiceLang("en-GB")).toBe("en");
  });
});

describe("the phone's voices, as the Voice sheet lists them", () => {
  const numbered = (n: number) => `Voice ${n}`;
  const voice = (id: string, lang: string, more: Partial<PhoneVoice> = {}): PhoneVoice => ({ id, name: id, lang, ...more });

  it("names Android's ids by a number in their language, an iPhone's voices by their own names, a browser's without the language after a dash", () => {
    const rows = voiceRows(
      [
        voice("en-gb-x-gba-local", "en-GB", { default: true }),
        voice("en-gb-x-rjs-local", "en-GB"),
        voice("com.apple.voice.compact.en-GB.Daniel", "en-GB", { name: "Daniel" }),
        voice("Microsoft David - English (United States)", "en-US", { name: "Microsoft David - English (United States)" }),
        voice("ru-ru-x-ruf-local", "ru-RU"),
      ],
      "en",
      "en",
      numbered,
    );
    // The phone's own first, then by name (voicesFor).
    expect(rows.map((r) => r.name)).toEqual(["Voice 1", "Daniel", "Voice 2", "Microsoft David"]);
    expect(rows[0].language).toBe("British English");
    expect(rows[3].language).toBe("American English");
  });

  it("lists a voice the phone has twice under one name once: the better, or the one chosen", () => {
    const compact = voice("com.apple.voice.compact.en-GB.Daniel", "en-GB", { name: "Daniel", quality: 1 });
    const enhanced = voice("com.apple.voice.enhanced.en-GB.Daniel", "en-GB", { name: "Daniel", quality: 2 });
    expect(voiceRows([compact, enhanced], "en", "en", numbered).map((r) => r.voice.id)).toEqual([enhanced.id]);
    expect(voiceRows([compact, enhanced], "en", "en", numbered, compact.id).map((r) => r.voice.id)).toEqual([compact.id]);
  });

  it("lists none for a language the phone does not speak", () => {
    expect(voiceRows([voice("en-us-x-sfg-local", "en-US")], "ka", "en", numbered)).toEqual([]);
  });
});

describe("each voice's pace, kept on the device", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is an ordinary pace before the voice has read, then what it learned, voice by voice", async () => {
    const { paceOf, keepPace } = await import("@/lib/listen/speech/speak");
    const { DEFAULT_PACE } = await import("@/lib/listen/speech/timeline");
    expect(paceOf("en-gb-x-gba-local")).toBe(DEFAULT_PACE);
    keepPace("en-gb-x-gba-local", 16.234);
    keepPace("Daniel", 12);
    expect(paceOf("en-gb-x-gba-local")).toBe(16.23);
    expect(paceOf("Daniel")).toBe(12);
  });

  it("asks nothing of the phone for a text with its recording and no other voice chosen: Heart reads", async () => {
    vi.resetModules();
    const engine = await import("@/lib/listen/speech/engine");
    const asked = vi.spyOn(engine, "speechEngine");
    const { voiceFor } = await import("@/lib/listen/speech/speak");
    expect(await voiceFor("en", true)).toEqual({ kind: "heart" });
    expect(asked).not.toHaveBeenCalled();
  });
});
