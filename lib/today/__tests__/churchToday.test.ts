import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The Church today as Today draws it (1.8, the owner's pick B of round 12,
// "Bands", and since round 3 r3-21 his pick A, "The face beside the words"):
// the saint with his words whole beside his face, the fast, and the readings
// as one card, the saints' readings folded into one line under the day's and
// Read all and Listen at its foot; the Desert Fathers' saying as a band of the
// same kind. Drawn on the sheet's four real days of the app's own calendar:
// Friday 13 November 2026, St John Chrysostom; Saturday 31 October, three
// readings for the saints and Abba Isaac's saying; Wednesday 28 October, St
// Antony's saying; Thursday 29 October, Abba Moses' (Monday 2 November was
// his day until November's saints had their pages, 1.9: the saying stands
// only on a day whose saint has none). And Sunday 25 October, no
// fast, and Saturday 21 November, a great feast. Only the reader's day, the
// Nativity path's line and the reader's fasting setting are set here.

const live = vi.hoisted(() => ({
  today: null as Date | null,
  nativity: null as { kind: "invite" } | { kind: "day"; n: number; of: number } | null,
  fasting: "calendar" as string,
}));
vi.mock("@/lib/calendar/useToday", () => ({ useToday: () => live.today }));
vi.mock("@/lib/reading/useNativityRow", () => ({ useNativityRow: () => live.nativity }));
vi.mock("@/lib/onboarding/useSpace", () => ({ useSpace: () => ({ fasting: live.fasting }) }));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ChurchTodayRail, SaintsFold } from "@/components/today/ChurchTodayRail";
import { SpeakerBand } from "@/components/today/SpeakerBand";
import { dayReadings, fastingStatus, readingsOptionsFor } from "@/lib/calendar/orthodox";
import { getMessages } from "@/lib/i18n";
import { sectionMedia } from "@/lib/media/sections";
import { dayWalk, hrefOf } from "@/lib/readings/flow";
import { sayingForDay } from "@/lib/today/saying";

import { FAST_META } from "@/components/calendar/fastMeta";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";

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
/** One element's markup, from its opening tag to its own closing tag. */
const element = (html: string, marker: string, tag: string) => {
  const open = html.lastIndexOf(`<${tag}`, html.indexOf(marker));
  let depth = 0;
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
  re.lastIndex = open;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index + m[0].length);
  }
  return html.slice(open);
};
const provide = (node: React.ReactElement) => renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, node));

function draw(day: Date, { nativity = null, fasting = "calendar" }: { nativity?: typeof live.nativity; fasting?: string } = {}): string {
  live.today = day;
  live.nativity = nativity;
  live.fasting = fasting;
  return provide(createElement(ChurchTodayRail));
}

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const NOV_13 = day("2026-11-13");
const OCT_31 = day("2026-10-31");
const OCT_28 = day("2026-10-28");
const OCT_29 = day("2026-10-29");
const OCT_25 = day("2026-10-25");
const NOV_21 = day("2026-11-21");

const readAll = (n: number) => fill(en["today.readings.readAll.other"], { count: String(n) });
const more = (n: number) => `${en["bible.readForCommemoration"]} · ${fill(n === 1 ? en["today.readings.more.one"] : en["today.readings.more.other"], { count: String(n) })}`;

