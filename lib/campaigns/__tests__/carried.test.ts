import { describe, expect, it } from "vitest";

import {
  CARRIED_CAP,
  answered,
  carriedFor,
  carriedNow,
  carriedOne,
  carry,
  carryForOf,
  cleanCarried,
  expireCarried,
  idsToSettle,
  mergeCarried,
  parseCarried,
  recarry,
  settleCarried,
  takeOut,
  toAsk,
  untilFor,
  type CarriedCampaign,
  type CarryPick,
} from "@/lib/campaigns/carried";

/**
 * The campaigns a reader carries in their own prayers, kept on the device.
 *
 * What would go wrong if these broke: a name that stays in a reader's
 * prayers after its campaign has ended, or leaves a day early; a campaign
 * the reader took out coming back from another device; a campaign that was
 * taken down still being prayed; "Keep this name?" asked twice, or asked
 * about one the reader took out themselves.
 */

const NICHOLAS: CarryPick = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Nicholas",
  title: "Forty days for Nicholas",
  forWhom: "departed",
  prayer: null,
  lastDay: "2026-12-19",
};
const MARIA: CarryPick = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Maria",
  title: "For Maria's exam",
  forWhom: "living",
  prayer: { rule: "protection", id: "psalm-90" },
  lastDay: "2026-11-16",
};
const TODAY = "2026-11-10";
const AT = new Date("2026-11-10T08:00:00Z");

const one = (list: CarriedCampaign[], id: string) => list.find((c) => c.id === id)!;

describe("carrying a campaign", () => {
  it("keeps what its page showed, in the prayers chosen, until its last day", () => {
    const list = carry([], NICHOLAS, ["evening", "morning"], "2026-12-19", TODAY, AT);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: NICHOLAS.id,
      name: "Nicholas",
      title: "Forty days for Nicholas",
      forWhom: "departed",
      prayer: null,
      // In the order the app offers them, whatever order they were ticked in.
      places: ["morning", "evening"],
      lastDay: "2026-12-19",
      until: "2026-12-19",
      leftAt: null,
      left: null,
      asked: false,
    });
  });

  it("is carried for less when the reader chooses: a week, or today only", () => {
    expect(untilFor("whole", "2026-12-19", TODAY)).toBe("2026-12-19");
    expect(untilFor("week", "2026-12-19", TODAY)).toBe("2026-11-16");
    expect(untilFor("today", "2026-12-19", TODAY)).toBe(TODAY);
    // Never past the campaign's own last day.
    expect(untilFor("week", "2026-11-12", TODAY)).toBe("2026-11-12");
    const list = carry([], NICHOLAS, ["evening"], untilFor("week", NICHOLAS.lastDay, TODAY), TODAY, AT);
    expect(list[0].until).toBe("2026-11-16");
    expect(carryForOf(list[0], TODAY)).toBe("week");
    expect(carryForOf({ until: "2026-12-19", lastDay: "2026-12-19" }, TODAY)).toBe("whole");
    expect(carryForOf({ until: TODAY, lastDay: "2026-12-19" }, TODAY)).toBe("today");
  });

  it("carries nothing with no prayer to wait in, a broken id, or a campaign already over", () => {
    expect(carry([], NICHOLAS, [], NICHOLAS.lastDay, TODAY, AT)).toEqual([]);
    expect(carry([], { ...NICHOLAS, id: "nicholas" }, ["evening"], NICHOLAS.lastDay, TODAY, AT)).toEqual([]);
    expect(carry([], { ...NICHOLAS, lastDay: "2026-11-09" }, ["evening"], "2026-11-09", TODAY, AT)).toEqual([]);
  });

  it("keeps only a prayer the book is known to hold", () => {
    expect(carry([], MARIA, ["morning"], MARIA.lastDay, TODAY, AT)[0].prayer).toEqual({ rule: "protection", id: "psalm-90" });
    expect(carry([], { ...MARIA, prayer: { rule: "ours", id: "for-the-sick" } }, ["morning"], MARIA.lastDay, TODAY, AT)[0].prayer).toBeNull();
  });

  it("is carried once, however often it is added", () => {
    let list = carry([], NICHOLAS, ["evening"], NICHOLAS.lastDay, TODAY, AT);
    list = carry(list, NICHOLAS, ["morning"], NICHOLAS.lastDay, TODAY, new Date("2026-11-10T09:00:00Z"));
    expect(list).toHaveLength(1);
    expect(list[0].places).toEqual(["morning"]);
  });

  it("moves to other prayers or another day without leaving", () => {
    const list = carry([], NICHOLAS, ["evening"], NICHOLAS.lastDay, TODAY, AT);
    const moved = recarry(list, NICHOLAS.id, ["morning", "mine"], "2026-11-16", new Date("2026-11-11T08:00:00Z"));
    expect(moved[0]).toMatchObject({ places: ["morning", "mine"], until: "2026-11-16", leftAt: null });
    // A day past the campaign's own is the campaign's own.
    expect(recarry(list, NICHOLAS.id, ["evening"], "2027-01-01")[0].until).toBe("2026-12-19");
    // No prayer chosen: nothing changes.
    expect(recarry(list, NICHOLAS.id, [], "2026-11-16")).toEqual(list);
  });
});

