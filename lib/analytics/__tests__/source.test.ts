// Where a visit came from, and what it was read on, from the two things a
// session row has always kept (lib/analytics/source.ts, platform.ts).

import { describe, expect, it } from "vitest";

import { classifyPlatform, isAppPlatform, PLATFORM_KINDS, PLATFORM_LABEL } from "../platform";
import { classifySource, SOURCE_KINDS, SOURCE_LABEL, sourceName } from "../source";

// Real user agents. The first six are the ones lib/analytics/__tests__/bot.test.ts
// already holds as real readers.
const IPHONE_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 PurifyNative";
const ANDROID_APP =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 PurifyNative";
const WINDOWS_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
const ANDROID_WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36";
const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI_OLD = "Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
const IPAD_APP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) PurifyNative";
const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 395.0.0.31.75 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 772356125)";
const TIKTOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 musical_ly_2024008030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/40.8.3 ByteLocale/en BytedanceWebview/d8a21c6";
const FACEBOOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/520.0.0.38.101;FBBV/750000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]";

describe("where a visit came from", () => {
  it("is direct when nothing says otherwise", () => {
    expect(classifySource(null)).toEqual({ kind: "direct", name: null });
    expect(classifySource("")).toEqual({ kind: "direct", name: null });
    expect(classifySource(undefined, WINDOWS_CHROME)).toEqual({ kind: "direct", name: null });
    expect(classifySource("not an address")).toEqual({ kind: "direct", name: null });
  });

  it("names a search engine, in any country", () => {
    expect(classifySource("https://www.google.com/")).toEqual({ kind: "search", name: "Google" });
    expect(classifySource("https://www.google.co.uk/")).toEqual({ kind: "search", name: "Google" });
    expect(classifySource("https://www.google.com.br/search?q=x")).toEqual({ kind: "search", name: "Google" });
    expect(classifySource("https://www.google.gr/")).toEqual({ kind: "search", name: "Google" });
    expect(classifySource("https://www.bing.com/")).toEqual({ kind: "search", name: "Bing" });
    expect(classifySource("https://duckduckgo.com/")).toEqual({ kind: "search", name: "DuckDuckGo" });
    expect(classifySource("https://yandex.ru/")).toEqual({ kind: "search", name: "Yandex" });
    expect(classifySource("https://search.brave.com/")).toEqual({ kind: "search", name: "Brave Search" });
    expect(classifySource("android-app://com.google.android.googlequicksearchbox/")).toEqual({ kind: "search", name: "Google" });
  });

  it("names a social site, short links and phone hosts included", () => {
    expect(classifySource("https://l.instagram.com/")).toEqual({ kind: "social", name: "Instagram" });
    expect(classifySource("https://www.tiktok.com/")).toEqual({ kind: "social", name: "TikTok" });
    expect(classifySource("https://m.youtube.com/")).toEqual({ kind: "social", name: "YouTube" });
    expect(classifySource("https://lm.facebook.com/")).toEqual({ kind: "social", name: "Facebook" });
    expect(classifySource("https://t.co/abc123")).toEqual({ kind: "social", name: "X" });
    expect(classifySource("https://old.reddit.com/r/OrthodoxChristianity/")).toEqual({ kind: "social", name: "Reddit" });
    expect(classifySource("https://discord.com/channels/1/2")).toEqual({ kind: "social", name: "Discord" });
    expect(classifySource("https://www.pinterest.co.uk/")).toEqual({ kind: "social", name: "Pinterest" });
    expect(classifySource("android-app://com.instagram.android/")).toEqual({ kind: "social", name: "Instagram" });
  });

  it("knows mail read in a browser, and the mail apps that say so", () => {
    expect(classifySource("https://mail.google.com/")).toEqual({ kind: "email", name: "Gmail" });
    expect(classifySource("android-app://com.google.android.gm/")).toEqual({ kind: "email", name: "Gmail" });
    expect(classifySource("https://outlook.live.com/")).toEqual({ kind: "email", name: "Outlook" });
    expect(classifySource("https://mail.yahoo.com/")).toEqual({ kind: "email", name: "Yahoo Mail" });
    expect(classifySource("https://mail.proton.me/")).toEqual({ kind: "email", name: "Proton Mail" });
  });

  it("keeps Google's mail and its assistant apart from its search", () => {
    // The order of the table is the rule: the narrower host first.
    expect(classifySource("https://mail.google.com/mail/u/0/").kind).toBe("email");
    expect(classifySource("https://gemini.google.com/app").kind).toBe("assistant");
    expect(classifySource("https://news.google.com/").kind).toBe("search");
  });

  it("names an assistant", () => {
    expect(classifySource("https://chatgpt.com/")).toEqual({ kind: "assistant", name: "ChatGPT" });
    expect(classifySource("https://www.perplexity.ai/")).toEqual({ kind: "assistant", name: "Perplexity" });
    expect(classifySource("https://claude.ai/chat/1")).toEqual({ kind: "assistant", name: "Claude" });
  });

  it("gives any other site by its host", () => {
    expect(classifySource("https://www.orthodoxwiki.org/Theosis")).toEqual({ kind: "site", name: "orthodoxwiki.org" });
    expect(classifySource("https://blog.example.org/post")).toEqual({ kind: "site", name: "blog.example.org" });
    expect(classifySource("android-app://org.example.reader/")).toEqual({ kind: "site", name: "Another app" });
  });

  it("does not call a page of ours a source", () => {
    expect(classifySource("https://purifyapp.net/bible/john/1")).toEqual({ kind: "direct", name: null });
    expect(classifySource("https://www.purifyapp.net/")).toEqual({ kind: "direct", name: null });
    expect(classifySource("https://purifyapp.onrender.com/")).toEqual({ kind: "direct", name: null });
    // The store apps' own pages.
    expect(classifySource("https://localhost/saints")).toEqual({ kind: "direct", name: null });
    expect(classifySource("capacitor://localhost/saints")).toEqual({ kind: "direct", name: null });
  });

  it("does not call the way back from signing in or paying a source", () => {
    expect(classifySource("https://accounts.google.com/")).toEqual({ kind: "direct", name: null });
    expect(classifySource("https://appleid.apple.com/")).toEqual({ kind: "direct", name: null });
    expect(classifySource("https://avbqyvjgcrucjwevwixt.supabase.co/")).toEqual({ kind: "direct", name: null });
    expect(classifySource("https://checkout.stripe.com/")).toEqual({ kind: "direct", name: null });
  });

  it("is not fooled by a lookalike host", () => {
    expect(classifySource("https://google.com.example.org/")).toEqual({ kind: "site", name: "google.com.example.org" });
    expect(classifySource("https://notinstagram.com/")).toEqual({ kind: "site", name: "notinstagram.com" });
    expect(classifySource("https://lh3.googleusercontent.com/a/1")).toEqual({ kind: "site", name: "lh3.googleusercontent.com" });
    expect(classifySource("https://purifyapp.net.example.org/")).toEqual({ kind: "site", name: "purifyapp.net.example.org" });
  });

  it("asks the user agent which app's browser it is, only when the referrer is silent", () => {
    expect(classifySource(null, INSTAGRAM_IOS)).toEqual({ kind: "social", name: "Instagram" });
    expect(classifySource(null, TIKTOK_ANDROID)).toEqual({ kind: "social", name: "TikTok" });
    expect(classifySource(null, FACEBOOK_IOS)).toEqual({ kind: "social", name: "Facebook" });
    // A referrer that speaks is believed over the app it was opened in.
    expect(classifySource("https://www.google.com/", INSTAGRAM_IOS)).toEqual({ kind: "search", name: "Google" });
    // An ordinary webview with no app's name in it is nobody's.
    expect(classifySource(null, ANDROID_WEBVIEW)).toEqual({ kind: "direct", name: null });
    expect(classifySource(null, IPHONE_APP)).toEqual({ kind: "direct", name: null });
  });

  it("has a word for every kind", () => {
    for (const kind of SOURCE_KINDS) expect(SOURCE_LABEL[kind], kind).toBeTruthy();
    expect(sourceName({ kind: "direct", name: null })).toBe("Direct");
    expect(sourceName({ kind: "search", name: "Google" })).toBe("Google");
  });
});

