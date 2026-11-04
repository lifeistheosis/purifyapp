import { describe, expect, it } from "vitest";

import { TRAIL_MAX, trailsOf } from "../liveTrail";

/** The pages a reader on the site now opened, in order (lib/admin/liveTrail.ts). Paths made up. */

const NOW = Date.parse("2026-11-04T15:12:00Z");
const v = (session_id: string, path: string | null, ts: string) => ({ session_id, path, ts });

describe("trailsOf", () => {
  it("gives each reader's pages oldest first, from views read newest first", () => {
    const t = trailsOf(
      [
        v("a", "/prayers/akathist", "2026-11-04T15:11:00Z"),
        v("b", "/bible/john/3", "2026-11-04T15:10:00Z"),
        v("a", "/saints/nicholas", "2026-11-04T15:08:00Z"),
        v("a", "/saints", "2026-11-04T15:07:00Z"),
        v("a", "/", "2026-11-04T15:06:00Z"),
      ],
      NOW,
    );
    expect(t.get("a")?.map((s) => s.path)).toEqual(["/", "/saints", "/saints/nicholas", "/prayers/akathist"]);
    expect(t.get("b")).toEqual([{ path: "/bible/john/3", at: "2026-11-04T15:10:00Z" }]);
  });

  it("makes a reload one step, keeps the last hours only, and stops at the most it shows", () => {
    const t = trailsOf(
      [
        v("a", "/today", "2026-11-04T15:11:00Z"),
        v("a", "/today", "2026-11-04T15:10:00Z"),
        v("a", "/saints", "2026-11-04T15:09:00Z"),
        v("a", "/old", "2026-11-04T06:00:00Z"),
        v("a", null, "2026-11-04T15:05:00Z"),
      ],
      NOW,
    );
    expect(t.get("a")?.map((s) => s.path)).toEqual(["/saints", "/today"]);
    const many = Array.from({ length: 30 }, (_, i) => v("c", `/p/${i}`, new Date(NOW - i * 60_000).toISOString()));
    expect(trailsOf(many, NOW).get("c")).toHaveLength(TRAIL_MAX);
    expect(trailsOf(many, NOW).get("c")?.at(-1)?.path).toBe("/p/0");
  });
});
