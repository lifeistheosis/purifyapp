import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The Church today as Today draws it (1.8, the owner's pick B of round 12,
// "Bands", with St John Chrysostom himself): the saint, the fast and the
// readings as bands, then the rest of the day as rows. Drawn on two real days
// of the app's own calendar: Friday 13 November 2026, St John Chrysostom, a
// Friday fast, the day's pair and his own; and Sunday 25 October 2026, no
// fast. Only the reader's day is set here.

const live = vi.hoisted(() => ({ today: null as Date | null }));
vi.mock("@/lib/calendar/useToday", () => ({ useToday: () => live.today }));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ChurchTodayRail } from "@/components/today/ChurchTodayRail";
import { fastingStatus } from "@/lib/calendar/orthodox";
import { getMessages } from "@/lib/i18n";
import { sectionMedia } from "@/lib/media/sections";

import { fastMarks } from "../fastMarks";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const fill = (s: string, values: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
/** The words a reader sees, out of the markup: no tags, no React's text markers, entities read. */
const words = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

function draw(day: Date): string {
  live.today = day;
  return renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(ChurchTodayRail)));
}

const NOV_13 = new Date(Date.UTC(2026, 10, 13, 12));
const OCT_25 = new Date(Date.UTC(2026, 9, 25, 12));

describe("The Church today, on St John Chrysostom's day", () => {
  const out = draw(NOV_13);
  const text = words(out);

  it("gives the saint his band: his face, his name, and his words as they open", () => {
    expect(out).toContain('data-today-band="saint"');
    expect(text).toContain("St. John Chrysostom");
    expect(text).toContain("“Let no one fear death…”");
    // His cover portrait, the face, from the website's covers (the web's own address here).
    expect(out).toContain('src="/covers/authors/john-chrysostom.v1.jpg"');
    expect(out).toContain('srcSet="/covers/authors/john-chrysostom.v1.avif"');
  });

  it("opens his window from the band, since he has words of his own", () => {
    expect(out).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*data-today-band="saint"/);
    // The window is shut until the band is tapped, and his words have no card of their own now.
    expect(out).not.toContain("data-saint-words");
    expect(text).not.toContain(en["saints.inHisOwnWords"]);
  });

  it("marks the Friday fast from the day's rule: wine and oil lit, fish and meat struck", () => {
    expect(text).toContain(en["calendar.fast.fridayFast.label"]);
    const marks = fastMarks(fastingStatus(NOV_13).kind)!;
    expect(marks.filter((m) => m.allowed).map((m) => m.food)).toEqual(["wine", "oil"]);
    for (const { food, allowed } of marks) {
      expect(out).toMatch(new RegExp(`data-fast-mark="${food}"${allowed ? ' data-allowed=""' : '(?! data-allowed)'}`));
    }
    expect(text).toContain(fill(en["today.fastMarks.allowed"], { food: en["today.fastMarks.wine"] }));
    expect(text).toContain(fill(en["today.fastMarks.notAllowed"], { food: en["today.fastMarks.fish"] }));
    expect(text).toContain(fill(en["today.fastMarks.notAllowed"], { food: en["today.fastMarks.meat"] }));
  });

  it("puts the day's readings over the manuscript, each opening its chapter, and Read", () => {
    const band = out.slice(out.indexOf('data-today-band="readings"'));
    expect(band).toContain(`src="${sectionMedia("bible")!.src}"`);
    const bandText = words(band.slice(0, band.indexOf("</section>")));
    expect(bandText).toContain(en["today.readingsEyebrow"]);
    expect(bandText.indexOf("1 Thessalonians 5:9-13, 24-28")).toBeGreaterThan(-1);
    expect(bandText.indexOf("Luke 13:31-35")).toBeGreaterThan(bandText.indexOf("1 Thessalonians"));
    expect(band).toContain('href="/bible/luke/13#v31"');
    expect(bandText).toContain(en["reading.featured.read"]);
    // The saint's own readings are not on the band.
    expect(bandText).not.toContain("Hebrews");
  });

  it("keeps the rest of the day as rows: his readings, all of them in one go, the count to Pascha", () => {
    const rows = words(out.slice(out.indexOf("</section>")));
    const at = (s: string) => rows.indexOf(s);
    expect(at(`${en["bible.kindEpistle"]} · ${en["bible.readForCommemoration"]}`)).toBeGreaterThan(-1);
    expect(at("Hebrews 7:26-8:2")).toBeGreaterThan(-1);
    expect(at("John 10:9-16")).toBeGreaterThan(at("Hebrews 7:26-8:2"));
    expect(at(en["readingsFlow.startValue"])).toBeGreaterThan(at("John 10:9-16"));
    expect(at(en["today.paschaEyebrow"])).toBeGreaterThan(at(en["readingsFlow.startValue"]));
  });

  it("says the kind of each reading on the band to a screen reader", () => {
    const band = out.slice(out.indexOf('data-today-band="readings"'));
    expect(band).toMatch(new RegExp(`class="sr-only">${en["bible.kindGospel"]}</span>`));
    expect(band).toMatch(new RegExp(`class="sr-only">${en["bible.kindEpistle"]}</span>`));
  });
});

describe("The Church today, on a day with no fast", () => {
  const out = draw(OCT_25);
  const text = words(out);

  it("says the rule in words and draws no marks", () => {
    expect(fastingStatus(OCT_25).kind).toBe("normal");
    expect(text).toContain(en["calendar.fast.noFast.label"]);
    expect(text).toContain(en["calendar.fast.noFast.rule"]);
    expect(out).not.toContain("data-fast-mark");
  });

  it("still has its three bands and the count to Pascha", () => {
    for (const band of ["saint", "fast", "readings"]) expect(out).toContain(`data-today-band="${band}"`);
    expect(text).toContain(en["today.paschaEyebrow"]);
  });
});

describe("The Church today, before the device knows the day", () => {
  it("is the bands' shape and nothing of any day", () => {
    const out = draw(null as unknown as Date);
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain("data-today-band");
    expect(out).not.toContain("data-church-today");
  });
});
