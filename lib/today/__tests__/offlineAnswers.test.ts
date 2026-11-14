// Offline, a tap answers (1.9, the gate's offline walk on round 1's export:
// Today's Listen and Community's Try again changed nothing a reader could
// see; Updates 33's find). With no connection and the book not saved, a
// chapter's timings cannot be read and nothing plays: Listen says "Plays with
// a connection" (chants.needsConnection, in all 21 languages), the verse's on
// its own card, the readings' under their buttons. Community's feed, unreached,
// says "No signal. Check your connection and try again." (auth.noSignal) under
// its Try again, again at each tap, and loads by itself once the connection is
// back. A start that found nothing to play no longer pauses what else was
// playing, and timings that could not be read are asked for again next time.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const code = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Listen with no connection", () => {
  type Snap = { src: string | null; playing: boolean; currentTime: number; duration: number };
  const calls: string[] = [];
  let audio: Snap = { src: null, playing: false, currentTime: 0, duration: 0 };
  const subscribers = new Set<() => void>();
  const set = (patch: Partial<Snap>) => {
    audio = { ...audio, ...patch };
    [...subscribers].forEach((f) => f());
  };
  const FOUND: Record<string, { voice: string; seconds: number; verses: { n: number; at: number; end: number }[] }> = {
    "luke/11": { voice: "af_heart", seconds: 60, verses: [{ n: 13, at: 4, end: 9 }] },
  };

  beforeEach(async () => {
    vi.resetModules();
    calls.length = 0;
    audio = { src: null, playing: false, currentTime: 0, duration: 0 };
    vi.doMock("@/lib/prayers/persistentAudioStore", () => ({
      getAudioSnapshot: () => audio,
      subscribeAudio: (f: () => void) => {
        subscribers.add(f);
        return () => subscribers.delete(f);
      },
      setTrack: (src: string) => {
        calls.push(`track ${src}`);
        if (audio.src !== src) set({ src, currentTime: 0, duration: 0 });
      },
      setLoopMode: () => {},
      seek: (t: number) => calls.push(`seek ${t}`),
      play: () => {
        calls.push("play");
        set({ playing: true });
      },
      pause: () => {
        calls.push("pause");
        set({ playing: false });
      },
    }));
    vi.doMock("@/lib/readAloud/chapters", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/readAloud/chapters")>()),
      // No connection: only what the phone keeps can be read.
      readAloudManifest: async (book: string, chapter: number) => FOUND[`${book}/${chapter}`] ?? null,
      readAloudSrc: (book: string, chapter: number) => `/audio/read/${book}/${chapter}.mp3`,
    }));
    vi.doMock("@/lib/readAloud/covers", () => ({ readAloudCover: () => ({ src: "/c.jpg", fallback: "/c.jpg", size: null }) }));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/prayers/persistentAudioStore");
    vi.doUnmock("@/lib/readAloud/chapters");
    vi.doUnmock("@/lib/readAloud/covers");
  });

  it("says a start found nothing to play, and leaves what else was playing to play on", async () => {
    const { startListening, isListening } = await import("@/lib/readings/listen");
    set({ src: "/audio/chants/anthem/en.mp3", playing: true, duration: 200 });
    const came = await startListening([{ book: "john", chapter: 3, from: 16, to: 16, title: "John 3:16", artist: "Verse of the Day" }]);
    expect(came).toBe("unheard");
    expect(calls).not.toContain("pause");
    expect(audio).toMatchObject({ src: "/audio/chants/anthem/en.mp3", playing: true });
    expect(isListening()).toBe(false);
  });

  it("says a start put the verse on, where its timings could be read", async () => {
    const { startListening } = await import("@/lib/readings/listen");
    expect(await startListening([{ book: "luke", chapter: 11, from: 13, to: 13, title: "Luke 11:13", artist: "Verse of the Day" }])).toBe("playing");
    expect(calls).toEqual(["track /audio/read/luke/11.mp3", "play"]);
  });

  it("tells the verse's card it could not be heard, so the card can say so", async () => {
    const { listenToVerse } = await import("@/lib/today/verseListen");
    expect(await listenToVerse({ book: "john", chapter: 3, verse: 16 }, "John 3:16", "Verse of the Day")).toBe("unheard");
  });
});