describe("The Church today, on St John Chrysostom's day", () => {
  const out = draw(NOV_13);
  const text = words(out);
  const saint = element(out, 'data-today-band="saint"', "article");

  it("stands his words whole beside his cover portrait, on the side he looks from", () => {
    // He looks left, so he stands on the right and looks into his words.
    expect(saint).toMatch(/^<article data-today-band="saint" data-tour="quote-picture" data-face="right"/);
    expect(words(saint)).toContain("St. John Chrysostom");
    expect(words(saint)).toContain("“Let no one fear death, for the Saviour's death hath set us free.”");
    // The words say their language and direction together (build 90 note 4).
    expect(saint).toContain('lang="en" dir="ltr" data-band-words=""');
    // His cover portrait, the face, from the website's covers (the web's own address here), AVIF first.
    expect(saint).toContain('src="/covers/authors/john-chrysostom.v1.jpg"');
    expect(saint).toContain('srcSet="/covers/authors/john-chrysostom.v1.avif"');
    expect(saint).toContain("today-face-right");
    expect(saint).toContain("today-face-foot");
    // The sheet's band: at least 216 px with a face.
    expect(saint).toContain('style="min-height:216px"');
  });

  it("keeps his portrait unseen until it has loaded and been decoded, and fades it in only on the motion switch", () => {
    const img = /<img [^>]*src="\/covers\/authors\/john-chrysostom\.v1\.jpg"[^>]*>/.exec(saint)?.[0] ?? "";
    expect(img).toContain("opacity-0");
    expect(img).not.toContain("opacity-100");
    expect(img).not.toContain("data-face-shown");
    expect(img).toContain("motion-safe:transition-opacity");
    expect(img).not.toMatch(/(^|\s)transition-opacity/);
  });

  it("opens his words where they stand from the source line, the picture from the share mark, and his page from the band", () => {
    expect(saint).toMatch(/<a data-cite="father"[^>]*href="\/saints\/john-chrysostom\/paschal-homily#p-1-4"/);
    // The line as the sheet drew it: the homily, not the translator's note.
    expect(words(saint)).toContain("St. John Chrysostom , The Paschal Homily");
    expect(saint).not.toContain("Hapgood");
    expect(saint).toMatch(/<button(?=[^>]*aria-label="Share as a picture")(?=[^>]*aria-haspopup="dialog")(?=[^>]*data-saint-share="")/);
    expect(saint).toMatch(/<a lang="en" dir="ltr" class="today-band-link[^"]*" href="\/saints\/john-chrysostom">St\. John Chrysostom<\/a>/);
    // His window does not open from Today any more: its two actions are on the band.
    expect(out).not.toContain("data-saint-words");
    expect(out).not.toMatch(/<button[^>]*data-today-band/);
  });

  it("says the Friday fast in words, with the calendar's mark: its name, its rule and what it keeps from, never pills (1.9)", () => {
    const kind = fastingStatus(NOV_13, "new").kind;
    const band = element(out, 'data-today-band="fast"', "a");
    const bandText = words(band);
    expect(bandText).toContain(en["calendar.fast.fridayFast.label"]);
    expect(bandText).toContain(en["calendar.fast.fridayFast.rule"]);
    expect(bandText).toContain(en[fastNotAllowedKey(kind)!]);
    // The calendar's own mark, in its tone, beside the name (the Fast's screen's look).
    expect(band).toContain(`style="color:rgb(${FAST_META[kind].rgb})"`);
    expect(out).not.toContain("data-fast-mark");
  });

  it("makes the readings one card: the day's two over the manuscript, his two folded into one line, Read all and Listen", () => {
    const band = element(out, 'data-today-band="readings"', "section");
    expect(band).toContain(`src="${sectionMedia("bible")!.src}"`);
    const bandText = words(band);
    expect(bandText).toContain(en["today.readingsEyebrow"]);
    const at = (s: string) => bandText.indexOf(s);
    expect(at("1 Thessalonians 5:9-13, 24-28")).toBeGreaterThan(-1);
    expect(at("Luke 13:31-35")).toBeGreaterThan(at("1 Thessalonians"));
    expect(band).toContain('href="/bible/luke/13#v31"');
    // His readings, folded: the line, then the two, then the buttons.
    expect(at(more(2))).toBeGreaterThan(at("Luke 13:31-35"));
    expect(at("Hebrews 7:26-8:2")).toBeGreaterThan(at(more(2)));
    expect(at("John 10:9-16")).toBeGreaterThan(at("Hebrews 7:26-8:2"));
    expect(at(readAll(4))).toBeGreaterThan(at("John 10:9-16"));
    expect(at(en["readAloud.listen"])).toBeGreaterThan(at(readAll(4)));
    expect(band).toContain('href="/bible/hebrews/7#v26"');
    expect(band).toContain('href="/bible/john/10#v9"');
    // Read all walks them from the first.
    expect(band).toMatch(/<a data-read-all=""[^>]*href="\/bible\/1-thessalonians\/5#v9"/);
    expect(band).toMatch(/<button type="button" data-listen=""/);
  });

  it("has no rows of its own any more: no Read them in one go, no Listen row, no count to Pascha", () => {
    expect(text).not.toContain(en["readingsFlow.startValue"]);
    expect(text).not.toContain(en["readingsListen.value"]);
    // The count went up to the date line ("The Paschal Homily" is his words' work, not the count).
    expect(text).not.toContain(fill(en["today.untilPascha"], { year: "2027" }));
    expect(text).not.toContain(fill(en["today.paschaDays.other"], { count: "170" }));
    expect(text).not.toMatch(/\bPascha\b/);
    expect(text).not.toContain(`${en["bible.kindEpistle"]} · ${en["bible.readForCommemoration"]}`);
    expect(out).not.toContain("<ul class=\"overflow-hidden rounded");
  });

  it("says the kind of each reading on the band to a screen reader", () => {
    const band = element(out, 'data-today-band="readings"', "section");
    expect(band).toMatch(new RegExp(`class="sr-only">${en["bible.kindGospel"]}</span>`));
    expect(band).toMatch(new RegExp(`class="sr-only">${en["bible.kindEpistle"]}</span>`));
  });
});

