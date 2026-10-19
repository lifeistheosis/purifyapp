// History's pictures are the website's (1.7): the apps ask SITE_URL for them
// and carry none. The server decides an event page's address at build time
// (historyMediaSrc, with IS_STATIC_EXPORT); a sheet decides it on the device
// (streamedUrl). The two must give one answer, or a picture would load on one
// screen and not on the other.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { HISTORY_EVENTS } from "@/lib/history/events";
import { HISTORY_MEDIA_ROOT, eventGallery, eventPicture, historyMediaSrc } from "@/lib/history/media";
import { isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
import { SITE_URL } from "@/lib/site";

describe("an event's picture address", () => {
  it("is the website's own file on the website and the website's address in the apps", () => {
    expect(historyMediaSrc("/history/media/pentecost.v1.jpg", false)).toBe("/history/media/pentecost.v1.jpg");
    expect(historyMediaSrc("/history/media/pentecost.v1.jpg", true)).toBe(`${SITE_URL}/history/media/pentecost.v1.jpg`);
  });

  it("agrees with the streamed folders' rule, on both sides, for every picture", () => {
    for (const e of HISTORY_EVENTS) {
      for (const native of [false, true]) {
        const pictures = [eventPicture(e, native), ...eventGallery(e, native)].filter(Boolean);
        const paths = [e.media?.hero, ...(e.media?.gallery ?? []).map((g) => g.src)].filter((p): p is string => Boolean(p));
        expect(pictures.map((p) => p!.src)).toEqual(paths.map((p) => streamedUrl(p, native)));
        for (const p of paths) {
          expect(p.startsWith(HISTORY_MEDIA_ROOT), p).toBe(true);
          expect(isStreamedMedia(p), p).toBe(true);
        }
      }
    }
  });

  it("is left out of the apps' export", () => {
    const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
    const stash = build.slice(build.indexOf("const STASH_PATHS = ["), build.indexOf("function slot("));
    expect(stash).toContain('["public", "history", "media"],');
  });

  it("names a picture by its version, so a replacement never waits on a cached one", () => {
    for (const e of HISTORY_EVENTS) {
      if (e.depth !== "full" || !e.media) continue;
      expect(e.media.hero, e.slug).toMatch(/^\/history\/media\/[a-z0-9-]+\.v\d+\.jpg$/);
    }
  });
});
