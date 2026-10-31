// The reader's day, known in the first frame on the device (1.8, the owner's
// note 58: going back from a chant to Chants "is buggy").
//
// useToday hands a screen no day on its first render and the day a frame
// later, so whatever the day decides arrives late and moves what is under
// it: Chants came back from a chant without its rows (this week's tone, the
// feast, the Psalms), then jumped as they arrived. useTodayAtOnce is the
// same day from a store of the device's clock, which React reads in the
// first render wherever the page is drawn on the device, and not at all on
// the server, so the export still bakes no date into its pages.

import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { todayNow, useTodayAtOnce } from "@/lib/calendar/useToday";

describe("the day, known at once on the device", () => {
  it("is the device's calendar day, the same Date all day and a new one when it turns", () => {
    const morning = todayNow(new Date(2026, 9, 31, 7, 5));
    const night = todayNow(new Date(2026, 9, 31, 23, 59));
    // The same object, so a store handing it out changes only with the day.
    expect(night).toBe(morning);
    expect(morning.toISOString()).toBe("2026-10-31T12:00:00.000Z");
    const next = todayNow(new Date(2026, 10, 1, 0, 1));
    expect(next).not.toBe(morning);
    expect(next.toISOString()).toBe("2026-11-01T12:00:00.000Z");
  });

  it("is none on the server, so the export bakes no date into a page", () => {
    function Day() {
      const day = useTodayAtOnce();
      return createElement("span", null, day ? "a day" : "none");
    }
    expect(renderToStaticMarkup(createElement(Day))).toBe("<span>none</span>");
  });

  it("is the day Chants is drawn from", () => {
    const home = fs.readFileSync("components/chants/ChantsHome.tsx", "utf8");
    expect(home).toContain("const today = useTodayAtOnce();");
    expect(home).not.toMatch(/\buseToday\(\)/);
  });
});
