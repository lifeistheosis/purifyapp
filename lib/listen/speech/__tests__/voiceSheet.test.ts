// The choice of voices, as the reader meets it (1.9, build 95 note 25, his
// "all recs" of 2026-11-13): a Voice row in the player's •••, beside the sleep
// timer and Ambience, opening a sheet from the player's own parts; Heart
// first where the text has its recording, then the phone's voices for the
// text's language, each with Hear it; choosing one reads what is playing again
// in it at the verse being read; Listen on every text a voice can read, never
// the prayers. What a reader would notice if this broke: no way to choose a
// voice, a sixth mark crowding the player's row in German, the reading
// starting the chapter again after a change of voice, a Listen on a prayer.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpeakAsk, SpeechEngine, SpeechEvent } from "@/lib/listen/speech/engine";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../../..", rel), "utf8");

describe("the Voice row and sheet", () => {
  it("stand in the player's •••, between the sleep timer and Ambience, never as a sixth mark under the controls", () => {
    const more = read("components/player/PlayerMore.tsx");
    const order = ['t("player.sleep")', 't("player.voice")', 't("ambience.title")'].map((m) => more.indexOf(m));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(more).toMatch(/icon=\{<Voice size=\{16\} \/>\}\s*label=\{t\("player\.voice"\)\}/);
    expect(more).toMatch(/onClose\(\);\s*onVoice\(\);/);
    const player = read("components/player/NowPlayingSheet.tsx");
    expect(player).toContain("voice={voiceName}");
    expect(player).toContain("onVoice={() => openVoiceSheet({ overPlayer: true })}");
    // The five marks under the controls stay five.
    expect(player).not.toContain('t("player.option.voice")');
  });

  it("is a sheet over the player, from its own parts, mounted once in the root frame", () => {
    const sheet = read("components/player/VoiceSheet.tsx");
    expect(sheet).toContain('layer={sheet.overPlayer ? "over-player" : undefined}');
    expect(sheet).toContain('import { Check } from "@/components/ui/icons/Check";');
    expect(sheet).toContain('role="radiogroup"');
    expect(read("components/layout/RootFrame.tsx")).toContain("<VoiceSheet />");
    expect(fs.existsSync(path.resolve(__dirname, "../../../../components/ui/icons/Voice.tsx"))).toBe(true);
  });

  it("lists Heart first, only where the text has its recording, then the phone's voices for its language, each with Hear it", () => {
    const sheet = read("components/player/VoiceSheet.tsx");
    const heart = sheet.indexOf("{recorded ? (");
    const phone = sheet.indexOf("{rows.map((row) => (");
    expect(heart).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(heart);
    expect(sheet).toContain("voiceRows(voices, lang, locale,");
    expect(sheet).toContain("hear={{ label: t(\"player.voice.hearName\", { name: row.name }), word: t(\"player.voice.hear\"), go: () => void hear(row) }}");
    // Choosing reads what is playing again in that voice; Hear it first pauses the reading.
    expect(sheet).toContain("await readAgainIn(to, about, t, goOn);");
    expect(sheet).toMatch(/if \(getAudioSnapshot\(\)\.playing\) pause\(\);/);
  });

  it("says a chosen voice has gone, and where a voice is added when the phone has none for the language", () => {
    const sheet = read("components/player/VoiceSheet.tsx");
    expect(sheet).toContain('t("player.voice.gone", { name: nameOf(checked) })');
    expect(sheet).toContain('t("player.voice.none", { language: languageName })');
    expect(sheet).toContain('t("player.voice.noneHow")');
  });

  it("has its words in all 21 languages, with no em dash", () => {
    const keys = ["player.voice", "player.voice.heart", "player.voice.heartAbout", "player.voice.numbered", "player.voice.hear", "player.voice.hearName", "player.voice.gone", "player.voice.none", "player.voice.noneHow", "player.voice.phoneNote"];
    const dir = path.resolve(__dirname, "../../../i18n/messages");
    const catalogs = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(catalogs).toHaveLength(21);
    for (const file of catalogs) {
      const words = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, string>;
      for (const k of keys) {
        expect(words[k], `${file} ${k}`).toBeTruthy();
        expect(words[k], `${file} ${k}`).not.toContain("—");
      }
      for (const k of ["player.voice.numbered", "player.voice.hearName", "player.voice.gone", "player.voice.none"]) {
        const want = { "player.voice.numbered": "{n}", "player.voice.hearName": "{name}", "player.voice.gone": "{name}", "player.voice.none": "{language}" }[k]!;
        expect(words[k], `${file} ${k}`).toContain(want);
      }
    }
  });
});

describe("Listen on every text a voice can read, never the prayers", () => {
  it("is drawn on the Old Testament and a downloaded Bible's page where the device can speak", () => {
    const page = read("components/bible/ReadAloud.tsx");
    expect(page).toContain("return bible ? speaks : recorded || speaks;");
    expect(page).toContain("await listenToChapter({ book, chapter, title, t, bible });");
  });

  it("is never on a prayer's page", () => {
    const prayers = [path.resolve(__dirname, "../../../../app/(app)/prayers"), path.resolve(__dirname, "../../../../components/prayers")];
    const files: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) files.push(p);
      }
    };
    prayers.forEach(walk);
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/<ListenHere\b|<ListenButton\b|<ReadAloudPillButton\b|speakText\(|listenToChapter\(/);
    }
  });
});

