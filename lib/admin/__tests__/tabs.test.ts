import { describe, expect, it } from "vitest";
import {
  OWNER_TAB_IDS,
  isOwnerTab,
  modeOf,
  ownerPanelOf,
  resolveTab,
} from "../tabs";

// The rail's half of the owner gate. The other half is a 403 and a dynamic
// import; see lib/admin/tabs.ts for why this is the presentation layer only.

describe("resolveTab", () => {
  it("passes an operations tab through for anyone", () => {
    for (const isOwner of [true, false]) {
      expect(resolveTab("overview", isOwner)).toBe("overview");
      expect(resolveTab("orders", isOwner)).toBe("orders");
      expect(resolveTab("traffic", isOwner)).toBe("traffic");
    }
  });

  it("lets an owner reach every owner tab", () => {
    for (const id of OWNER_TAB_IDS) {
      expect(resolveTab(id, true)).toBe(id);
    }
  });

  it("sends a non-owner asking for any owner tab to Overview", () => {
    // This is the deep-link case: #tab=owner-model typed, pasted, or
    // bookmarked from a session that used to have the gate.
    for (const id of OWNER_TAB_IDS) {
      expect(resolveTab(id, false)).toBe("overview");
    }
  });

  it("is idempotent, so the hash writer cannot oscillate", () => {
    // The shell writes the RESOLVED id back to the URL. If resolving twice
    // gave a different answer, that write would feed the reader a value that
    // resolved differently again on the next pass.
    for (const id of [...OWNER_TAB_IDS, "overview", "orders"]) {
      for (const isOwner of [true, false]) {
        const once = resolveTab(id, isOwner);
        expect(resolveTab(once, isOwner)).toBe(once);
      }
    }
  });
});

describe("modeOf and isOwnerTab", () => {
  it("puts every owner id in owner mode and everything else in ops", () => {
    for (const id of OWNER_TAB_IDS) {
      expect(isOwnerTab(id)).toBe(true);
      expect(modeOf(id)).toBe("owner");
    }
    for (const id of ["overview", "orders", "shop", "eikon-box", "traffic"]) {
      expect(isOwnerTab(id)).toBe(false);
      expect(modeOf(id)).toBe("ops");
    }
  });

  it("does not treat an unknown id as an owner tab", () => {
    // Fail closed the safe way round: an id nobody recognises is ops, so a
    // typo can never open a section behind the second gate.
    expect(isOwnerTab("owner")).toBe(false);
    expect(isOwnerTab("owner-")).toBe(false);
    expect(isOwnerTab("owner-secret")).toBe(false);
    expect(modeOf("nonsense")).toBe("ops");
  });
});

describe("ownerPanelOf", () => {
  it("maps each owner tab to its panel", () => {
    expect(ownerPanelOf("owner-today")).toBe("today");
    expect(ownerPanelOf("owner-model")).toBe("model");
    expect(ownerPanelOf("owner-markets")).toBe("markets");
  });

  it("defaults to today for anything else", () => {
    expect(ownerPanelOf("overview")).toBe("today");
  });

  it("covers every id in OWNER_TAB_IDS", () => {
    // Guards the default: add a fourth owner tab and forget to extend the
    // mapping, and it would silently render "Where we are" under the new
    // label rather than failing.
    const panels = OWNER_TAB_IDS.map(ownerPanelOf);
    expect(new Set(panels).size).toBe(OWNER_TAB_IDS.length);
  });
});
