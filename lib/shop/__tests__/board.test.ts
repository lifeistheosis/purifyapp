import { describe, expect, it } from "vitest";

import { dropAction, LANES, laneOf } from "../board";
import { FUNNEL_STAGES } from "../funnel";

describe("the fulfillment board", () => {
  it("puts every funnel stage in exactly one lane, in order", () => {
    const laid = LANES.flatMap((l) => l.stages);
    expect(laid).toEqual(FUNNEL_STAGES);
  });

  it("knows each stage's lane", () => {
    expect(laneOf("pending")).toBe("unfulfilled");
    expect(laneOf("packaged")).toBe("processing");
    expect(laneOf("cancelled")).toBeNull();
  });

  it("opens the order for a drop into Shipped instead of moving it", () => {
    expect(dropAction("packaged", "shipped")).toEqual({ kind: "tracking" });
  });

  it("refuses Delivered for anything that was never shipped", () => {
    expect(dropAction("packaged", "delivered").kind).toBe("refuse");
    expect(dropAction("shipped", "delivered")).toEqual({ kind: "move", to: "delivered" });
  });

  it("moves forwards and backwards otherwise, and ignores a drop in place", () => {
    expect(dropAction("pending", "supplier_order_placed")).toEqual({ kind: "move", to: "supplier_order_placed" });
    expect(dropAction("shipped", "packaged")).toEqual({ kind: "move", to: "packaged" });
    expect(dropAction("delivered", "shipped")).toEqual({ kind: "move", to: "shipped" });
    expect(dropAction("pending", "pending")).toEqual({ kind: "none" });
    expect(dropAction("cancelled", "pending").kind).toBe("refuse");
  });
});
