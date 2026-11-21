import { describe, expect, it } from "vitest";

import {
  HEARTBEAT_WINDOW_MS,
  LAST_SEEN_EVERY_MS,
  MAX_SESSIONS,
  PING_ROW_EVERY_MS,
  classifyTrack,
  type Seen,
} from "../heartbeat";

/**
 * The tracker's 20 second pings were written as page views: four calls to the
 * database and a row each (2026-11-21, the Supabase project past its free
 * quota). lib/analytics/heartbeat.ts tells them from page views on the server.
 */

const TAB = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
const PING = 20_000;
const T0 = 1_795_000_000_000;

describe("a heartbeat is not a page view", () => {
  it("counts a session's first post and every new page as page views", () => {
    const recent = new Map<string, Seen>();
    expect(classifyTrack(TAB, "/", T0, recent)).toBe("pageview");
    expect(classifyTrack(TAB, "/bible/john/1", T0 + 5_000, recent)).toBe("pageview");
    expect(classifyTrack(TAB, "/", T0 + 9_000, recent)).toBe("pageview");
  });

  it("answers the pings on one page with no row, and writes last_seen about once a minute", () => {
    const recent = new Map<string, Seen>();
    expect(classifyTrack(TAB, "/bible/john/1", T0, recent)).toBe("pageview");
    const beats = [1, 2, 3, 4, 5, 6].map((n) => classifyTrack(TAB, "/bible/john/1", T0 + n * PING, recent));
    expect(beats).toEqual([
      "heartbeat-skip",
      "heartbeat-skip",
      "heartbeat-write",
      "heartbeat-skip",
      "heartbeat-skip",
      "heartbeat-write",
    ]);
  });

  it("keeps a reader inside the desk's 90 second live window, and the visit open in the Screens view", () => {
    const recent = new Map<string, Seen>();
    classifyTrack(TAB, "/saints/basil-the-great", T0, recent);
    let lastTouch = T0;
    let lastRow = T0;
    let rows = 1;
    let widestTouch = 0;
    let widestRow = 0;
    // An hour on one page: 180 pings.
    for (let n = 1; n <= 180; n += 1) {
      const at = T0 + n * PING;
      const beat = classifyTrack(TAB, "/saints/basil-the-great", at, recent);
      if (beat !== "heartbeat-skip") {
        widestTouch = Math.max(widestTouch, at - lastTouch);
        lastTouch = at;
      }
      if (beat === "pageview") {
        widestRow = Math.max(widestRow, at - lastRow);
        lastRow = at;
        rows += 1;
      }
    }
    // app/api/admin/stats/route.ts: a session is live if seen in the last 90 s.
    expect(widestTouch).toBeLessThan(90_000);
    // lib/admin/screensSummary.ts: a visit ends after 30 minutes of silence.
    expect(widestRow).toBeLessThan(30 * 60_000);
    // 181 rows before this file; now the opening and one mark each ten minutes.
    expect(rows).toBe(1 + 3_600_000 / PING_ROW_EVERY_MS);
  });

  it("counts a return to the same page after the window as a page view again", () => {
    const recent = new Map<string, Seen>();
    classifyTrack(TAB, "/prayers", T0, recent);
    expect(classifyTrack(TAB, "/prayers", T0 + HEARTBEAT_WINDOW_MS - 1, recent)).not.toBe("pageview");
    expect(classifyTrack(TAB, "/prayers", T0 + 2 * HEARTBEAT_WINDOW_MS + 5, recent)).toBe("pageview");
  });

  it("keeps each session apart", () => {
    const recent = new Map<string, Seen>();
    classifyTrack(TAB, "/", T0, recent);
    expect(classifyTrack("11111111-2222-4333-8444-555555555555", "/", T0 + PING, recent)).toBe("pageview");
    expect(classifyTrack(TAB, "/", T0 + PING, recent)).toBe("heartbeat-skip");
  });

  it("never remembers more sessions than its cap", () => {
    const recent = new Map<string, Seen>();
    for (let n = 0; n < MAX_SESSIONS + 250; n += 1) classifyTrack(`tab-${n}`, "/", T0 + n, recent);
    expect(recent.size).toBeLessThanOrEqual(MAX_SESSIONS);
    // The newest are the ones kept.
    expect(recent.has(`tab-${MAX_SESSIONS + 249}`)).toBe(true);
  });

  it("writes last_seen often enough for 20 second pings to land inside 90 seconds", () => {
    expect(LAST_SEEN_EVERY_MS + PING).toBeLessThan(90_000);
  });
});
