import { describe, expect, it } from "vitest";
import { cacheWindowKey } from "../apiUsage";

/**
 * The deduplication key is the whole accuracy of the call counter.
 *
 * lib/bible/api-bible.ts fetches with `revalidate: 60 * 60 * 6`, so one chapter
 * reaches API.Bible at most four times a day however many readers open it. If
 * this key were wrong in the loose direction the counter would count readers
 * and overstate usage enormously, raising a licence alarm for nothing. If it
 * were wrong in the tight direction it would undercount and report comfort
 * that is not there. Both failures are worse than no counter.
 */
describe("cacheWindowKey", () => {
  const at = (iso: string) => new Date(iso);

  it("is stable across a six hour window, so repeat readers count once", () => {
    const a = cacheWindowKey("bible-1", "JHN.1", at("2026-08-22T00:00:00Z"));
    const b = cacheWindowKey("bible-1", "JHN.1", at("2026-08-22T05:59:59Z"));
    expect(a).toBe(b);
  });

  it("changes when the window rolls, because the cache expires with it", () => {
    const a = cacheWindowKey("bible-1", "JHN.1", at("2026-08-22T05:59:59Z"));
    const b = cacheWindowKey("bible-1", "JHN.1", at("2026-08-22T06:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("gives exactly four windows in a day", () => {
    const keys = new Set(
      ["00", "06", "12", "18"].map((h) =>
        cacheWindowKey("bible-1", "JHN.1", at(`2026-08-22T${h}:30:00Z`)),
      ),
    );
    expect(keys.size).toBe(4);
  });

  it("separates chapters, so two chapters in one window are two calls", () => {
    const when = at("2026-08-22T09:00:00Z");
    expect(cacheWindowKey("bible-1", "JHN.1", when)).not.toBe(
      cacheWindowKey("bible-1", "JHN.2", when),
    );
  });

  it("separates translations, because each is a distinct request", () => {
    const when = at("2026-08-22T09:00:00Z");
    expect(cacheWindowKey("bible-niv", "JHN.1", when)).not.toBe(
      cacheWindowKey("bible-nkjv", "JHN.1", when),
    );
  });

  it("does not collide across days", () => {
    expect(cacheWindowKey("b", "JHN.1", at("2026-08-22T09:00:00Z"))).not.toBe(
      cacheWindowKey("b", "JHN.1", at("2026-08-23T09:00:00Z")),
    );
  });

  it("counts a busy chapter once per window rather than once per reader", () => {
    // The defect this exists to prevent, stated as a test: a thousand readers
    // opening John 1 inside one window is ONE request to API.Bible.
    const when = at("2026-08-22T09:00:00Z");
    const keys = new Set(
      Array.from({ length: 1000 }, () => cacheWindowKey("bible-1", "JHN.1", when)),
    );
    expect(keys.size).toBe(1);
  });
});
