// Releases > Update prompts (admin item A3): what installed apps are told,
// against what the store serves. Early is the harmful direction; late only
// means nobody is prompted. Each line says what to change, on Render.

import { afterEach, describe, expect, it, vi } from "vitest";

import { promptLine } from "../updatePrompts";

const SERVED = { build: 91, served: "2026-11-12" };

describe("promptLine", () => {
  it("says nobody is prompted, and that this is right, while the store does not serve the build", () => {
    const p = promptLine("android", 0, "code", "1.9", { build: 91, served: null }, true);
    expect(p.verdict).toBe("off");
    expect(p.line).toBe("Nobody is prompted (in the code). That is right until Google Play serves build 91.");
  });

  it("does not call nobody prompted right when the drop has no build to say so (1.8 went out with none recorded)", () => {
    const p = promptLine("ios", 0, "code", "1.8", { build: 0, served: null }, true);
    expect(p.verdict).toBe("check");
    expect(p.line).toBe(
      "Nobody is prompted (in the code). If the App Store already serves 1.8, set IOS_BUILD_NUMBER to that build's number on Render, and record the build in the drop.",
    );
  });

  it("is behind when the store serves the build and apps are told nothing, and names the setting", () => {
    const p = promptLine("android", 0, "code", "1.9", SERVED, true);
    expect(p.verdict).toBe("behind");
    expect(p.line).toMatch(/^Google Play has served build 91 since 12 Nov, and no app is told\. Set ANDROID_VERSION_CODE=91 on Render/);
  });

  it("is behind when an older build is told, and right when they match", () => {
    expect(promptLine("ios", 40, "render", "1.9", { build: 44, served: "2026-11-12" }, true)).toMatchObject({ verdict: "behind" });
    const ok = promptLine("ios", 44, "render", "1.9", { build: 44, served: "2026-11-12" }, true);
    expect(ok.verdict).toBe("matches");
    expect(ok.line).toBe("Apps on an older build are told 1.9 is out: build 44 (set on Render), as the App Store serves it.");
  });

  it("is ahead, the harmful way, when apps are told a build the store does not serve", () => {
    const over = promptLine("android", 95, "render", "1.9", SERVED, true);
    expect(over.verdict).toBe("ahead");
    expect(over.line).toMatch(/Readers are sent to a build the store does not have\. Set ANDROID_VERSION_CODE=91/);
    const unmarked = promptLine("android", 91, "render", "1.9", { build: 91, served: null }, true);
    expect(unmarked.verdict).toBe("ahead");
  });

  it("compares nothing for a past release", () => {
    expect(promptLine("android", 0, "code", "1.8", SERVED, false).verdict).toBe("check");
    expect(promptLine("android", 80, "render", "1.8", SERVED, false)).toMatchObject({ verdict: "told", line: "Apps on an older build are told build 80 is out (set on Render)." });
  });
});

describe("/api/admin/app-release", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function get(admin: boolean) {
    vi.doMock("@/lib/admin/access", () => ({ getAdminUser: async () => (admin ? { id: "a1", email: "owner@example.com" } : null) }));
    const { GET } = await import("@/app/api/admin/app-release/route");
    return GET();
  }

  it("answers 403 to anyone who is not an admin", async () => {
    expect((await get(false)).status).toBe(403);
  });

  it("says what the server tells apps, and whether Render set it", async () => {
    vi.stubEnv("ANDROID_VERSION_CODE", "91");
    vi.stubEnv("IOS_BUILD_NUMBER", "");
    const body = await (await get(true)).json();
    expect(body.android).toEqual({ told: 91, from: "render" });
    expect(body.ios.from).toBe("code");
  });
});