describe("what a visit was read on", () => {
  it("knows the two store apps by the token they carry", () => {
    expect(classifyPlatform(IPHONE_APP)).toBe("ios-app");
    expect(classifyPlatform(ANDROID_APP)).toBe("android-app");
    expect(classifyPlatform(IPAD_APP)).toBe("ios-app");
    expect(isAppPlatform("ios-app")).toBe(true);
    expect(isAppPlatform("web-phone")).toBe(false);
  });

  it("does not take somebody else's webview for our app", () => {
    // "wv" is every Android app's built-in browser. Only the token is ours.
    expect(classifyPlatform(ANDROID_WEBVIEW)).toBe("web-phone");
    expect(classifyPlatform(TIKTOK_ANDROID)).toBe("web-phone");
    expect(classifyPlatform(INSTAGRAM_IOS)).toBe("web-phone");
  });

  it("tells a phone, a tablet and a computer on the website", () => {
    expect(classifyPlatform(IPHONE_SAFARI)).toBe("web-phone");
    expect(classifyPlatform(ANDROID_CHROME)).toBe("web-phone");
    expect(classifyPlatform(IPAD_SAFARI_OLD)).toBe("web-tablet");
    expect(classifyPlatform(ANDROID_TABLET)).toBe("web-tablet");
    expect(classifyPlatform(WINDOWS_CHROME)).toBe("web-computer");
    expect(classifyPlatform(MAC_CHROME)).toBe("web-computer");
  });

  it("says unknown for a session with no user agent", () => {
    expect(classifyPlatform(null)).toBe("unknown");
    expect(classifyPlatform("  ")).toBe("unknown");
  });

  it("has a word for every kind", () => {
    for (const kind of PLATFORM_KINDS) expect(PLATFORM_LABEL[kind], kind).toBeTruthy();
  });
});
