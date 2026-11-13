import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HERITAGE_STEMS } from "@/lib/marketing/heritagePictures";
import { SAINTS } from "@/lib/saints/saints";
import { SITE_URL } from "@/lib/site";

import { esc } from "../kit";
import { KIT_ASSETS, NIGHTS_DRAWN } from "../kitLetters";
import { renderMarketing } from "../marketing";
import { saintCardOf } from "../saintCard";
import { monthlyBody, nativityFastDay, weekRange, weeklyBody } from "../templates/contentBodies";
import { KIT_DARK, KIT_NIGHT } from "../theme";
import { weekAhead } from "../weekly";

/**
 * The list emails in the design kit's look (his yes, 2026-11-13: "yes look"),
 * drawn by lib/email/kitLetters.ts from the bodies the drafts build. The
 * pieces themselves are held to the kit's builder in kit.test.ts; this holds
 * what each letter puts in them, and the rules every letter keeps.
 */

const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
const ADDRESS = "PO Box 123, Springfield, IL 62701";
const sunday = (iso: string) => {
  const now = new Date(iso);
  const week = weekAhead(now);
  return weeklyBody({ ...week, saintCard: saintCardOf(week.saint?.slug ?? null), start: now });
};

describe("the Sunday email in the kit's look", () => {
  it("in the Nativity Fast keeps the default colours, shows the night of its day, and says each day's fast in the calendar's words", () => {
    const body = sunday("2026-11-22T12:00:00Z");
    expect(nativityFastDay(new Date("2026-11-22T12:00:00Z"))).toBe(8);
    expect(body.season).toEqual({ kind: "nativity-fast", day: 8 });
    const html = renderMarketing(body, "product_updates", TOKEN, ADDRESS).html;
    // Dark, as every email (his word, 2026-11-13: "keep all the emails default Purify colors"); it wore Night sky's #05070d.
    expect(html).toContain(`<body class="g-ground" style="margin:0;padding:0;background-color:${KIT_DARK.ground};">`);
    expect(html.toLowerCase()).not.toContain("#05070d");
    expect(html.toLowerCase()).not.toContain("#0f1420");
    expect(html).toContain(`${SITE_URL.replace(/\/$/, "")}/email/nativity-night-08.png`);
    expect(html).toContain("Nativity Fast · day 8 of 40");
    const fasted = (body.lines ?? []).filter((l) => l.fast);
    expect(fasted.length).toBeGreaterThan(0);
    for (const l of fasted) expect(html).toContain(`&nbsp;${esc(l.fast!.label)}`);
    expect(html).toContain("/reading/paths/nativity");
    expect(html).toContain("Dates and fasting follow the new calendar.");
  });

  it("outside a fast wears Dark, and lists the days without their fasts", () => {
    const body = sunday("2026-09-13T12:00:00Z");
    expect(body.season).toBeUndefined();
    expect(body.deck).toBe(weekRange(new Date("2026-09-13T12:00:00Z")));
    const html = renderMarketing(body, "product_updates", TOKEN, ADDRESS).html;
    expect(html).toContain(`background-color:${KIT_DARK.ground};`);
    expect(html).not.toContain("Nativity Fast");
    expect(html).not.toContain("&#9679;");
    // Said once, in the foot, never again as a paragraph above it.
    expect(html.split("Dates follow the new calendar.").length - 1).toBe(1);
  });

  it("says the week's dates under its title, the day in each margin, and ends on the week's saint", () => {
    const body = sunday("2026-11-15T12:00:00Z");
    expect(body.deck).toBe("November 15 to 21");
    const html = renderMarketing(body, "product_updates", TOKEN, ADDRESS).html;
    expect(html).toMatch(/>Sun<\/p>\s*<p[^>]*>15<\/p>/);
    if (body.card) {
      expect(html).toContain("This week in the library");
      expect(html).toContain(`>${esc(body.action!.label)}</a>`);
    }
  });
});