describe("the saints' readings, folded", () => {
  const out = draw(NOV_13);
  const button = /<button[^>]*data-saints-fold=""[^>]*>/.exec(out)?.[0] ?? "";
  const id = /aria-controls="([^"]+)"/.exec(button)?.[1] ?? "";

  it("are shut at first, and out of reach while shut", () => {
    expect(button).toContain('aria-expanded="false"');
    expect(id).not.toBe("");
    const body = element(out, `id="${id}"`, "div");
    expect(body).toMatch(/^<div id="[^"]+" inert=""/);
    expect(body).toContain("grid-rows-[0fr]");
    expect(body).toContain("Hebrews");
  });

  it("open in place, the rows rising a few pixels on the house curve, and at once with motion off", () => {
    const fold = (open: boolean) =>
      provide(
        createElement(
          SaintsFold,
          { open, onToggle: () => {}, count: 2 } as Parameters<typeof SaintsFold>[0],
          createElement("li", null, "Hebrews 7:26-8:2"),
        ),
      );
    const open = fold(true);
    const shut = fold(false);
    expect(open).toContain('aria-expanded="true"');
    expect(open).not.toContain("inert");
    expect(open).toContain("grid-rows-[1fr]");
    expect(open).toContain("translate-y-0 opacity-100");
    expect(open).toContain("rotate-180");
    expect(shut).toContain("grid-rows-[0fr]");
    expect(shut).toContain("translate-y-1 opacity-0");
    expect(shut).not.toContain("rotate-180");
    // About 240 ms on the house ease, each part with its escape for the app's motion switch.
    for (const list of ["transition-[grid-template-rows]", "transition-[opacity,translate]", "transition-transform"]) {
      expect(open).toMatch(new RegExp(`${list.replace(/[[\]]/g, "\\$&")} duration-\\[240ms\\] ease-house motion-reduce:transition-none`));
    }
    expect(words(open)).toContain(more(2));
  });
});

describe("Read all, and Listen", () => {
  const walkOf = (d: Date) => {
    const a = dayReadings(d, readingsOptionsFor("new"));
    return dayWalk({ readings: a.readings, ordinaryReadings: a.ordinary, commemorationReadings: a.commemoration });
  };

  it("walk every reading of the day in the order the card lists them, as Read them in one go did", () => {
    expect(walkOf(OCT_31).map((i) => i.label)).toEqual([
      "2 Corinthians 5:1-10",
      "Luke 8:16-21",
      "Hebrews 13:7-16",
      "Luke 12:32-40",
      "John 10:9-16",
    ]);
    const out = draw(OCT_31);
    const band = element(out, 'data-today-band="readings"', "section");
    expect(words(band)).toContain(readAll(5));
    expect(band).toContain(`href="${hrefOf(walkOf(OCT_31)[0])}"`);
    expect(words(band)).toContain(more(3));
    const at = (s: string) => words(band).indexOf(s);
    expect(at("Luke 12:32-40")).toBeGreaterThan(at("Hebrews 13:7-16"));
    expect(at("John 10:9-16")).toBeGreaterThan(at("Luke 12:32-40"));
  });

  it("count one reading for a saint as one more", () => {
    const band = element(draw(OCT_28), 'data-today-band="readings"', "section");
    expect(words(band)).toContain(more(1));
    expect(words(band)).toContain(readAll(3));
  });

  it("on a great feast, keep the day's own pair under For the day in the card, unfolded, and walk the feast's first", () => {
    expect(walkOf(NOV_21).map((i) => i.label)).toEqual(["Hebrews 9:1-7", "Luke 10:38-42; 11:27-28", "Galatians 1:3-10", "Luke 9:57-62"]);
    const out = draw(NOV_21);
    const band = element(out, 'data-today-band="readings"', "section");
    const bandText = words(band);
    const order = ["Hebrews 9:1-7", en["bible.readForDay"], "Galatians 1:3-10", "Luke 9:57-62", readAll(4)].map((s) => bandText.indexOf(s));
    expect(order.every((at, i) => at > -1 && (i === 0 || at > order[i - 1])), bandText).toBe(true);
    expect(out).not.toContain("data-saints-fold");
  });
});

