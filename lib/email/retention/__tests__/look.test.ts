import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// The kit's own builder (the Fable designer's), read as it is.
import * as kitBuild from "../../../../docs/brand/kit/email/build.mjs";
import { letterFor, type LetterDay, type RetentionLetter } from "../letters";
import { drawRetention, pictureFor, retentionLook, type LookPicture } from "../look";
import type { PlannedRetention } from "../plan";
import { LOOKS, type Frame } from "../render";

/**
 * The retention look sent is the look he said yes to (2026-11-13 about 20:47
 * UTC, "yes to all": the emails' round 3 as drawn). The kit's builder draws
 * its six sample letters (real letters, letters.sample.json); here the same
 * letters are drawn with the production look (lib/email/retention/look.ts) and
 * held to the builder's, character for character, the pictures given the
 * kit's own `img/`. Then the four calls of the arbiter's brief, which choose
 * what the main web can carry: a Bible place or a work shows its heading and
 * deck only; day 7 sets no verse; the fast's one button is its reading plan;
 * a plain fast day and a fast-free day have no mark picture yet.
 */

const build = kitBuild as {
  retentionLook: (how: string, letter: RetentionLetter, frame: Frame, o: { picture?: LookPicture | null; stepNames?: Record<string, string> }) => string;
  HEROES: Record<string, { alt: string }>;
};

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const SAMPLES = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/brand/kit/email/letters.sample.json"), "utf8")) as Record<string, { letter: RetentionLetter; frame: Frame }>;
const KIT_AT = { base: "img/", site: "https://purifyapp.net" };
const STEP_HERO: Record<string, string> = { morning: "morning-prayers", calendar: "calendar", verse: "verse" };
const stepNames = Object.fromEntries(["morning", "calendar", "verse"].map((s, i) => [s, SAMPLES[`first-week-${[1, 3, 7][i]}`].letter.heading]));

/** The picture the kit gives each sample (build.mjs firstWeek, pickUp, fastingCompanion). */
function kitPicture(letter: RetentionLetter): LookPicture | null {
  const a = letter.about;
  if (a.kind === "first_week") return { src: `img/hero-${STEP_HERO[a.step]}.jpg`, alt: build.HEROES[STEP_HERO[a.step]].alt };
  if (a.kind === "pick_up") return { src: "img/hero-romans.jpg", alt: build.HEROES.romans.alt };
  return { night: true, src: `img/nativity-night-${String(a.day).padStart(2, "0")}.png`, alt: `The night sky, the star above the hill: day ${a.day} of ${a.of}` };
}

/** The one button: its Outlook shape and its pill, each with the letter's own address. */
const buttons = (html: string) => [...html.matchAll(/<v:roundrect [^>]*href="([^"]+)"/g)].map((m) => m[1]);

describe("the retention look is the kit's, mark for mark", () => {
  for (const [name, { letter, frame }] of Object.entries(SAMPLES)) {
    it(`draws ${name} as the builder draws it`, () => {
      const picture = kitPicture(letter);
      const ours = drawRetention(letter, frame, { picture, at: KIT_AT });
      const kit = build.retentionLook("email", letter, frame, { picture, stepNames });
      expect(ours).toBe(kit);
    });
  }

  it("is the look every retention email is sent in", () => {
    expect(LOOKS.first_week).toBe(retentionLook);
    expect(LOOKS.pick_up).toBe(retentionLook);
    expect(LOOKS.fasting_companion).toBe(retentionLook);
  });

  it("gives a mail app with no HTML the same words, the button in words, and the way to stop it", () => {
    const { letter, frame } = SAMPLES["fast-week"];
    const sent = retentionLook(letter, frame);
    expect(sent.subject).toBe(letter.subject);
    expect(sent.text).toContain(letter.heading);
    expect(sent.text).toContain(`${letter.action.label}: ${letter.action.href}`);
    expect(sent.text).toContain(`Unsubscribe: ${frame.unsubscribeHref}`);
    for (const d of letter.days ?? []) expect(sent.text).toContain(`${d.day}: ${d.name}`);
  });
});