describe("a chapter's timings that could not be read", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("are asked for again at the next Listen, not kept as missing", async () => {
    vi.resetModules();
    const manifest = { voice: "af_heart", seconds: 60, verses: [{ n: 1, at: 0, end: 5 }] };
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, json: async () => manifest });
    vi.stubGlobal("fetch", fetch);
    const { readAloudManifest } = await import("@/lib/readAloud/chapters");
    expect(await readAloudManifest("mark", 4)).toBeNull();
    // Let the failed read be forgotten before the next one.
    await new Promise((r) => setTimeout(r, 0));
    expect(await readAloudManifest("mark", 4)).toEqual(manifest);
    expect(fetch).toHaveBeenCalledTimes(2);
    // A read that came is kept: no third request.
    expect(await readAloudManifest("mark", 4)).toEqual(manifest);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("the cards that answer", () => {
  it("the verse's Listen says it plays with a connection on its own card", () => {
    const card = code("components/today/VerseCardActions.tsx");
    expect(card).toContain('if (!heardIt) say("chants.needsConnection");');
    expect(card).not.toContain("onClick={heard.toggle}");
  });

  it("the readings' Listen says so under its buttons, again at each tap", () => {
    const rail = code("components/today/ChurchTodayRail.tsx");
    expect(rail).toContain('void startListening(parts).then((came) => setUnheard((n) => (came === "unheard" ? n + 1 : came === "playing" ? 0 : n)));');
    expect(rail).toMatch(/\{unheard \? \(\s*<p key=\{unheard\} role="status" data-listen-unheard="" className="rise-in [^"]*">\s*\{t\("chants\.needsConnection"\)\}/);
    // At 80: at 70 it read 4.50:1 on Stone at 800 by the pixels under it (checkMock on the round's export).
    expect(rail).toContain('data-listen-unheard="" className="rise-in mt-2.5 font-sans text-caption text-paper/80"');
  });
});

describe("Community's feed with no connection", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/api/client");
  });

  it("tells a feed that had no answer at all from one that answered with a failure", async () => {
    vi.resetModules();
    let answer: () => Promise<Response> = () => Promise.reject(new TypeError("Failed to fetch"));
    vi.doMock("@/lib/api/client", () => ({ apiFetch: () => answer() }));
    const { fetchCommunityPosts } = await import("@/lib/community/client");
    expect(await fetchCommunityPosts()).toEqual({ state: "error", unreached: true });
    answer = async () => new Response("", { status: 503 });
    expect(await fetchCommunityPosts()).toEqual({ state: "error" });
    answer = async () => new Response(JSON.stringify({ posts: [] }), { status: 200 });
    expect(await fetchCommunityPosts()).toEqual({ state: "ok", posts: [] });
  });

  it("says why under Try again, again at each tap, and nothing above the button moves", () => {
    const feed = code("components/community/CommunityClient.tsx");
    const panel = feed.slice(feed.indexOf('{t("community.loadFailed")}'), feed.indexOf('{t("community.quietHere")}'));
    expect(panel).toContain("onClick={retryFeed}");
    expect(feed).toMatch(/const retryFeed = useCallback\(\(\) => \{\s*setTries\(\(n\) => n \+ 1\);\s*reload\(\);\s*\}, \[reload\]\);/);
    // Under the button, keyed by the tap, so it comes again each time.
    const button = panel.indexOf('{t("community.tryAgain")}');
    const line = panel.indexOf('{t("auth.noSignal")}');
    expect(button).toBeGreaterThan(0);
    expect(line).toBeGreaterThan(button);
    expect(panel).toContain('{tries > 0 && result.unreached ? (\n                    <p key={tries} role="status" data-feed-unreached="" className="rise-in ');
  });

  it("has both lines in every language the app carries", async () => {
    const { LOCALES } = await import("@/lib/i18n/locales");
    for (const { code: lang } of LOCALES) {
      const m = JSON.parse(code(`lib/i18n/messages/${lang}.json`)) as Record<string, string>;
      expect(m["chants.needsConnection"], lang).toBeTruthy();
      expect(m["auth.noSignal"], lang).toBeTruthy();
    }
  });
});