describe("the Desert Fathers' saying, as a band of its own", () => {
  it("stands St Antony beside his words, on the left, since he looks right", () => {
    const band = element(draw(OCT_28), "data-today-saying", "article");
    expect(band).toMatch(/^<article data-today-saying="" data-tour="quote-picture" data-face="left"/);
    expect(band).toContain('src="/covers/authors/anthony-the-great.v1.jpg"');
    expect(band).toContain("today-face-left");
    const said = words(band);
    expect(said).toContain(en["today.sayingEyebrow"]);
    expect(said).toContain("Wherefore fear them not, but rather ever breathe Christ, and trust Him. Live as though dying daily.");
    expect(said).toContain("St. Antony the Great");
    expect(band).toMatch(/<a data-cite="father"[^>]*href="\/saints\/anthony-the-great\/life-of-antony#p-2-93"/);
    expect(band).toMatch(/<button(?=[^>]*data-saying-share="")(?=[^>]*aria-haspopup="dialog")/);
    // On his side the source line keeps clear of the share mark at the corner.
    // The source line says the reader's language and direction on its own link (build 90 note 4).
    expect(band).toMatch(/data-cite="father" lang="[^"]+" dir="(?:ltr|rtl)" class="[^"]*\bpr-8\b/);
  });

  it("stands Abba Moses and Abba Isaac beside their words with the owner's picks of sheet r3-22, the icons the app carries", () => {
    for (const [d, who, file] of [
      [OCT_29, "Abba Moses", "moses-the-black.v2.jpg"],
      [OCT_31, "Abba Isaac", "fathers-of-sinai.jpg"],
    ] as const) {
      const band = element(draw(d), "data-today-saying", "article");
      // Both face us, so each stands at the band's end.
      expect(band, who).toMatch(/^<article data-today-saying="" data-tour="quote-picture" data-face="right"/);
      expect(words(band), who).toContain(who);
      expect(band, who).toContain(`src="/saints/icons/${file}"`);
      // Carried, not streamed: no AVIF is asked for.
      expect(band, who).not.toContain('type="image/avif"');
      expect(band, who).not.toContain("data-band-cross");
    }
  });

  it("gives a speaker with no face the app may show the lit cross where he would stand, never a stand-in", () => {
    // Abba Isaac's saying as it would stand were there no picture for the Fathers.
    const isaac = sayingForDay(OCT_31)!;
    expect(isaac.attribution).toBe("Abba Isaac");
    const band = provide(
      createElement(SpeakerBand, {
        "data-today-saying": "",
        eyebrow: en["today.sayingEyebrow"],
        words: isaac.text,
        who: isaac.attribution,
        cite: isaac.shown ?? null,
        face: null,
        onShare: () => {},
        shareMark: "data-saying-share",
      }),
    );
    expect(band).toMatch(/^<article data-today-saying="" data-face="none"/);
    expect(band).not.toContain("<img");
    expect(band).toMatch(/<span aria-hidden="true" data-band-cross="" class="verse-cross-lit/);
    // The share mark goes up to the corner the face would have held.
    expect(band).toMatch(/<button[^>]*data-saying-share=""[^>]*class="[^"]*end-2\.5 top-2\.5/);
    expect(band).not.toContain("min-height");
  });

  it("is under the bands only on a day whose saint has no page", () => {
    expect(draw(NOV_13)).not.toContain("data-today-saying");
  });
});

describe("the Nativity Fast's path", () => {
  it("stands at the foot of the fast it belongs to, under a hairline, as its own link", () => {
    const out = draw(NOV_13, { nativity: { kind: "invite" } });
    const fast = element(out, 'data-today-band="fast"', "div");
    expect(fast).toContain('href="/fasting"');
    expect(fast).toMatch(/<a data-nativity-path="" [^>]*href="\/reading\/paths\/nativity">/);
    expect(words(fast)).toContain(en["today.nativity.label"]);
    expect(words(fast)).toContain(en["today.nativity.invite"]);
    expect(fast).toContain("border-t border-paper/8");
    expect(words(fast).indexOf(en["today.nativity.invite"])).toBeGreaterThan(words(fast).indexOf(en["calendar.fast.fridayFast.label"]));
  });

  it("names the reader's day on the path, and opens it", () => {
    const fast = element(draw(NOV_13, { nativity: { kind: "day", n: 3, of: 40 } }), 'data-today-band="fast"', "div");
    expect(fast).toContain('href="/reading/paths/nativity#day-3"');
    expect(words(fast)).toContain(fill(en["today.nativity.day"], { n: "3", total: "40" }));
  });

  it("is still offered to a reader who hides the fast, alone in its band", () => {
    const fast = element(draw(NOV_13, { nativity: { kind: "invite" }, fasting: "hidden" }), 'data-today-band="fast"', "div");
    expect(fast).not.toContain('href="/fasting"');
    expect(fast).not.toContain("border-t");
    expect(words(fast)).toContain(en["today.nativity.invite"]);
  });

  it("draws the fast as one row in its tray when there is no path to offer (1.9)", () => {
    expect(draw(NOV_13)).toMatch(/<a data-today-band="fast" class="theology-tray tap-press flex/);
  });
});

describe("The Church today, on a day with no fast", () => {
  const out = draw(OCT_25);
  const text = words(out);

  it("says the rule in words and draws no marks", () => {
    expect(fastingStatus(OCT_25, "new").kind).toBe("normal");
    expect(text).toContain(en["calendar.fast.noFast.label"]);
    expect(text).toContain(en["calendar.fast.noFast.rule"]);
    expect(out).not.toContain("data-fast-mark");
  });

  it("still has its three bands, and the count to Pascha is not among them", () => {
    for (const band of ["saint", "fast", "readings"]) expect(out).toContain(`data-today-band="${band}"`);
    expect(text).not.toMatch(/\bPascha\b/);
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

// Found by checkMock with pixels on the round 1 export (1.9, Updates 29): in
// Arabic the saint's band put his English line where its own direction put
// it, at the left, onto his picture: "Mother of God" at 2.58 to 4.17:1 on the
// seven palettes, Today in the Nativity Fast. The English stands at the
// reader's start, as Heresies' names do; on Today by its own run's end
// (rtl:text-end on a left-to-right run), since Today names no side.
describe("the saint's band in a right-to-left language", () => {
  it("keeps the saint's English name and line at the reader's start, off his picture", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(`${process.cwd()}/components/today/ChurchTodayRail.tsx`, "utf8");
    const at = src.indexOf("function SaintBand(");
    const band = src.slice(at, src.indexOf("const look =", at));
    expect(band).toContain('"mt-0.5 block font-heading text-lede font-bold leading-tight text-paper rtl:text-end"');
    expect(band).toMatch(/<span lang="en" dir="ltr" className="[^"]*text-paper\/55 rtl:text-end">\s*\{saint\.line\.plain\}/);
    // By the run's own end, never a side: Today sets no words left or right
    // (todayMirror.test.ts; the whole suite found rtl:text-right, Updates 33).
    expect(band).not.toMatch(/\btext-(?:left|right)\b/);
  });
});

// Seen on the same export: in Arabic the Nativity star's line read "St. Hymns on
// the Nativity · Ephraim the Syrian", the byline's own English run set left of
// the title's. The title and its byline are one English run.
describe("the Nativity star's reading in a right-to-left language", () => {
  it("keeps the work's name and its Father's in one English run, in their order", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(`${process.cwd()}/components/today/NativityStarCard.tsx`, "utf8");
    expect(src).toMatch(/<span lang="en" dir="ltr">\s*<b className="font-semibold text-paper">\{reading\.title\}<\/b>\s*\{byline\}\s*<\/span>/);
    expect(src).not.toContain('<span lang="en" dir="ltr">{byline}</span>');
  });
});
