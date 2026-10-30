// Where chant media is and who may read it (1.7).
//
// Chant recordings stream from the website and never ship in the apps: the
// export leaves /audio/chants out, the apps ask SITE_URL for it, and the
// website lets the apps' origins read it. Each half is useless without the
// other, and none of it shows in a curl that answers 200: a browser refuses a
// same-origin file to another origin while the server says 200 (the email
// pictures, 2026-10-06). So the halves are held together here, as source.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { availabilityOf, readLiveList } from "@/lib/chants/live";
import {
  CHANT_MEDIA_PREFIX,
  CHANT_RECORDINGS,
  LIVE_LIST_PATH,
  bucketRecording,
  chantMediaUrl,
  englishOver,
  formatDuration,
  inBucket,
  isStreamed,
  streamedPaths,
  subLines,
  variantRef,
} from "@/lib/chants/media";
import { SITE_URL } from "@/lib/site";

const streamed = { id: "en", audio: { src: "/audio/chants/prayer-rope-anthem/en.mp3" } };
const bundled = { id: "en", audio: { src: "/audio/some-bundled.mp3" } };
const inTheBucket = { id: "el", audio: { src: "https://audio.purifyapp.net/chants/psalm-135/el.mp3" } };

describe("a chant's media address", () => {
  it("is the page's own on the website, the website's in the apps", () => {
    expect(chantMediaUrl("/audio/chants/x/a.mp3", false)).toBe("/audio/chants/x/a.mp3");
    expect(chantMediaUrl("/audio/chants/x/a.mp3", true)).toBe(`${SITE_URL}/audio/chants/x/a.mp3`);
    // Anything the bundle carries is used as it is, in the apps too.
    expect(chantMediaUrl("/audio/art/anthem.jpg", true)).toBe("/audio/art/anthem.jpg");
    expect(isStreamed("/audio/art/anthem.jpg")).toBe(false);
  });

  it("follows one layout: a folder per chant, a file per version", () => {
    expect(streamedPaths("psalm-103", "znamenny")).toEqual({
      audio: `${CHANT_MEDIA_PREFIX}psalm-103/znamenny.mp3`,
      timing: `${CHANT_MEDIA_PREFIX}psalm-103/znamenny.json`,
    });
    expect(bucketRecording("psalm-103", "znamenny")).toBe(`${CHANT_RECORDINGS}psalm-103/znamenny.mp3`);
    expect(variantRef("psalm-103", "znamenny")).toBe("psalm-103/znamenny");
    expect(LIVE_LIST_PATH).toBe("/audio/chants/live.json");
  });

  it("plays a recording kept in Purify's bucket from there, on the website and in the apps alike (1.8)", () => {
    // The owner, 2026-10-30: "R2, like the Bible audio".
    expect(CHANT_RECORDINGS).toBe("https://audio.purifyapp.net/chants/");
    expect(inBucket(inTheBucket.audio.src)).toBe(true);
    expect(isStreamed(inTheBucket.audio.src)).toBe(true);
    expect(chantMediaUrl(inTheBucket.audio.src, false)).toBe(inTheBucket.audio.src);
    expect(chantMediaUrl(inTheBucket.audio.src, true)).toBe(inTheBucket.audio.src);
    // Its timing file is still the website's.
    expect(chantMediaUrl("/audio/chants/psalm-135/el.json", true)).toBe(`${SITE_URL}/audio/chants/psalm-135/el.json`);
    expect(inBucket("https://audio.purifyapp.net/read/john/1.mp3")).toBe(false);
    // The website's pages may play from the bucket (the read-aloud opened it).
    expect(fs.readFileSync("lib/security/headers.ts", "utf8")).toContain(`"media-src 'self' https://audio.purifyapp.net"`);
  });

  it("is said as minutes and seconds", () => {
    expect(formatDuration(126.9)).toBe("2:07");
    expect(formatDuration(59.6)).toBe("1:00");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("puts the English over the sung words and the transliteration under them, as the reader chose (1.8, Sing along)", () => {
    const line = { text: "Χριστὸς ἀνέστη", translit: "Christós anésti", en: "Christ is risen" };
    expect(subLines(line, { translit: true, en: true })).toEqual(["Christós anésti"]);
    expect(subLines(line, { translit: false, en: true })).toEqual([]);
    expect(englishOver(line, { translit: false, en: true })).toBe("Christ is risen");
    expect(englishOver(line, { translit: true, en: false })).toBeUndefined();
    // A line that is English already has no English over it.
    expect(englishOver({ text: "Christ is risen", en: "Christ is risen" }, { translit: true, en: true })).toBeUndefined();
    expect(englishOver({ text: "Christ is risen" }, { translit: true, en: true })).toBeUndefined();
  });
});

describe("the website, for the apps", () => {
  const config = fs.readFileSync("next.config.ts", "utf8");

  it("lets the apps read every chant file: the resource policy and CORS on /audio/chants", () => {
    const rule = config.slice(config.indexOf("const streamedMediaHeaders"), config.indexOf("const CHANT_MEDIA_SOURCE"));
    expect(rule).toMatch(/key: "Cross-Origin-Resource-Policy", value: "cross-origin"/);
    expect(rule).toMatch(/key: "Access-Control-Allow-Origin", value: "\*"/);
    expect(config).toContain('const CHANT_MEDIA_SOURCE = "/audio/chants/:path*";');
    // And the rule is applied, after the site-wide one it overrides.
    const headers = config.slice(config.indexOf("async headers()"));
    const general = headers.indexOf("{ source: \"/:path*\", headers: securityHeaders }");
    const chants = headers.indexOf("{ source: CHANT_MEDIA_SOURCE, headers: streamedMediaHeaders }");
    expect(general).toBeGreaterThan(-1);
    expect(chants).toBeGreaterThan(general);
  });

  it("keeps the takedown list fresh for minutes, not a day", () => {
    const headers = config.slice(config.indexOf("async headers()"));
    expect(headers).toMatch(/\{ source: CHANT_LIVE_LIST, headers: \[\{ key: "Cache-Control", value: "public, max-age=300" \}\] \}/);
    expect(headers.indexOf("CHANT_LIVE_LIST")).toBeGreaterThan(headers.indexOf("CHANT_MEDIA_SOURCE"));
  });

  it("sends an old link to the Anthem's page to its chant", () => {
    expect(config).toContain('{ source: "/prayers/anthem", destination: "/chants/prayer-rope-anthem", permanent: true }');
  });

  it("sends no old Kitchen link anywhere: those show the not-found page", () => {
    expect(config).not.toMatch(/destination: "\/kitchen/);
    expect(config).not.toMatch(/source: "\/trapeza/);
  });

  it("serves the chant folder the apps' export leaves out", () => {
    const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
    expect(build).toContain('["public", "audio", "chants"],');
    expect(fs.existsSync("public/audio/chants/live.json")).toBe(true);
  });
});

describe("which recordings may play", () => {
  const list = { live: ["prayer-rope-anthem/en"], pulled: ["prayer-rope-anthem/fr", "other/en"] };

  it("plays a streamed recording only once the list is read and names it", () => {
    expect(availabilityOf(list, "prayer-rope-anthem", streamed)).toBe("playable");
    expect(availabilityOf("unknown", "prayer-rope-anthem", streamed)).toBe("checking");
    // It fails closed: no list, no signal, no play.
    expect(availabilityOf(null, "prayer-rope-anthem", streamed)).toBe("offline");
    // Read, and not named: not available.
    expect(availabilityOf({ live: [], pulled: [] }, "prayer-rope-anthem", streamed)).toBe("pulled");
  });

  it("takes a recording down with one line, bundled ones too", () => {
    expect(availabilityOf(list, "prayer-rope-anthem", { ...streamed, id: "fr" })).toBe("pulled");
    expect(availabilityOf(list, "other", bundled)).toBe("pulled");
  });

  it("holds a bucket recording to the list as it holds the website's (1.8)", () => {
    // Taken down with one line, if a choir objects: the owner's word of 2026-10-30.
    expect(availabilityOf({ live: ["psalm-135/el"], pulled: [] }, "psalm-135", inTheBucket)).toBe("playable");
    expect(availabilityOf({ live: [], pulled: ["psalm-135/el"] }, "psalm-135", inTheBucket)).toBe("pulled");
    expect(availabilityOf({ live: [], pulled: [] }, "psalm-135", inTheBucket)).toBe("pulled");
    expect(availabilityOf(null, "psalm-135", inTheBucket)).toBe("offline");
    expect(availabilityOf("unknown", "psalm-135", inTheBucket)).toBe("checking");
  });

  it("plays a bundled recording with no signal", () => {
    expect(availabilityOf(null, "other", bundled)).toBe("playable");
    expect(availabilityOf("unknown", "other", bundled)).toBe("playable");
    expect(availabilityOf("unavailable", "other", bundled)).toBe("playable");
  });

  it("says why a list could not be read: no signal, or a signal and no list", () => {
    // 2026-10-17: the 1.7 apps reached a website with no live.json, and
    // readers with a good connection were told to find one.
    expect(availabilityOf("offline", "prayer-rope-anthem", streamed)).toBe("offline");
    expect(availabilityOf("unavailable", "prayer-rope-anthem", streamed)).toBe("unavailable");
  });

  it("reads live.json, and nothing that is not it", () => {
    const file = JSON.parse(fs.readFileSync("public/audio/chants/live.json", "utf8"));
    expect(readLiveList(file)).not.toBeNull();
    expect(readLiveList({ v: 2, live: [], pulled: [] })).toBeNull();
    expect(readLiveList({ v: 1, live: "x", pulled: [] })).toBeNull();
    expect(readLiveList(null)).toBeNull();
  });
});
