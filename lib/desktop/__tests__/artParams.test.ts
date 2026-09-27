import { describe, expect, it } from "vitest";

import { artCacheKey, parseArtParams } from "@/lib/desktop/artParams";

const parse = (q: string) => parseArtParams(new URLSearchParams(q));

describe("the Discord picture's query", () => {
  it("takes exactly what the desktop app builds", () => {
    expect(parse("saint=apostle-john&p=12")).toEqual({
      kind: "art",
      saint: "apostle-john",
      progress: 12,
      season: undefined,
      gilded: false,
    });
    expect(parse("saint=basil-the-great&p=62&season=purple&gilded=1")).toEqual({
      kind: "art",
      saint: "basil-the-great",
      progress: 62,
      season: "purple",
      gilded: true,
    });
    expect(parse("p=0")).toMatchObject({ kind: "art", progress: 0 });
    expect(parse("badge=gold")).toEqual({ kind: "badge", season: "gold" });
  });

  it("refuses anything else", () => {
    for (const q of [
      "",
      "saint=Apostle-John",
      "saint=../x",
      "saint=a%2Fb",
      "p=101",
      "p=-1",
      "p=1.5",
      "p=07",
      "season=mauve",
      "saint=apostle-john&gilded=1",
      "saint=apostle-john&gilded=true&season=gold",
      "badge=gold&saint=apostle-john",
      "badge=https://evil.example/x.png",
      "saint=apostle-john&url=https://evil.example",
    ]) {
      expect(parse(q), q).toBeNull();
    }
  });

  it("keys one picture once, in whatever order it was asked for", () => {
    expect(artCacheKey(parse("p=12&saint=apostle-john")!)).toBe(artCacheKey(parse("saint=apostle-john&p=12")!));
    expect(artCacheKey(parse("badge=gold")!)).not.toBe(artCacheKey(parse("season=gold")!));
  });
});