describe("where it is prayed", () => {
  const list = carry(carry([], NICHOLAS, ["evening", "mine"], NICHOLAS.lastDay, TODAY, AT), MARIA, ["morning", "hours"], MARIA.lastDay, TODAY, new Date("2026-11-10T08:05:00Z"));

  it("stands in the prayers chosen for it and in no other", () => {
    expect(carriedFor(list, "evening", TODAY).map((c) => c.name)).toEqual(["Nicholas"]);
    expect(carriedFor(list, "morning", TODAY).map((c) => c.name)).toEqual(["Maria"]);
    expect(carriedFor(list, "third-hour", TODAY).map((c) => c.name)).toEqual(["Maria"]);
    expect(carriedFor(list, "mine-evening", TODAY).map((c) => c.name)).toEqual(["Nicholas"]);
    expect(carriedFor(list, "midday", TODAY)).toEqual([]);
    // A prayer that never carries names.
    expect(carriedFor(list, "before-meals", TODAY)).toEqual([]);
  });

  it("is carried on its last day and not the day after", () => {
    expect(carriedOne(list, MARIA.id, "2026-11-16")).not.toBeNull();
    expect(carriedOne(list, MARIA.id, "2026-11-17")).toBeNull();
    expect(carriedNow(list, "2026-12-19").map((c) => c.name)).toEqual(["Nicholas"]);
    expect(carriedNow(list, "2026-12-20")).toEqual([]);
  });
});

describe("how it leaves", () => {
  const start = () => carry(carry([], NICHOLAS, ["evening"], NICHOLAS.lastDay, TODAY, AT), MARIA, ["morning"], MARIA.lastDay, TODAY, AT);

  it("by itself, the day after its last day, and is then asked about once", () => {
    const list = start();
    expect(expireCarried(list, "2026-11-16")).toBe(list);
    const later = expireCarried(list, "2026-11-17", new Date("2026-11-17T06:00:00Z"));
    expect(one(later, MARIA.id)).toMatchObject({ left: "over", asked: false });
    expect(one(later, NICHOLAS.id).leftAt).toBeNull();
    expect(toAsk(later).map((c) => c.name)).toEqual(["Maria"]);
    const done = answered(later, MARIA.id);
    expect(toAsk(done)).toEqual([]);
  });

  it("at once when the reader takes it out, with nothing to ask", () => {
    const list = takeOut(start(), NICHOLAS.id, new Date("2026-11-12T08:00:00Z"));
    expect(one(list, NICHOLAS.id)).toMatchObject({ left: "out", asked: true });
    expect(carriedNow(list, "2026-11-12").map((c) => c.name)).toEqual(["Maria"]);
    expect(toAsk(list)).toEqual([]);
  });

  it("when its creator closes it early: asked about, as one that ran its course", () => {
    const list = settleCarried(start(), { [NICHOLAS.id]: "over", [MARIA.id]: "running" }, new Date("2026-11-12T08:00:00Z"));
    expect(one(list, NICHOLAS.id)).toMatchObject({ left: "ended", asked: false });
    expect(one(list, MARIA.id).leftAt).toBeNull();
    expect(toAsk(list).map((c) => c.name)).toEqual(["Nicholas"]);
  });

  it("when it is taken down: gone, and never asked about", () => {
    const list = settleCarried(start(), { [NICHOLAS.id]: "gone" }, new Date("2026-11-12T08:00:00Z"));
    expect(one(list, NICHOLAS.id)).toMatchObject({ left: "removed", asked: true });
    expect(toAsk(list)).toEqual([]);
  });

  it("changes nothing when the server says all still run, or says nothing", () => {
    const list = start();
    expect(settleCarried(list, { [NICHOLAS.id]: "running", [MARIA.id]: "running" })).toBe(list);
    expect(settleCarried(list, {})).toBe(list);
  });

  it("asks the server only about those still carried", () => {
    const list = takeOut(start(), NICHOLAS.id);
    expect(idsToSettle(list)).toEqual([MARIA.id]);
  });
});

