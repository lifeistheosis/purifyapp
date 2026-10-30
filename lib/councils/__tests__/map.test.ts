import { describe, expect, it } from "vitest";

import { COUNCILS } from "../councils";
import { COUNCIL_PLACES, councilAccount, councilMap, project } from "../map";

// The councils on a map (1.8): every council the app carries is placed, on
// the map, and each mark names its councils in the list under it.

describe("the councils' map", () => {
  it("places every council the app carries", () => {
    for (const c of COUNCILS) expect(COUNCIL_PLACES[c.slug], c.slug).toBeDefined();
    for (const slug of Object.keys(COUNCIL_PLACES)) expect(COUNCILS.some((c) => c.slug === slug), slug).toBe(true);
  });

  it("puts every mark inside the map", () => {
    const { view, places } = councilMap();
    for (const p of places) {
      expect(p.x, p.place).toBeGreaterThan(0);
      expect(p.x, p.place).toBeLessThan(view[0]);
      expect(p.y, p.place).toBeGreaterThan(0);
      expect(p.y, p.place).toBeLessThan(view[1]);
    }
  });

  it("names each council under its city once, in order of year", () => {
    const { places } = councilMap();
    const all = places.flatMap((p) => p.items.map((c) => c.href.replace("/councils/", "")));
    expect(new Set(all).size).toBe(COUNCILS.length);
    for (const p of places) {
      const years = p.items.map((c) => c.year);
      expect(years, p.place).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it("draws Constantinople north of Ephesus and Carthage west of Antioch", () => {
    expect(project(41.008, 28.978).y).toBeLessThan(project(37.941, 27.342).y);
    expect(project(36.853, 10.323).x).toBeLessThan(project(36.202, 36.16).x);
  });
});

describe("the councils as the atlas's steps", () => {
  it("walks the nineteen in order of year, each on its city's mark", () => {
    const { places, steps } = councilMap();
    expect(steps).toHaveLength(COUNCILS.length);
    const years = steps.map((s) => s.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    for (const s of steps) {
      expect(s.council).toBe(true);
      expect(places.some((p) => p.id === s.mark), s.name).toBe(true);
    }
  });

  it("threads council to council, only where the accounts say one led to the next", () => {
    const threads = councilMap().steps.flatMap((s) => s.from.map((f) => `${f}>${s.mark}`));
    // Nicaea to Constantinople, Constantinople to Ephesus, Ephesus to Chalcedon, as drawn.
    expect(threads.sort()).toEqual(["constantinople-and-chalcedon>ephesus", "ephesus>constantinople-and-chalcedon", "nicaea>constantinople-and-chalcedon"]);
  });

  it("finds each council's own account: the event that names it, where it met, over years that hold its year", () => {
    const account = (slug: string) => councilAccount(COUNCILS.find((c) => c.slug === slug)!)?.slug;
    expect(account("first-nicaea")).toBe("first-council-of-nicaea");
    expect(account("chalcedon")).toBe("council-of-chalcedon");
    // The Sixth Council sat from 680 to 681; it is dated 681.
    expect(account("third-constantinople")).toBe("third-council-of-constantinople");
    // A local council has no account of its own in History.
    expect(account("gangra")).toBeUndefined();
    // Arius named Nicaea's council, at Alexandria, years before: not its account.
    expect(account("first-nicaea")).not.toBe("arian-controversy-begins");
  });

  it("gives each step its date and place from its account, and its age", () => {
    const steps = councilMap().steps;
    expect(steps.find((s) => s.href === "/councils/first-nicaea")).toMatchObject({ date: "Summer 325", where: "Nicaea in Bithynia", era: "imperial-conciliar" });
    // No account: the year says the date, and the age is the year's.
    const gangra = steps.find((s) => s.href === "/councils/gangra")!;
    expect(gangra.date).toBeUndefined();
    expect(gangra.era).toBe("imperial-conciliar");
  });
});
