import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { councilAccount } from "@/lib/councils/map";

import { publishedEvents } from "../events";
import { EVENT_PLACES, historyMap } from "../map";

// History on the map (1.8): every published event placed, on the map or
// listed beyond it, each named once, and a council's own account not listed
// beside the council.

describe("history on the map", () => {
  it("places every published event, and only events the timeline has", () => {
    const slugs = publishedEvents().map((e) => e.slug);
    for (const slug of slugs) expect(EVENT_PLACES[slug], slug).toBeDefined();
    for (const slug of Object.keys(EVENT_PLACES)) expect(slugs, slug).toContain(slug);
  });

  it("puts every mark inside the map", () => {
    const { view, places } = historyMap();
    for (const p of places) {
      expect(p.x, p.place).toBeGreaterThan(0);
      expect(p.x, p.place).toBeLessThan(view[0]);
      expect(p.y, p.place).toBeGreaterThan(0);
      expect(p.y, p.place).toBeLessThan(view[1]);
    }
  });

  it("lists every council once, and an event once unless it is a council's own account", () => {
    const { places, beyond } = historyMap();
    const hrefs = [...places.flatMap((p) => p.items.map((i) => i.href)), ...beyond.map((i) => i.href)];
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const c of COUNCILS) expect(hrefs, c.slug).toContain(`/councils/${c.slug}`);
    // The seven Ecumenical Councils' accounts are the councils on this map.
    for (const slug of ["first-council-of-nicaea", "council-of-chalcedon", "second-council-of-nicaea"]) {
      expect(hrefs, slug).not.toContain(`/history/${slug}`);
    }
    // An event that names a council but happened elsewhere stays.
    expect(hrefs).toContain("/history/arian-controversy-begins");
    expect(hrefs).toContain("/history/non-chalcedonian-estrangement");
  });

  it("names the Sixth Council once, though its account starts the year before it is dated", () => {
    // r3-10's designer found it twice (the event 680, the council 681): the
    // fold asked for the same year, and the council sat from 680 to 681.
    const { places, steps } = historyMap();
    const hrefs = places.flatMap((p) => p.items.map((i) => i.href));
    expect(hrefs).toContain("/councils/third-constantinople");
    expect(hrefs).not.toContain("/history/third-council-of-constantinople");
    const sixth = steps.filter((s) => /third-constantinople|third-council-of-constantinople/.test(s.href));
    expect(sixth).toHaveLength(1);
    // The council stands for its account, with the account's own dates.
    expect(sixth[0]).toMatchObject({ year: 681, date: "680–681", council: true });
  });

  it("keeps each place's items in order of year", () => {
    for (const p of historyMap().places) {
      const years = p.items.map((i) => i.year);
      expect(years, p.place).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it("draws places too near to tell apart as one mark with both names", () => {
    const places = historyMap().places;
    const named = (place: string) => places.find((p) => p.place === place);
    expect(places.map((p) => p.place)).not.toContain("Nicaea");
    // The map carries the shorter name: the one with more to it, a council's city on a tie.
    expect(named("Nicomedia and Nicaea")?.label).toBe("Nicaea");
    expect(named("Smyrna and Ephesus")?.label).toBe("Ephesus");
  });

  it("walks every event and council in order of time, each once, as the atlas's wheel", () => {
    const { places, beyond, steps } = historyMap();
    const listed = [...places.flatMap((p) => p.items.map((i) => i.href)), ...beyond.map((i) => i.href)];
    expect(steps.map((s) => s.href).sort()).toEqual([...listed].sort());
    const years = steps.map((s) => s.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    // Each on its own mark, or beyond the map.
    const marks = new Set(places.map((p) => p.id));
    for (const s of steps) {
      if (s.mark) expect(marks.has(s.mark), s.name).toBe(true);
      else expect(beyond.map((b) => b.href), s.name).toContain(s.href);
    }
    expect(steps.filter((s) => !s.mark).map((s) => s.year)).toEqual([1794, 1970]);
  });

  it("draws threads only from the app's own What led here", () => {
    const { places, steps } = historyMap();
    const byHref = new Map(publishedEvents().map((e) => [`/history/${e.slug}`, e]));
    const threads = steps.flatMap((s) => s.from.map((f) => `${f}>${s.mark}`));
    // As drawn: Jerusalem to Antioch to Rome, Milan and Alexandria to
    // Nicaea, Great Moravia to Kyiv, Constantinople and Kyiv to Moscow.
    for (const t of [
      "jerusalem>antioch",
      "antioch>rome",
      "milan>nicomedia-and-nicaea",
      "alexandria>nicomedia-and-nicaea",
      "great-moravia>kyiv",
      "constantinople-and-chalcedon>moscow",
      "kyiv>moscow",
    ]) {
      expect(threads, t).toContain(t);
    }
    // Lyons, Carthage and the local councils have no "What led here": no thread reaches them.
    for (const s of steps) {
      if (s.mark === "lyons" || s.mark === "carthage" || (s.council && !/first-|second-|ephesus|chalcedon/.test(s.href))) {
        expect(s.from, s.name).toEqual([]);
      }
      // Never a thread from the place itself, never from a mark not on the map.
      expect(s.from, s.name).not.toContain(s.mark);
      for (const f of s.from) expect(places.some((p) => p.id === f), f).toBe(true);
    }
    // Exactly the places of what its account says led to it: each event, or
    // the council that stands for a council's own account.
    const standsFor = new Map<string, string>();
    for (const s of steps) if (s.href.startsWith("/history/")) standsFor.set(s.href.slice(9), s.href);
    for (const c of COUNCILS) {
      const account = councilAccount(c);
      if (account) standsFor.set(account.slug, `/councils/${c.slug}`);
    }
    const markOf = new Map(steps.map((s) => [s.href, s.mark]));
    for (const s of steps) {
      const account = s.href.startsWith("/history/")
        ? byHref.get(s.href)
        : councilAccount(COUNCILS.find((c) => `/councils/${c.slug}` === s.href)!);
      const led = new Set(
        (account?.rel?.precededBy ?? [])
          .map((slug) => markOf.get(standsFor.get(slug) ?? "") ?? null)
          .filter((m): m is string => m !== null && m !== s.mark),
      );
      expect(new Set(s.from), s.name).toEqual(led);
    }
  });

  it("orders a year by what led to what, and names a shared mark by what is lit there", () => {
    const { steps } = historyMap();
    const at = (href: string) => steps.findIndex((s) => s.href === href);
    // Ukraine's autocephaly led to the schism of the same year.
    expect(at("/history/ukrainian-autocephaly")).toBeLessThan(at("/history/moscow-constantinople-schism-2018"));
    expect(at("/councils/chalcedon")).toBeLessThan(at("/history/non-chalcedonian-estrangement"));
    // Nicomedia until Nicaea's council, Smyrna until Ephesus's; the mark's own name otherwise.
    expect(steps.find((s) => s.href === "/history/great-persecution")?.at).toBe("Nicomedia");
    expect(steps.find((s) => s.href === "/history/martyrdom-of-polycarp")?.at).toBe("Smyrna");
    expect(steps.find((s) => s.href === "/councils/first-nicaea")?.at).toBeUndefined();
    // A short title that is only a year says nothing beside its year.
    expect(steps.find((s) => s.href === "/history/great-schism-1054")?.name).toBe("The Excommunications of 1054");
    expect(steps.find((s) => s.href === "/councils/first-nicaea")).toMatchObject({ date: "Summer 325", where: "Nicaea in Bithynia", era: "imperial-conciliar" });
  });

  it("lists Alaska and America under the map, and has Rus' on it", () => {
    const { places, beyond } = historyMap();
    expect(beyond.map((i) => i.href)).toEqual(["/history/alaska-mission", "/history/oca-autocephaly"]);
    const kyiv = places.find((p) => p.place === "Kyiv");
    const moscow = places.find((p) => p.place === "Moscow");
    expect(kyiv?.items.map((i) => i.year)).toEqual([988, 2018]);
    expect(moscow?.items.map((i) => i.year)).toEqual([1589, 1917, 2018]);
    // North is up: Moscow above Kyiv above Constantinople.
    const city = places.find((p) => p.place.startsWith("Constantinople"));
    expect(moscow!.y).toBeLessThan(kyiv!.y);
    expect(kyiv!.y).toBeLessThan(city!.y);
  });
});