describe("the list as kept", () => {
  it("survives being written and read", () => {
    const list = carry([], MARIA, ["morning"], MARIA.lastDay, TODAY, AT);
    expect(parseCarried(JSON.stringify(list), AT.getTime())).toEqual(list);
  });

  it("drops what is not well formed, and reads nothing from nonsense", () => {
    expect(parseCarried(null)).toEqual([]);
    expect(parseCarried("not json")).toEqual([]);
    expect(parseCarried('{"id":1}')).toEqual([]);
    const good = carry([], MARIA, ["morning"], MARIA.lastDay, TODAY, AT)[0];
    const kept = cleanCarried([good, { ...good, id: "x" }, { ...good, id: NICHOLAS.id, places: ["dinner"] }, { ...good, id: NICHOLAS.id, until: "soon" }, null, 7], AT.getTime());
    expect(kept).toEqual([good]);
  });

  it("forgets one that left long ago, and keeps one that left lately", () => {
    const list = takeOut(carry([], MARIA, ["morning"], MARIA.lastDay, TODAY, AT), MARIA.id, new Date("2026-11-11T08:00:00Z"));
    expect(cleanCarried(list, Date.parse("2026-12-01T00:00:00Z"))).toHaveLength(1);
    expect(cleanCarried(list, Date.parse("2027-01-15T00:00:00Z"))).toEqual([]);
  });

  it("holds a few names, not a second board", () => {
    let list: CarriedCampaign[] = [];
    for (let i = 0; i < CARRIED_CAP + 6; i++) {
      const id = `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, "0")}`;
      list = carry(list, { ...MARIA, id }, ["morning"], MARIA.lastDay, TODAY, new Date(AT.getTime() + i * 1000));
    }
    expect(list).toHaveLength(CARRIED_CAP);
  });
});

describe("another device, signed in", () => {
  const account = [
    { pick: NICHOLAS, places: ["evening"] as const, until: null },
    { pick: MARIA, places: ["morning"] as const, until: "2026-11-12" },
  ];

  it("brings over what the account carries and this device has never seen", () => {
    const list = mergeCarried([], account, TODAY, AT);
    expect(list.map((c) => [c.name, c.until])).toEqual([
      ["Maria", "2026-11-12"],
      ["Nicholas", "2026-12-19"],
    ]);
  });

  it("does not bring back one this device took out", () => {
    const local = takeOut(carry([], NICHOLAS, ["evening"], NICHOLAS.lastDay, TODAY, AT), NICHOLAS.id, AT);
    const list = mergeCarried(local, account, TODAY, AT);
    expect(one(list, NICHOLAS.id).left).toBe("out");
    expect(carriedNow(list, TODAY).map((c) => c.name)).toEqual(["Maria"]);
  });

  it("leaves this device's own choice of prayers alone", () => {
    const local = carry([], NICHOLAS, ["morning", "mine"], NICHOLAS.lastDay, TODAY, AT);
    const list = mergeCarried(local, [account[0]], TODAY, AT);
    expect(list).toBe(local);
  });

  it("brings nothing whose days are already over", () => {
    expect(mergeCarried([], [{ pick: MARIA, places: ["morning"], until: "2026-11-09" }], TODAY, AT)).toEqual([]);
  });
});