describe("the nights of the Nativity Fast", () => {
  const ROOT = path.resolve(__dirname, "../../..");
  const nightFile = (day: number) => path.join(ROOT, "public", "email", `nativity-night-${String(day).padStart(2, "0")}.png`);

  it("are drawn for all forty days, each on the main web, so every Sunday of every year's fast has its own", () => {
    for (let day = 1; day <= 40; day++) {
      expect(NIGHTS_DRAWN.has(day), `day ${day}`).toBe(true);
      expect(fs.existsSync(nightFile(day)), nightFile(day)).toBe(true);
    }
  });

  it("show on each Sunday of this year's fast, with words that say where the star stands", () => {
    // 2026: the Sundays fall on days 1, 8, 15, 22, 29 and 36.
    const sundays: [string, number, string][] = [
      ["2026-11-15", 1, "a little above the horizon"],
      ["2026-11-22", 8, "a little above the horizon"],
      ["2026-11-29", 15, "halfway up the sky"],
      ["2026-12-06", 22, "halfway up the sky"],
      ["2026-12-13", 29, "high in the sky"],
      ["2026-12-20", 36, "high in the sky"],
    ];
    for (const [iso, day, where] of sundays) {
      const html = renderMarketing(sunday(`${iso}T12:00:00Z`), "product_updates", TOKEN, ADDRESS).html;
      expect(html, iso).toContain(`/email/nativity-night-${String(day).padStart(2, "0")}.png`);
      expect(html, iso).toContain(`The star stands ${where}: day ${day} of 40.`);
    }
  });

  it("and the masthead's cross are the website's alone: the apps' export drops them by name", () => {
    expect(fs.existsSync(path.join(ROOT, "public", new URL(KIT_ASSETS.cross).pathname))).toBe(true);
    const build = fs.readFileSync(path.join(ROOT, "scripts", "native-build.mjs"), "utf8");
    expect(build).toContain('const drawn = path.join(ROOT, "public", "email");');
    expect(build).toContain('pruneEmailPictures(path.join(ROOT, "out"));');
  });
});

describe("a saint's picture", () => {
  const stem = (url: string) => url.slice(url.lastIndexOf("/") + 1).replace(/\.(?:jpe?g|png|webp|avif)$/, "");
  const listed = SAINTS.find((s) => s.iconUrl && HERITAGE_STEMS.includes(stem(s.iconUrl)));
  const free = SAINTS.find((s) => s.iconUrl && !HERITAGE_STEMS.includes(stem(s.iconUrl)));

  it("is left out when it is on the heritage list, and the card stands on its words", () => {
    expect(listed, "a saint whose icon is on the heritage list").toBeDefined();
    const card = saintCardOf(listed!.slug);
    expect(card.picture).toBeNull();
    expect(card.epithet).toBe(listed!.epithet || null);
  });

  it("is the library's own otherwise, from the main web", () => {
    expect(free).toBeDefined();
    expect(saintCardOf(free!.slug).picture).toBe(`${SITE_URL.replace(/\/$/, "")}${free!.iconUrl}`);
  });
});

describe("every letter in the kit's look", () => {
  const letters = [
    renderMarketing(sunday("2026-11-22T12:00:00Z"), "product_updates", TOKEN, ADDRESS),
    renderMarketing(sunday("2026-09-13T12:00:00Z"), "product_updates", TOKEN, ADDRESS),
    renderMarketing(
      monthlyBody({ monthLabel: "October", now: { saints: 170, books: 83, chapters: 1400, verses: 35206 }, before: { saints: 159, books: 83, chapters: 1400, verses: 35206 } })!,
      "monthly_note",
      TOKEN,
      ADDRESS,
    ),
  ];

  it("ends on why it came, who sent it with the postal address, and this reader's own Unsubscribe", () => {
    for (const l of letters) {
      expect(l.html).toContain("You are getting this because you turned on");
      expect(l.html).toContain(esc(ADDRESS));
      expect(l.html).toMatch(new RegExp(`href="[^"]*${TOKEN}[^"]*"[^>]*>Unsubscribe</a>`));
    }
  });

  it("is drawn for mail clients, small enough that Gmail never clips it, and never on parchment", () => {
    for (const l of letters) {
      expect(l.html).not.toMatch(/<script|<svg|display:\s*(flex|grid)|conic-gradient/i);
      // The app's default colours and no others (his word, 2026-11-13): every colour written in a
      // letter is Dark's or the night card's, and nothing in it turns on the reader's scheme.
      expect(l.html).not.toContain("prefers-color-scheme");
      expect(l.html).toContain('<meta name="color-scheme" content="dark">');
      const allowed = new Set<string>([...Object.values(KIT_DARK), ...Object.values(KIT_NIGHT)]);
      for (const hex of new Set([...l.html.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()))) expect(allowed.has(hex), hex).toBe(true);
      expect(Buffer.byteLength(l.html, "utf8")).toBeLessThan(100_000);
      for (const paper of ["#f1e8d4", "#e7dcc1", "#e6dcc4"]) expect(l.html.toLowerCase()).not.toContain(paper);
      expect(l.html).not.toContain("—");
      for (const src of [...l.html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])) expect(src.startsWith("https://")).toBe(true);
    }
  });

  it("keeps every link a 44px line of its own", () => {
    for (const l of letters) {
      for (const m of l.html.matchAll(/<a href="[^"]+"[^>]*style="([^"]*)"/g)) {
        const style = m[1];
        const ok = /padding:13px 0;[^"]*line-height:18px/.test(style) || /padding:13px 22px;[^"]*line-height:16px/.test(style) || /display:block;padding:15px 18px/.test(style) || /text-decoration:none$/.test(style);
        expect(ok, style).toBe(true);
      }
    }
  });
});
