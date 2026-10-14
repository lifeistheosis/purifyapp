import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  WIDGET_PLATFORMS,
  WIDGET_STEPS,
  WIDGET_TIP_WAIT_DAYS,
  daysApart,
  hasWidget,
  parseTipState,
  tipDue,
} from "@/lib/widget/tip";

/**
 * The widget tip: when the one card shows, and that what it says is true.
 *
 * The card promises a widget and tells a reader where to find it. Both can go
 * stale without any code here changing: the widget's entry in the Android
 * manifest, the name it is listed under, a step whose words were never
 * written. The second half of this file reads those so the tip cannot point
 * at something that is not there.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const messages = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;

describe("what storage holds", () => {
  it("reads nothing, or anything unexpected, as never seen", () => {
    const fresh = { first: null, done: false };
    for (const raw of [null, undefined, "", "not json", "[]", "7", "null", JSON.stringify({ first: 20261011 })]) {
      expect(parseTipState(raw), String(raw)).toEqual(fresh);
    }
  });

  it("keeps a day key and a dismissal", () => {
    expect(parseTipState(JSON.stringify({ first: "2026-10-11", done: false }))).toEqual({ first: "2026-10-11", done: false });
    expect(parseTipState(JSON.stringify({ first: "2026-10-11", done: true }))).toEqual({ first: "2026-10-11", done: true });
  });

  it("drops a first day that is not a day key, and keeps the dismissal beside it", () => {
    expect(parseTipState(JSON.stringify({ first: "yesterday", done: true }))).toEqual({ first: null, done: true });
    expect(parseTipState(JSON.stringify({ first: "2026-10-11T08:00:00Z" })).first).toBeNull();
  });

  it("takes only true for done", () => {
    expect(parseTipState(JSON.stringify({ first: "2026-10-11", done: "yes" })).done).toBe(false);
    expect(parseTipState(JSON.stringify({ first: "2026-10-11", done: 1 })).done).toBe(false);
  });
});

describe("counting days", () => {
  it("counts whole days, across a month and a year", () => {
    expect(daysApart("2026-10-11", "2026-10-11")).toBe(0);
    expect(daysApart("2026-10-11", "2026-10-13")).toBe(2);
    expect(daysApart("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysApart("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("is negative when the clock has gone back", () => {
    expect(daysApart("2026-10-11", "2026-10-09")).toBe(-2);
  });
});

describe("when the card shows", () => {
  const seen = (first: string | null, done = false) => ({ first, done });

  it("waits out a reader's first days", () => {
    expect(WIDGET_TIP_WAIT_DAYS).toBe(2);
    expect(tipDue(seen("2026-10-11"), "2026-10-11", "android")).toBe(false);
    expect(tipDue(seen("2026-10-11"), "2026-10-12", "android")).toBe(false);
    expect(tipDue(seen("2026-10-11"), "2026-10-13", "android")).toBe(true);
    expect(tipDue(seen("2026-10-11"), "2026-12-25", "android")).toBe(true);
  });

  it("never shows before a first day is written down", () => {
    expect(tipDue(seen(null), "2026-10-13", "android")).toBe(false);
  });

  it("never comes back once it is done", () => {
    expect(tipDue(seen("2026-10-01", true), "2026-10-13", "android")).toBe(false);
  });

  it("reads a clock set back as not yet", () => {
    expect(tipDue(seen("2026-10-11"), "2026-10-01", "android")).toBe(false);
  });

  it("shows nothing on the web", () => {
    expect(tipDue(seen("2026-10-01"), "2026-10-13", null)).toBe(false);
    expect(hasWidget(null)).toBe(false);
  });

  it("shows only in a shell that has a widget", () => {
    for (const platform of ["android", "ios"] as const) {
      expect(tipDue(seen("2026-10-01"), "2026-10-13", platform), platform).toBe(WIDGET_PLATFORMS.includes(platform));
      expect(hasWidget(platform), platform).toBe(WIDGET_PLATFORMS.includes(platform));
    }
  });
});

describe("what the tip says is true", () => {
  it("has written steps for every shell with a widget, and none for a shell without", () => {
    for (const platform of ["android", "ios"] as const) {
      const steps = WIDGET_STEPS[platform];
      if (WIDGET_PLATFORMS.includes(platform)) {
        expect(steps.length, platform).toBeGreaterThanOrEqual(2);
        for (const key of steps) expect(messages[key], key).toBeTruthy();
      } else {
        expect(steps, platform).toEqual([]);
      }
    }
  });

  it("has every other line it shows", () => {
    for (const key of [
      "widgetTip.eyebrow",
      "widgetTip.title",
      "widgetTip.body",
      "widgetTip.show",
      "widgetTip.sheetTitle",
      "widgetTip.note",
      "widgetTip.done",
      "settings.widget",
      "settings.widgetRow",
      "settings.widgetHint",
      "onboard.nudge.dismiss",
    ]) {
      expect(messages[key], key).toBeTruthy();
    }
  });

  it("Android: the widget is declared, and listed under the name the steps give", () => {
    expect(WIDGET_PLATFORMS).toContain("android");
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    // A launcher's widget list is grouped by app, under the app's own name,
    // and each of Purify's widgets is listed there by its family's name
    // (docs/WIDGETS.md). The step says to find Purify, which is that group.
    expect(manifest).toMatch(/<application[\s\S]*?android:label="@string\/app_name"/);
    expect(manifest).toMatch(/android:name="\.DayWidgetProvider"\s+android:label="@string\/widget_today_label"/);
    expect(read("android/app/src/main/res/values/strings.xml")).toContain('<string name="app_name">Purify</string>');
    // The step that tells a reader what to look for names it.
    expect(messages["widgetTip.android.step3"]).toContain("Purify");
  });

  it("the iPhone: no tip until the project carries a widget extension", () => {
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    const hasExtension = /WidgetKit|app-extension/.test(project);
    expect(WIDGET_PLATFORMS.includes("ios")).toBe(hasExtension);
  });
});

describe("where it is shown", () => {
  it("once at the foot of Today, under the Church's day", () => {
    const today = read("components/today/TodayMobileV3.tsx");
    const rail = today.indexOf("<ChurchTodayRail />");
    const card = today.indexOf("<WidgetTipCard");
    expect(rail).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(rail);
    expect(today.split("<WidgetTipCard").length - 1).toBe(1);
  });

  it("and kept in Settings, behind a row of its own", () => {
    const settings = read("components/settings/SettingsClient.tsx");
    expect(settings).toContain("<WidgetSection />");
    expect(settings).toContain("<WidgetTipSheet");
    // The section is not drawn where there is no widget.
    expect(settings).toMatch(/const platform = useWidgetPlatform\(\);[\s\S]{0,120}if \(!platform\) return null;/);
  });
});