class FakeAudio {
  src = "";
  error = null;
  paused = true;
  currentTime = 0;
  duration = NaN;
  loop = false;
  volume = 1;
  preload = "";
  playbackRate = 1;
  defaultPlaybackRate = 1;
  addEventListener() {}
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

describe("choosing another voice while a chapter is read", () => {
  const asks: SpeakAsk[] = [];
  const listeners = new Set<(e: SpeechEvent) => void>();
  const engine: SpeechEngine = {
    side: "android",
    voices: async () => [
      { id: "en-gb-x-gba-local", name: "en-gb-x-gba-local", lang: "en-GB", default: true },
      { id: "en-us-x-sfg-local", name: "en-us-x-sfg-local", lang: "en-US" },
    ],
    speak: async (ask) => {
      asks.push(ask);
    },
    stop: async () => {},
    preview: async () => {},
    nowPlaying: async () => {},
    onEvent: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };

  beforeEach(() => {
    asks.length = 0;
    listeners.clear();
    vi.useFakeTimers();
    vi.resetModules();
    const store = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("Audio", FakeAudio);
    vi.doMock("@/lib/listen/speech/engine", async (orig) => ({ ...(await orig<typeof import("@/lib/listen/speech/engine")>()), speechEngine: async () => engine }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock("@/lib/listen/speech/engine");
  });

  it("reads it again in the new voice from the verse being read, not from the chapter's start", async () => {
    const { speakText } = await import("@/lib/listen/speech/speak");
    const { readAgainIn, voiceContextOf } = await import("@/lib/listen/speech/context");
    const { spokenBibleSrc } = await import("@/lib/listen/speech/spoken");
    const store = await import("@/lib/prayers/persistentAudioStore");
    const pieces = [
      { text: "In the beginning God created the heaven and the earth.", n: 1 },
      { text: "And the earth was without form, and void.", n: 2 },
      { text: "And God said, Let there be light: and there was light.", n: 3 },
    ];
    const [a, b] = await engine.voices();
    await speakText({ src: spokenBibleSrc("genesis", 1), pieces, lang: "en", voice: a, title: "Genesis 1" });
    const first = asks[asks.length - 1];
    expect(first.voice).toBe(a.id);
    // The phone begins verse 3.
    for (const l of listeners) l({ type: "start", token: first.token, index: 2 });
    const about = voiceContextOf(store.getAudioSnapshot().src)!;
    expect(about).toMatchObject({ kind: "chapter", book: "genesis", chapter: 1, lang: "en" });
    await readAgainIn(b, about, (k) => k, true);
    const again = asks[asks.length - 1];
    expect(again.voice).toBe(b.id);
    expect(again.from).toBe(2);
    expect(again.pieces).toEqual(pieces.map((p) => p.text));
    expect(store.getAudioSnapshot().playing).toBe(true);
  });
});

// Updates 19's walk of the export (2026-11-13): Listen tapped on a page, with
// the player closed (the usual way), let the line about a gone voice go at
// once, so Now Playing never said it. What a reader would notice: the voice
// they chose silently replaced, with nothing said where they look.
describe("the line about a gone voice, in Now Playing", () => {
  const engine: SpeechEngine = {
    side: "android",
    voices: async () => [{ id: "en-gb-x-gba-local", name: "Daniel", lang: "en-GB", default: true }],
    speak: async () => {},
    stop: async () => {},
    preview: async () => {},
    nowPlaying: async () => {},
    onEvent: () => () => {},
  };

  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    vi.stubGlobal("navigator", {});
    vi.doMock("@/lib/listen/speech/engine", async (orig) => ({ ...(await orig<typeof import("@/lib/listen/speech/engine")>()), speechEngine: async () => engine }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("@/lib/listen/speech/engine");
  });

  it("waits for the player when Listen begins with it closed, shows while it is open, and goes once it closes", async () => {
    const { chooseVoice } = await import("@/lib/listen/speech/voiceChoice");
    const speak = await import("@/lib/listen/speech/speak");
    chooseVoice("en", "a-voice-since-removed");
    const use = await speak.voiceFor("en", false);
    expect(use).toMatchObject({ kind: "phone", gone: "a-voice-since-removed" });
    expect(speak.voiceShown().gone).not.toBeNull();
    // Listen on a page: the player is closed as the reading begins.
    speak.playerOpenForGone(false);
    expect(speak.voiceShown().gone).not.toBeNull();
    // The reader opens the player: the line is there.
    speak.playerOpenForGone(true);
    expect(speak.voiceShown().gone).not.toBeNull();
    // And closes it: said once, not again for the same voice.
    speak.playerOpenForGone(false);
    expect(speak.voiceShown().gone).toBeNull();
    await speak.voiceFor("en", false);
    expect(speak.voiceShown().gone).toBeNull();
  });

  it("is told each time the player opens or closes", () => {
    const player = read("components/player/NowPlayingSheet.tsx");
    expect(player).toMatch(/useEffect\(\(\) => \{\s*playerOpenForGone\(open\);\s*\}, \[open, gone\]\);/);
    expect(player).not.toContain("if (!open && gone) goneShown();");
    expect(player).toContain('{t("player.voice.gone", { name: voiceName })}');
  });
});