describe("the arbiter's four calls (2026-11-13)", () => {
  const pick = SAMPLES["pick-up"];
  const pickUp = (line: Extract<PlannedRetention, { kind: "pick_up" }>["line"]) =>
    letterFor({ kind: "pick_up", userId: "u", step: "nudge" as never, line, dedupeKey: "k", owner: true }, new Date("2026-11-20T11:00:00Z"));

  it("a Bible place or a work shows its heading and deck only: no picture, no sentence", () => {
    const bible = pickUp({ kind: "bible", book: "romans", bookName: "Romans", chapter: 8, verse: 1, at: 0 });
    const work = pickUp({ kind: "work", saintSlug: "john-chrysostom", saintName: "St John Chrysostom", workSlug: "on-the-priesthood", workTitle: "On the Priesthood", sectionN: 2, paragraph: 1, at: 0 });
    for (const letter of [bible, work]) {
      expect(pictureFor(letter), letter.heading).toBeNull();
      const html = drawRetention(letter, pick.frame);
      expect(html).not.toMatch(/<img src="[^"]*hero-/);
      expect(html).toContain(`>${letter.heading.replace(/&/g, "&amp;")}</h1>`);
      if (letter.deck) expect(html).toContain(letter.deck);
      // The letter's own sentence is not drawn: the title and its small line say it.
      expect(html).not.toContain(`font-style:italic;font-size:17px;line-height:26px;`);
    }
  });

  it("a patron saint shows its sentence, and no picture either", () => {
    const patron = pickUp({ kind: "patron", saintSlug: "nicholas", saintName: "St Nicholas", on: "December 6" });
    expect(pictureFor(patron)).toBeNull();
    const html = drawRetention(patron, pick.frame);
    expect(html).not.toMatch(/<img src="[^"]*hero-/);
    expect(html).toContain(patron.paragraphs[0].replace(/&/g, "&amp;").replace(/"/g, "&quot;"));
  });

  it("day 7, the verse, sets no verse: no Scripture is quoted", () => {
    const { letter, frame } = SAMPLES["first-week-7"];
    expect(letter.about).toEqual({ kind: "first_week", step: "verse" });
    const html = drawRetention(letter, frame);
    // The kit's verse is a label and the words set at 19px over a hairline; none is drawn.
    expect(html).not.toContain("font-size:19px;line-height:29px;");
    expect(pictureFor(letter)?.src).toMatch(/\/email\/hero-verse\.jpg$/);
  });

  it("the fast's one button is its reading plan", () => {
    for (const name of ["fast-opening", "fast-week"]) {
      const { letter, frame } = SAMPLES[name];
      const html = drawRetention(letter, frame);
      expect(buttons(html), name).toEqual(["https://purifyapp.net/plans/nativity"]);
      expect(html).toContain(`<a href="https://purifyapp.net/plans/nativity" style="display:inline-block;padding:14px 22px;`);
    }
  });

  it("a plain fast day and a fast-free day have no mark picture yet, and are said in words", () => {
    const { letter, frame } = SAMPLES["fast-week"];
    const days: LetterDay[] = (letter.days ?? []).map((d, i) =>
      i === 0 ? { ...d, fast: { kind: "fast", label: "Fast" }, fastRule: "A fast day." } : i === 1 ? { ...d, fast: { kind: "fast-free", label: "Fast-free" }, fastRule: "No fast." } : d,
    );
    const html = drawRetention({ ...letter, days }, frame);
    expect(html).not.toMatch(/fast-plain|fast-free\.png/);
    expect(html).toMatch(/font-weight:600;color:#ffffff;">Fast<\/p>/);
    expect(html).toMatch(/font-weight:600;color:#ffffff;">Fast-free<\/p>/);
    // The others keep theirs.
    expect(html).toContain("/email/fast-fish.png");
    expect(html).toContain("/email/fast-strict.png");
  });
});

describe("every picture the look can name is on the main web from the merge", () => {
  const file = (url: string) => path.join(ROOT, "public", new URL(url).pathname);

  it("each step's, each of the Nativity Fast's forty nights, the marks, the cross and the arrow", () => {
    const named = new Set<string>();
    for (const { letter, frame } of Object.values(SAMPLES)) {
      for (const m of drawRetention(letter, frame).matchAll(/src="(https:\/\/[^"]+)"/g)) named.add(m[1]);
    }
    for (const step of ["morning", "calendar", "verse"] as const) named.add(pictureFor({ ...SAMPLES["first-week-1"].letter, about: { kind: "first_week", step } })!.src);
    for (let day = 1; day <= 40; day++) {
      const a = SAMPLES["fast-week"].letter.about;
      if (a.kind === "fasting_companion") named.add(pictureFor({ ...SAMPLES["fast-week"].letter, about: { ...a, day } })!.src);
    }
    expect(named.size).toBeGreaterThan(45);
    for (const url of named) expect(fs.existsSync(file(url)), url).toBe(true);
    // The two marks not drawn yet are not shipped either.
    expect(fs.existsSync(path.join(ROOT, "public/email/fast-plain.png"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "public/email/fast-free.png"))).toBe(false);
  });
});
