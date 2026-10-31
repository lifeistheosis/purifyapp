import { describe, expect, it } from "vitest";

import { FAILED_DEPLOY, readRenderDeploys, renderDashboardUrl } from "../renderDeploy";

/**
 * The Render probe read only whether Render's API answered, so a deploy that
 * died in its build showed as OK (r3-17 sheet, 2026-10-30, the day one did).
 * These hold the reading of the deploy list that replaced it.
 */

const deploy = (id: string, status: string, sha: string, finishedAt: string | null = "2026-10-30T18:00:00Z") => ({
  deploy: { id, status, commit: { id: sha }, createdAt: "2026-10-30T17:50:00Z", finishedAt },
  cursor: id,
});

describe("reading Render's deploy list", () => {
  it("fails the probe when the newest deploy failed, and names what the site still serves", () => {
    const r = readRenderDeploys(
      [deploy("dep-new", "build_failed", "1a2b3c4d5e6f"), deploy("dep-old", "live", "9f8e7d6c5b4a")],
      "srv-123",
    );
    expect(r.status).toBe("fail");
    expect(r.deploy).toMatchObject({
      failed: true,
      status: "build_failed",
      commit: "1a2b3c4",
      at: "2026-10-30T18:00:00Z",
      serving: { commit: "9f8e7d6" },
      url: "https://dashboard.render.com/web/srv-123/deploys/dep-new",
    });
    expect(r.detail).toContain("build_failed");
    expect(r.detail).toContain("still serves 9f8e7d6");
  });

  it("treats every failed status Render gives as a failure", () => {
    for (const status of FAILED_DEPLOY) {
      expect(readRenderDeploys([deploy("d", status, "abcdef0")], "srv").status, status).toBe("fail");
    }
  });

  it("is OK when the newest deploy is live", () => {
    const r = readRenderDeploys([deploy("d1", "live", "abcdef0123")], "srv");
    expect(r.status).toBe("ok");
    expect(r.deploy?.failed).toBe(false);
    expect(r.deploy?.serving?.commit).toBe("abcdef0");
  });

  it("is OK while a deploy is under way, and says what serves meanwhile", () => {
    const r = readRenderDeploys([deploy("d2", "build_in_progress", "1111111", null), deploy("d1", "live", "2222222")], "srv");
    expect(r.status).toBe("ok");
    expect(r.detail).toContain("under way");
    expect(r.detail).toContain("2222222");
    expect(r.deploy?.at).toBe("2026-10-30T17:50:00Z");
  });

  it("fails on a body it cannot read, and says nothing is wrong with an empty list", () => {
    expect(readRenderDeploys({ error: "nope" }, "srv").status).toBe("fail");
    expect(readRenderDeploys([], "srv")).toEqual({ status: "ok", detail: "no deploys listed yet", deploy: null });
  });

  it("links to the service when there is no deploy id", () => {
    expect(renderDashboardUrl("srv-9", null)).toBe("https://dashboard.render.com/web/srv-9");
  });
});
