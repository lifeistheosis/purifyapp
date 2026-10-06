// Where a visit came from and what it is read on, in the panel's words
// (lib/admin/arrivals.ts). The Live list, the activity feed and the Sources
// panel all say what this says.

import { describe, expect, it } from "vitest";

import { arrivalLine, arrivalOf, OPENED_THE_APP, rollupArrivals } from "../arrivals";

const IPHONE_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 PurifyNative";
const ANDROID_APP =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 PurifyNative";
const WINDOWS_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 395.0.0.31.75 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 772356125)";

describe("one visit in words", () => {
  it("says the place and what it was read on", () => {
    expect(arrivalOf("https://www.google.com/", WINDOWS_CHROME)).toEqual({
      from: "Google",
      fromKind: "search",
      on: "Website, computer",
      onKind: "web-computer",
    });
    expect(arrivalOf("android-app://com.google.android.gm/", ANDROID_CHROME)).toEqual({
      from: "Gmail",
      fromKind: "email",
      on: "Website, phone",
      onKind: "web-phone",
    });
  });

  it("names the app whose browser a visit came through", () => {
    const a = arrivalOf(null, INSTAGRAM_IOS);
    expect(a.from).toBe("Instagram");
    expect(a.on).toBe("Website, phone");
  });

  it("calls a direct visit inside one of the apps what it is: the app was opened", () => {
    expect(arrivalOf(null, IPHONE_APP)).toEqual({ from: OPENED_THE_APP, fromKind: "direct", on: "iPhone app", onKind: "ios-app" });
    expect(arrivalOf("https://localhost/saints", ANDROID_APP).from).toBe(OPENED_THE_APP);
    // On the website the same silence is only "Direct".
    expect(arrivalOf(null, IPHONE_SAFARI).from).toBe("Direct");
  });

  it("knows the Windows app once the route has written its word beside the user agent", () => {
    const a = arrivalOf(null, `${WINDOWS_CHROME} PurifyDesktop`);
    expect(a).toEqual({ from: OPENED_THE_APP, fromKind: "direct", on: "Windows app", onKind: "desktop-app" });
    expect(rollupArrivals([{ referrer: null, user_agent: `${WINDOWS_CHROME} PurifyDesktop` }]).appSessions).toBe(1);
  });

  it("names a visit from one of our own emails, whatever the mail app hid", () => {
    // Apple Mail sends no referrer. The link's own tag is kept in its place.
    const a = arrivalOf("purify-link://email-release-1.5", IPHONE_SAFARI);
    expect(a.from).toBe("Our email: release-1.5");
    expect(a.fromKind).toBe("email");
    const counted = rollupArrivals([{ referrer: "purify-link://email-release-1.5", user_agent: IPHONE_SAFARI }]);
    expect(counted.websiteSources.find((s) => s.key === "email")?.count).toBe(1);
    expect(counted.places[0]).toMatchObject({ label: "Our email: release-1.5", kind: "email", count: 1 });
  });

  it("fits on one line under a sentence", () => {
    expect(arrivalLine(arrivalOf(null, INSTAGRAM_IOS))).toBe("Instagram · Website, phone");
    expect(arrivalLine(arrivalOf(null, IPHONE_APP))).toBe("Opened the app · iPhone app");
  });

  it("hands on no referrer and no user agent, only what was made of them", () => {
    const a = arrivalOf("https://old.reddit.com/r/OrthodoxChristianity/comments/abc/a_long_title/?utm_name=x", WINDOWS_CHROME);
    expect(Object.keys(a).sort()).toEqual(["from", "fromKind", "on", "onKind"]);
    expect(JSON.stringify(a)).not.toContain("comments");
    expect(JSON.stringify(a)).not.toContain("Mozilla");
  });
});

describe("many visits counted", () => {
  const rows = [
    { referrer: "https://www.google.com/", user_agent: WINDOWS_CHROME },
    { referrer: "https://www.google.co.uk/", user_agent: ANDROID_CHROME },
    { referrer: "https://www.bing.com/", user_agent: WINDOWS_CHROME },
    { referrer: null, user_agent: INSTAGRAM_IOS },
    { referrer: "https://l.instagram.com/", user_agent: IPHONE_SAFARI },
    { referrer: "https://mail.google.com/", user_agent: WINDOWS_CHROME },
    { referrer: "https://orthodoxwiki.org/Theosis", user_agent: WINDOWS_CHROME },
    { referrer: null, user_agent: IPHONE_APP },
    { referrer: null, user_agent: ANDROID_APP },
    { referrer: null, user_agent: WINDOWS_CHROME },
    { referrer: null, user_agent: null },
  ];
  const out = rollupArrivals(rows);

  it("counts every visit once in each breakdown", () => {
    expect(out.total).toBe(11);
    expect(out.sources.reduce((n, s) => n + s.count, 0)).toBe(11);
    expect(out.platforms.reduce((n, p) => n + p.count, 0)).toBe(11);
    expect(out.appSessions + out.websiteSessions).toBe(11);
  });

  it("groups by the kind of place, every kind present even at nothing", () => {
    const by = Object.fromEntries(out.sources.map((s) => [s.key, s.count]));
    expect(by).toEqual({ search: 3, social: 2, email: 1, assistant: 0, site: 1, direct: 4 });
    expect(out.sources.map((s) => s.label)).toEqual(["Search", "Social", "Email", "AI assistants", "Other sites", "Direct"]);
  });

  it("counts the website's sources apart, because an app is opened and not arrived at", () => {
    const by = Object.fromEntries(out.websiteSources.map((s) => [s.key, s.count]));
    // The two app visits were "direct". Left in, they would read as readers who came from nowhere.
    expect(by).toEqual({ search: 3, social: 2, email: 1, assistant: 0, site: 1, direct: 2 });
    expect(out.websiteSources.reduce((n, s) => n + s.count, 0)).toBe(out.websiteSessions);
  });

  it("names the places, most first, and gives a direct visit no name", () => {
    expect(out.places.map((p) => `${p.label} ${p.count}`)).toEqual(["Google 2", "Instagram 2", "Bing 1", "Gmail 1", "orthodoxwiki.org 1"]);
    expect(out.places.find((p) => p.label === "Gmail")?.kind).toBe("email");
    expect(out.places.some((p) => p.label === "Direct")).toBe(false);
  });

  it("tells the apps from the website", () => {
    const by = Object.fromEntries(out.platforms.map((p) => [p.key, p.count]));
    expect(by).toEqual({ "android-app": 1, "ios-app": 1, "desktop-app": 0, "web-phone": 3, "web-tablet": 0, "web-computer": 5, unknown: 1 });
    expect(out.appSessions).toBe(2);
    expect(out.websiteSessions).toBe(9);
  });

  it("keeps only as many named places as asked", () => {
    expect(rollupArrivals(rows, 2).places.map((p) => p.label)).toEqual(["Google", "Instagram"]);
  });

  it("is all zeros for no visits, not an error", () => {
    const none = rollupArrivals([]);
    expect(none.total).toBe(0);
    expect(none.places).toEqual([]);
    expect(none.sources.every((s) => s.count === 0)).toBe(true);
  });
});
