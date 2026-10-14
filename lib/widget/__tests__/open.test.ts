// A widget's tap cannot be made without a phone, so these hold what can be
// held from here: which screen each address opens, that a part that varies is
// checked against what the app has, that anything else opens Today, and that
// every other URL is left alone. The why is in ../open.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import profiledSaints from "@/data/calendar/profiled-saints.json";
import { getBook } from "@/lib/bible/books";
import { SHORTCUT_PREFIX, shortcutTarget, shortcutUrl } from "@/lib/shortcuts/shortcuts";

import { WIDGET_PREFIX, widgetTarget, widgetUrl } from "../open";

describe("the screens a widget opens", () => {
  it("opens the fixed ones letter for letter", () => {
    expect(widgetTarget(widgetUrl("today"))).toBe("/");
    expect(widgetTarget(widgetUrl("calendar"))).toBe("/calendar");
    expect(widgetTarget(widgetUrl("whats-new"))).toBe("/whats-new");
    expect(widgetTarget(widgetUrl("pray/morning"))).toBe("/prayers/morning");
    expect(widgetTarget(widgetUrl("pray/evening"))).toBe("/prayers/evening");
  });

  it("opens the Morning Rule where the icon's shortcut opens it", () => {
    expect(widgetTarget(widgetUrl("pray/morning"))).toBe(shortcutTarget("morning-prayers", null));
  });

  it("opens the verse in its chapter, as the Verse of the Day's own link does", () => {
    expect(widgetTarget(widgetUrl("verse/luke/8/25"))).toBe("/bible/luke/8#v25");
    expect(widgetTarget(widgetUrl("verse/1-samuel/17/45"))).toBe("/bible/1-samuel/17#v45");
    expect(widgetTarget(widgetUrl("verse/john/1/1"))).toBe("/bible/john/1#v1");
  });

  it("opens a verse in a book's last chapter, and not one past it", () => {
    const luke = getBook("luke")!;
    expect(widgetTarget(widgetUrl(`verse/luke/${luke.chapters}/1`))).toBe(`/bible/luke/${luke.chapters}#v1`);
    expect(widgetTarget(widgetUrl(`verse/luke/${luke.chapters + 1}/1`))).toBe("/");
  });

  it("opens Today for a verse that is not one of the app's", () => {
    for (const bad of [
      "verse/luk/8/25",
      "verse/Luke/8/25",
      "verse/../account/8/25",
      "verse/luke/0/25",
      "verse/luke/08/25",
      "verse/luke/8/0",
      "verse/luke/8/025",
      "verse/luke/8/1000",
      "verse/luke/8/25a",
      "verse/luke/8",
      "verse/luke/8/25/",
      "verse/luke/8/25?x=1",
      "verse/luke/2.5/1",
      "verse/__proto__/1/1",
    ]) {
      expect(widgetTarget(widgetUrl(bad)), bad).toBe("/");
    }
  });

  it("opens the page of a saint the app knows", () => {
    expect(widgetTarget(widgetUrl("saint/nicholas-the-wonderworker"))).toBe("/saints/nicholas-the-wonderworker");
    for (const { slug } of profiledSaints as { slug: string }[]) {
      expect(widgetTarget(widgetUrl(`saint/${slug}`)), slug).toBe(`/saints/${slug}`);
    }
  });

  it("opens Today for a saint it does not", () => {
    for (const bad of [
      "saint/no-such-saint",
      "saint/Nicholas-the-wonderworker",
      "saint/nicholas-the-wonderworker/",
      "saint/nicholas-the-wonderworker/works",
      "saint/../account",
      "saint/",
      "saint/constructor",
      "saint/__proto__",
    ]) {
      expect(widgetTarget(widgetUrl(bad)), bad).toBe("/");
    }
  });

  it("opens Today for anything else under its prefix", () => {
    for (const other of [
      "",
      "calendar/",
      "Calendar",
      "calendar?next=//example.org",
      "pray",
      "pray/midday",
      "pray/morning/",
      "whats-new/1.6",
      "account",
      "constructor",
      "__proto__",
      "toString",
      "%2Fcalendar",
      "https://example.org",
    ]) {
      expect(widgetTarget(WIDGET_PREFIX + other), other).toBe("/");
    }
  });

  it("only ever answers with an address inside the app", () => {
    for (const target of ["today", "calendar", "whats-new", "pray/morning", "pray/evening", "verse/john/3/16", "saint/john-chrysostom", "x"]) {
      expect(widgetTarget(widgetUrl(target)), target).toMatch(/^\/(?!\/)/);
    }
  });
});

describe("telling a widget's tap from every other URL", () => {
  it("leaves alone what is not a widget's", () => {
    for (const other of [
      // The icon's shortcuts take their own road.
      shortcutUrl("morning-prayers"),
      SHORTCUT_PREFIX + "calendar",
      // The Google sign-in callback on the iPhone, and what a link would be.
      "com.googleusercontent.apps.1234-abcd:/oauth2redirect?code=x",
      "https://purifyapp.net/calendar",
      "purify://widget/calendar",
      "net.purifyapp.purify://widgets/calendar",
      "net.purifyapp.purify://elsewhere/calendar",
      "/calendar",
      "",
      null,
      undefined,
      7,
      {},
    ]) {
      expect(widgetTarget(other), String(other)).toBeNull();
    }
  });

  it("shares the app's scheme with the shortcuts, and not their address", () => {
    expect(WIDGET_PREFIX.split("://")[0]).toBe(SHORTCUT_PREFIX.split("://")[0]);
    expect(WIDGET_PREFIX).not.toBe(SHORTCUT_PREFIX);
    expect(widgetUrl("calendar")).toBe("net.purifyapp.purify://widget/calendar");
  });
});

describe("the listener in the app", () => {
  const listener = readFileSync("components/native/ShortcutListener.tsx", "utf8");
  const code = listener.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("asks this file of every URL that is not a shortcut", () => {
    expect(code).toMatch(/import \{ widgetTarget \} from "@\/lib\/widget\/open";/);
    expect(code).toMatch(/const widget = id \? null : widgetTarget\(url\);/);
  });

  it("goes to the widget's screen through the router, as a shortcut does", () => {
    expect(code).toMatch(/router\.push\(widget\)/);
    // The same tap told twice, at launch, is one move for a widget too.
    expect(code.indexOf("sameTap(last, url, now)")).toBeLessThan(code.indexOf("router.push(widget)"));
  });

  it("still takes a shortcut where it took it", () => {
    const skip = code.indexOf("alreadyThere(id, window.location.pathname, target)");
    expect(skip).toBeGreaterThan(-1);
    expect(code.indexOf("router.push(target)")).toBeGreaterThan(skip);
  });
});
