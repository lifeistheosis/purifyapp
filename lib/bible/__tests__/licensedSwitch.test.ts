import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLicensedChapter, isApiConfigured, licensedBibleEnabled } from "@/lib/bible/api-bible";

// The licensed translations (NIV, NKJV, NLT) are switched off while the
// API.Bible licence is upgraded (owner, 2026-09-26). Off must mean off even
// with every key in place, and must never reach API.Bible.
describe("the licensed Bible switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function withKeys() {
    vi.stubEnv("BIBLE_API_KEY", "key");
    vi.stubEnv("BIBLE_ID_NIV", "id-niv");
    vi.stubEnv("BIBLE_ID_NKJV", "id-nkjv");
    vi.stubEnv("BIBLE_ID_NLT", "id-nlt");
  }

  it("is off unless LICENSED_BIBLE is exactly on", () => {
    withKeys();
    vi.stubEnv("LICENSED_BIBLE", "");
    expect(licensedBibleEnabled()).toBe(false);
    for (const v of ["ON", "true", "1", "yes"]) {
      vi.stubEnv("LICENSED_BIBLE", v);
      expect(licensedBibleEnabled(), v).toBe(false);
    }
    vi.stubEnv("LICENSED_BIBLE", "on");
    expect(licensedBibleEnabled()).toBe(true);
  });

  it("keeps every translation unconfigured while off, keys or not", () => {
    withKeys();
    vi.stubEnv("LICENSED_BIBLE", "");
    for (const t of ["niv", "nkjv", "nlt"]) expect(isApiConfigured(t), t).toBe(false);
    vi.stubEnv("LICENSED_BIBLE", "on");
    for (const t of ["niv", "nkjv", "nlt"]) expect(isApiConfigured(t), t).toBe(true);
  });

  it("never calls API.Bible while off", async () => {
    withKeys();
    vi.stubEnv("LICENSED_BIBLE", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await fetchLicensedChapter("niv", "john", 3)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
