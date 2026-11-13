import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RETENTION_KINDS, RETENTION_LABEL } from "../kinds";
import { LOOKS, __resetLooks } from "../render";
import {
  DESIGN_YES,
  FASTS_ON,
  READERS_YES,
  RETENTION_SWITCHES,
  __resetRetention,
  __setRetention,
  anyRetentionOn,
  retentionPosition,
} from "../switches";

/**
 * Behind one switch per email that stays off until the owner says yes to its
 * design; the first send of each to him alone; readers only on his word
 * after that (the arbiter's brief of 2026-11-13, his "perfect let's build and
 * I say yes or no to the design").
 */

const YES = { on: "2026-11-20 about 14:00 UTC", words: "yes to the first-week guide's design" };

afterEach(() => {
  __resetRetention();
  __resetLooks();
});

describe("the switches as they are committed", () => {
  it("are all off: his yes to the designs recorded, word for word and dated, and no word yet for readers", () => {
    for (const kind of RETENTION_KINDS) {
      expect(RETENTION_SWITCHES[kind], kind).toBe("off");
      // "yes to all" (2026-11-13 about 20:47 UTC): the emails' round 3 page, the three emails in the kit's look.
      expect(DESIGN_YES[kind], kind).toEqual({ on: "2026-11-13 about 20:47 UTC", words: "yes to all" });
      expect(READERS_YES[kind], kind).toBeNull();
      expect(retentionPosition(kind), kind).toBe("off");
    }
    expect(anyRetentionOn()).toBe(false);
  });

  it("never stand past a step his words have not reached", () => {
    for (const kind of RETENTION_KINDS) {
      if (RETENTION_SWITCHES[kind] !== "off") expect(DESIGN_YES[kind], `${kind} is past off with no yes to its design`).not.toBeNull();
      if (RETENTION_SWITCHES[kind] === "readers") expect(READERS_YES[kind], `${kind} is at readers with no word for readers`).not.toBeNull();
    }
  });

  it("have an approved look exactly where he said yes to a design, so the stand-in is never what is sent", () => {
    for (const kind of RETENTION_KINDS) expect(Boolean(LOOKS[kind]), kind).toBe(DESIGN_YES[kind] !== null);
  });

  it("cover the Nativity Fast first", () => {
    expect(FASTS_ON[0]).toBe("nativity");
  });

  it("reach readers only once the privacy page names the list, in his words", () => {
    // "No marketing email unless you ask for it" holds while these lists are
    // off until a reader turns them on; what each reads to write itself is
    // said on the page before any reader can have it (docs/plans/retention-emails.md).
    const privacy = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", "..", "components/legal/PrivacyText.tsx"), "utf8");
    for (const kind of RETENTION_KINDS) {
      if (READERS_YES[kind]) expect(privacy, `${kind} may reach readers, and the privacy page does not name it`).toContain(RETENTION_LABEL[kind]);
    }
  });
});

describe("where a switch stands, as the sender obeys it", () => {
  it("is off without his yes to the design, whatever the constant says", () => {
    // His yes is recorded since 2026-11-13; an email without one is the case held here.
    __setRetention("first_week", { position: "readers", readers: YES, pageKnows: true, design: null });
    expect(retentionPosition("first_week")).toBe("off");
    __setRetention("first_week", { position: "owner" });
    expect(retentionPosition("first_week")).toBe("off");
    expect(anyRetentionOn()).toBe(false);
  });

  it("goes to the owner alone once the design has his yes", () => {
    __setRetention("first_week", { position: "owner", design: YES });
    expect(retentionPosition("first_week")).toBe("owner");
    expect(retentionPosition("pick_up")).toBe("off");
    expect(anyRetentionOn()).toBe(true);
  });

  it("holds at owner until he says readers, and until the unsubscribe page knows the list", () => {
    __setRetention("pick_up", { position: "readers", design: YES });
    expect(retentionPosition("pick_up")).toBe("owner");
    __setRetention("pick_up", { readers: YES });
    // The page (lib/email/lists.ts) does not name the retention lists yet.
    expect(retentionPosition("pick_up")).toBe("owner");
    __setRetention("pick_up", { pageKnows: true });
    expect(retentionPosition("pick_up")).toBe("readers");
  });
});
