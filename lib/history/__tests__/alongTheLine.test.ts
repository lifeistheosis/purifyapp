import { describe, expect, it } from "vitest";
import { alongTheLine } from "../alongTheLine";
import { eventBySlug, publishedEvents } from "../events";

describe("the events either side on the line", () => {
  const line = publishedEvents();

  it("never names again an event the page's chain already holds", () => {
    for (const meta of line) {
      const shown = new Set([...(meta.rel?.precededBy ?? []), ...(meta.rel?.resultedIn ?? [])]);
      const { prev, next } = alongTheLine(line, meta);
      if (prev) expect(shown.has(prev.slug), `${meta.slug}: Earlier is ${prev.slug}`).toBe(false);
      if (next) expect(shown.has(next.slug), `${meta.slug}: Later is ${next.slug}`).toBe(false);
    }
  });

  it("Pentecost: Paul's missions stands once, under What flowed from it", () => {
    const pentecost = eventBySlug("pentecost")!;
    const at = line.findIndex((e) => e.slug === "pentecost");
    // The case itself: the very next event on the line is one Pentecost's chain holds.
    expect(line[at + 1].slug).toBe("missions-of-apostle-paul");
    expect(pentecost.rel?.resultedIn).toContain("missions-of-apostle-paul");
    expect(alongTheLine(line, pentecost).next?.slug).not.toBe("missions-of-apostle-paul");
  });

  it("keeps a way along the line where the chain holds nothing on that side", () => {
    const first = line[0];
    const last = line[line.length - 1];
    expect(alongTheLine(line, first).prev).toBeNull();
    expect(alongTheLine(line, last).next).toBeNull();
    const middle = line.find((e, i) => i > 0 && i < line.length - 1 && !e.rel?.precededBy?.length && !e.rel?.resultedIn?.length);
    if (middle) {
      const i = line.indexOf(middle);
      expect(alongTheLine(line, middle)).toEqual({ prev: line[i - 1], next: line[i + 1] });
    }
  });
});
