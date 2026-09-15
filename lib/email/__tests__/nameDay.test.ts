import { describe, expect, it } from "vitest";

import { feastsOn } from "@/lib/calendar/orthodox";
import { SAINTS } from "@/lib/saints/saints";

import { nameDayMatches, piecesBySaint } from "../nameDay";

describe("nameDayMatches", () => {
  it("finds the readers whose patron is one of today's saints, and nobody else", () => {
    const m = nameDayMatches(
      ["nicholas-of-myra", "john-chrysostom"],
      [
        { id: "a", patron_saint: "nicholas-of-myra" },
        { id: "b", patron_saint: "basil-the-great" },
        { id: "c", patron_saint: null },
        { id: "d", patron_saint: "john-chrysostom" },
      ],
    );
    expect([...m.entries()]).toEqual([
      ["a", "nicholas-of-myra"],
      ["d", "john-chrysostom"],
    ]);
  });
});

describe("piecesBySaint", () => {
  it("offers the first published icon of each saint, never a draft", () => {
    const pieces = piecesBySaint([
      { subject_slug: "nicholas", product: { title: "Draft icon", slug: "d", price_cents: 100, status: "draft" } },
      { subject_slug: "nicholas", product: { title: "St Nicholas, mounted", slug: "n", price_cents: 3200, status: "published" } },
      { subject_slug: "nicholas", product: { title: "Second icon", slug: "n2", price_cents: 900, status: "published" } },
      { subject_slug: "basil", product: null },
    ]);
    expect(pieces.get("nicholas")).toEqual({ title: "St Nicholas, mounted", slug: "n", priceCents: 3200 });
    expect(pieces.has("basil")).toBe(false);
  });
});

describe("the calendar the name day reads", () => {
  it("finds a registry saint on a feast the registry declares", () => {
    // Guards the one real dependency: if feastsOn ever stopped matching the
    // registry's feastDays strings, every name day would silently go quiet.
    const saint = SAINTS.find((s) => s.feastDays?.includes("November 15"));
    expect(saint, "a registry saint with a November 15 feast").toBeTruthy();
    const slugs = feastsOn(new Date("2026-11-15T12:00:00Z")).map((s) => s.slug);
    expect(slugs).toContain(saint!.slug);
  });
});
