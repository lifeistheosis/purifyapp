// What /api/track writes about a session when it is first seen
// (lib/analytics/sessionStart.ts), and that what it writes is read back as
// the same thing by the panel.

import { describe, expect, it } from "vitest";

import { classifyPlatform } from "../platform";
import { sessionStart, USER_AGENT_KEPT } from "../sessionStart";
import { classifySource } from "../source";

const EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

describe("where it came from", () => {
  it("is what the browser said when the link carried no tag", () => {
    expect(sessionStart({ referrer: "https://www.google.com/", userAgent: IPHONE }).referrer).toBe("https://www.google.com/");
    expect(sessionStart({ referrer: null, userAgent: IPHONE }).referrer).toBeNull();
    expect(sessionStart({ referrer: "", userAgent: IPHONE }).referrer).toBeNull();
    expect(sessionStart({ userAgent: IPHONE }).referrer).toBeNull();
  });

  it("is the link's own tag when it carried one, kept in the referrer's place", () => {
    const start = sessionStart({ referrer: null, tag: "email-release-1.5", userAgent: IPHONE });
    expect(start.referrer).toBe("purify-link://email-release-1.5");
    expect(classifySource(start.referrer, start.user_agent)).toEqual({ kind: "email", name: "Our email: release-1.5" });
  });

  it("believes the tag over the referrer, because our link knows which email it was in", () => {
    const start = sessionStart({ referrer: "https://mail.google.com/", tag: "email-release-1.5", userAgent: IPHONE });
    expect(classifySource(start.referrer, start.user_agent).name).toBe("Our email: release-1.5");
  });

  it("drops a word that is not a tag and lets the referrer stand", () => {
    for (const bad of ["two words", "<script>", "a".repeat(41), "reader@example.org", ""]) {
      expect(sessionStart({ referrer: "https://www.bing.com/", tag: bad, userAgent: IPHONE }).referrer, bad).toBe("https://www.bing.com/");
    }
  });
});

describe("what it is read on", () => {
  it("keeps the user agent, cut to what the privacy page says", () => {
    expect(sessionStart({ userAgent: EDGE }).user_agent).toBe(EDGE);
    expect(sessionStart({ userAgent: "x".repeat(900) }).user_agent).toHaveLength(USER_AGENT_KEPT);
    expect(sessionStart({ userAgent: null }).user_agent).toBe("");
  });

  it("writes one word after it for the Windows app, which the request cannot show", () => {
    const start = sessionStart({ userAgent: EDGE, app: "desktop" });
    expect(start.user_agent).toBe(`${EDGE} PurifyDesktop`);
    expect(classifyPlatform(start.user_agent)).toBe("desktop-app");
    // Without the page saying so, the same request is the website on a computer.
    expect(classifyPlatform(sessionStart({ userAgent: EDGE }).user_agent)).toBe("web-computer");
  });

  it("stays inside the same length with the word on", () => {
    const start = sessionStart({ userAgent: "x".repeat(900), app: "desktop" });
    expect(start.user_agent).toHaveLength(USER_AGENT_KEPT);
    expect(start.user_agent.endsWith(" PurifyDesktop")).toBe(true);
  });

  it("ignores an app it does not know", () => {
    expect(sessionStart({ userAgent: EDGE, app: "toaster" }).user_agent).toBe(EDGE);
    expect(sessionStart({ userAgent: EDGE, app: "" }).user_agent).toBe(EDGE);
  });
});
