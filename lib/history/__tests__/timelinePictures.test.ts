// The timeline's list with its pictures (1.9, the owner's pick, "a mix of A
// and B": the prominent events large, the smaller ones as rows with a
// picture; pictures for everyone). The walk at phone size checked the screen:
// 40 events, 24 large, 15 small, the one with no picture its words alone.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { publishedEvents } from "@/lib/history/events";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const ROW = read("components/history/EventRow.tsx");
const THUMB = read("components/history/EventThumb.tsx");

describe("an event on the timeline's list", () => {
  it("carries its picture large when it is era-defining, small beside its words otherwise", () => {
    expect(ROW).toContain("const major = event.importance === 1;");
    expect(ROW).toMatch(/\{major \? \(\s*<EventThumb event=\{event\} frame="wide"/);
    expect(ROW).toContain('{major ? null : <EventThumb event={event} frame="square"');
    const events = publishedEvents();
    expect(events.filter((e) => e.importance === 1).length).toBeGreaterThan(0);
    expect(events.filter((e) => e.importance !== 1).length).toBeGreaterThan(0);
  });

  it("is free to every reader: nothing on the list asks about Plus", () => {
    for (const src of [ROW, THUMB]) expect(src).not.toMatch(/usePlusFeatures|PlusMark|upgrade\.open/);
  });

  it("leaves no empty frame when there is no picture or it cannot arrive", () => {
    // A picture that cannot arrive keeps its frame only with its own preview
    // blurred in it, so its row keeps its height (2026-11-12); with no preview,
    // no frame (lib/history/__tests__/rowRoom.test.ts).
    expect(THUMB).toContain("if (!picture || (gone && !picture.preview)) return null;");
    expect(THUMB).toContain('backgroundImage: `url("${picture.preview}")`');
    expect(THUMB).toContain("const broken = () => (src !== picture.src ? setJpegOnly(true) : setGone(true));");
    expect(THUMB).toContain("const picture = eventPicture(event, native);");
    expect(THUMB).toContain("<ArrivingImage");
  });
});
