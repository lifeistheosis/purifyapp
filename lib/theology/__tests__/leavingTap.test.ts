// A tap that leaves Theology's page does not change it under the finger
// (the gate's cut, Updates 37's walk: tapping the hub's next read, "The Holy
// Trinity, 7 citations", turned the hub's head from Begin to Where you left
// off in one frame, 113ms after the tap, half the screen, before the topic
// came). The read is kept at once, so the page it opens reads it, and the
// page left is told only once it has gone (Updates 38).
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PATH_EVENT, PATH_KEY, TELL_AFTER_LEAVING_MS, updatePathProgress } from "@/lib/theology/usePathProgress";

function stubWindow() {
  const kept = new Map<string, string>();
  const told: string[] = [];
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) },
    dispatchEvent: (e: Event) => void told.push(e.type),
  });
  return { kept, told };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a read opened from Theology's path", () => {
  it("is kept at once and told to the page left only once it has gone", () => {
    vi.useFakeTimers();
    const { kept, told } = stubWindow();
    updatePathProgress((p) => ({ ...p, at: "trinity" }), { tellAfter: TELL_AFTER_LEAVING_MS });
    expect(JSON.parse(kept.get(PATH_KEY) ?? "{}").at).toBe("trinity");
    expect(told).toEqual([]);
    vi.advanceTimersByTime(TELL_AFTER_LEAVING_MS);
    expect(told).toEqual([PATH_EVENT]);
  });

  it("any other change is told at once", () => {
    const { told } = stubWindow();
    updatePathProgress((p) => ({ ...p, at: "christ" }));
    expect(told).toEqual([PATH_EVENT]);
  });

  it("noteOpened, the tap on a read, tells after leaving", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/theology/PathRead.tsx"), "utf8");
    expect(src).toContain("{ tellAfter: TELL_AFTER_LEAVING_MS });");
    expect(TELL_AFTER_LEAVING_MS).toBeGreaterThanOrEqual(1000);
  });
});
