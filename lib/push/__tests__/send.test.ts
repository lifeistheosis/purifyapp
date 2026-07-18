import { describe, it, expect } from "vitest";
import { broadcastStatus, type BroadcastResult } from "@/lib/push/send";

const web = (o: Partial<BroadcastResult["web"]> = {}) => ({
  sent: 0,
  failed: 0,
  candidates: 0,
  dryRun: false,
  ...o,
});
const native = (o: Partial<BroadcastResult["native"]> = {}) => ({
  sent: 0,
  failed: 0,
  skipped: 0,
  candidates: 0,
  dryRun: false,
  ...o,
});

describe("broadcastStatus — honest logging", () => {
  it("every transport dry-ran → enqueued (nothing actually left)", () => {
    expect(
      broadcastStatus({ web: web({ dryRun: true }), native: native({ dryRun: true }) }),
    ).toBe("enqueued");
  });

  it("at least one real delivery → sent", () => {
    expect(
      broadcastStatus({ web: web({ sent: 3 }), native: native({ dryRun: true }) }),
    ).toBe("sent");
  });

  it("all real attempts failed → failed", () => {
    expect(
      broadcastStatus({ web: web({ failed: 2 }), native: native({ failed: 1 }) }),
    ).toBe("failed");
  });

  it("no candidates at all → enqueued", () => {
    expect(broadcastStatus({ web: web(), native: native() })).toBe("enqueued");
  });
});
