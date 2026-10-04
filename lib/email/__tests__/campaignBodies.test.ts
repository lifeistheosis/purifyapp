import { describe, expect, it } from "vitest";

import type { Commemoration } from "@/lib/calendar/orthodox";

import { nextFeastDrop } from "@/lib/shop/feasts";

import { renderMarketing } from "../marketing";
import {
  addedSince,
  countSentence,
  countWord,
  monthlyBody,
  releaseBody,
  weeklyBody,
} from "../templates/contentBodies";
import type { MarketingBody } from "../templates/marketingBodies";
import { nameDayBody, shopFeastBody, shopGreatFeastBody, shopNewBody } from "../templates/shopBodies";
import { weekAhead } from "../weekly";
import { checkEmailCopy, explainEmail } from "./emailCopyHelpers";

const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
const ADDRESS = "PO Box 123, Springfield, IL 62701";

function passes(body: MarketingBody) {
  const email = renderMarketing(body, "product_updates", TOKEN, ADDRESS);
  const v = checkEmailCopy({ subject: email.subject, body: email.text });
  expect(v, explainEmail(v)).toEqual([]);
}

describe("the week ahead", () => {
  const MONDAY = new Date("2026-09-14T09:00:00Z");
  const saint = (name: string, slug?: string): Commemoration =>
    ({ name, kind: "saint", slug, saint: slug ? { name, slug } : undefined }) as unknown as Commemoration;
  const feast = (name: string): Commemoration => ({ name, kind: "feast" }) as Commemoration;

  // A week with two feasts on days four and six, and saints every day.
  const lookup = (d: Date): Commemoration[] => {
    const i = Math.round((d.getTime() - Date.UTC(2026, 8, 14)) / 86_400_000);
    const day = [saint(`Saint ${i}`, i === 2 ? "john-chrysostom" : undefined)];
    return i === 3 ? [feast("Exaltation of the Cross"), ...day] : i === 5 ? [feast("A Feast"), ...day] : day;
  };

  it("keeps five days, feasts always among them, back in date order", () => {
    const { lines } = weekAhead(MONDAY, lookup);
    expect(lines).toHaveLength(5);
    expect(lines.filter((l) => l.kind === "feast").map((l) => l.name)).toEqual(["Exaltation of the Cross", "A Feast"]);
    const times = lines.map((l) => l.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("picks a saint the library has a page for, and labels days the way people say them", () => {
    const week = weekAhead(MONDAY, lookup);
    expect(week.saint).toEqual({ name: "Saint 2", slug: "john-chrysostom" });
    expect(week.lines[0].day).toBe("Monday, September 14");
  });

  it("leads the subject with the week's feast, and passes the rules", () => {
    const body = weeklyBody(weekAhead(MONDAY, lookup));
    expect(body.subject).toBe("The week ahead: Exaltation of the Cross");
    expect(body.action?.href).toMatch(/\/saints\/john-chrysostom$/);
    passes(body);
  });
});

describe("the monthly note", () => {
  const now = { saints: 170, books: 83, chapters: 1400, verses: 35206 };

  it("counts in words the way the board asks, and uses a comma past nine hundred ninety nine", () => {
    expect(countSentence({ saints: 11, books: 2, verses: 400 })).toBe("Eleven saints, two books and four hundred verses.");
    expect(countWord(35206)).toBe("35,206");
    expect(countSentence({ books: 1 })).toBe("One book.");
  });

  it("says what was added since last time, and never reports a shrink", () => {
    expect(addedSince(now, { saints: 159, books: 83, chapters: 1400, verses: 35300 })).toEqual({
      saints: 11,
      books: 0,
      chapters: 0,
      verses: 0,
    });
  });

  it("sends nothing when nothing was added, and totals the first time", () => {
    expect(monthlyBody({ monthLabel: "September", now, before: now })).toBeNull();
    const first = monthlyBody({ monthLabel: "September", now, before: null })!;
    expect(first.paragraphs.join(" ")).toContain("one hundred seventy saints");
    passes(first);
  });

  it("names the month and passes the rules", () => {
    const body = monthlyBody({ monthLabel: "September", now, before: { ...now, saints: 159 } })!;
    expect(body.subject).toBe("What was added to Purify in September");
    expect(body.paragraphs[0]).toContain("eleven saints");
    passes(body);
  });
});

describe("the release email", () => {
  const note = {
    version: "1.4",
    kind: "The admin grows up",
    blurb: "What changed.",
    items: ["A plain line.", { category: "fixes" as const, text: "Reading position survives." }],
  };
  const letter = {
    picture: { src: "/whats-new/1.5/email.jpg", alt: "Genesis 1 with its Greek.", width: 960, height: 600 },
    intro: "Here is what is new.",
    points: [
      { emoji: "📖", name: "The Greek Old Testament", text: "The Greek beside the English." },
      {
        emoji: "🛒",
        name: "Icons & prints",
        text: "A new shelf in the shop.",
        picture: { src: "/whats-new/1.5/email-profile.jpg", alt: "A shelf of icons.", width: 600, height: 916 },
      },
    ],
    closing: "The library stays free.",
  };

  it("with nothing written for it, is the note's own name and summary and a way to the rest", () => {
    const body = releaseBody(note);
    expect(body.subject).toBe("Purify 1.4: The admin grows up");
    expect(body.heading).toBe("Purify 1.4");
    expect(body.deck).toBe("The admin grows up");
    expect(body.paragraphs).toEqual(["What changed."]);
    expect(body.points).toBeUndefined();
    expect(body.image).toBeUndefined();
    expect(body.action?.href.endsWith("/whats-new")).toBe(true);
    passes(body);

    // The lines are read on the page. A long note and a short one send the same letter.
    const email = renderMarketing(body, "product_updates", TOKEN, ADDRESS);
    expect(email.html).not.toContain("A plain line.");
    expect(email.html).not.toContain("Reading position survives.");
    expect(email.html.indexOf(">Purify 1.4</h1>")).toBeLessThan(email.html.indexOf("The admin grows up"));
    expect(email.text.startsWith("The admin grows up\n\nWhat changed.")).toBe(true);
  });

  it("with the release's own letter, is its picture and its points in place of the summary", () => {
    const body = releaseBody(note, letter);
    expect(body.paragraphs).toEqual(["Here is what is new."]);
    expect(body.points?.map((pt) => pt.name)).toEqual(["The Greek Old Testament", "Icons & prints"]);
    expect(body.points?.[0]).toEqual(letter.points[0]);
    expect(body.points?.[1].picture?.src.startsWith("https://")).toBe(true);
    expect(body.after).toEqual(["The library stays free."]);
    expect(body.image?.src.startsWith("https://")).toBe(true);
    expect(body.image?.src.endsWith("/whats-new/1.5/email.jpg")).toBe(true);
    passes(body);

    const email = renderMarketing(body, "product_updates", TOKEN, ADDRESS);
    expect(email.html).not.toContain("What changed.");
    expect(email.html).toContain('width="480" alt="Genesis 1 with its Greek."');
    expect(email.html).toContain(`<a href="${body.action!.href}" style="text-decoration:none"><img`);
    // Each point: its mark, its name in the heading's ink with a full stop, its line. Escaped once.
    expect(email.html).toContain(">The Greek Old Testament.</strong> The Greek beside the English.");
    expect(email.html).toContain(">Icons &amp; prints.</strong> A new shelf in the shop.<img");
    // A screenshot under its point, at a phone's width, with its words for a reader who sees no pictures.
    expect(email.html).toContain('/whats-new/1.5/email-profile.jpg" width="300" alt="A shelf of icons."');
    // In the order a reader meets them, and all of it in the text part.
    const order = ["Here is what is new.", "The Greek Old Testament.", "Icons &amp; prints.", "The library stays free.", "See everything that is new"];
    expect(order.map((t) => email.html.indexOf(t))).toEqual([...order.map((t) => email.html.indexOf(t))].sort((x, y) => x - y));
    expect(email.text).toContain(
      "Genesis 1 with its Greek.\n\nHere is what is new.\n\n📖 The Greek Old Testament. The Greek beside the English.\n\n🛒 Icons & prints. A new shelf in the shop. (A shelf of icons.)\n\nThe library stays free.",
    );
  });

  it("falls back to the summary when a letter has no points, and still says something with no summary", () => {
    expect(releaseBody(note, { ...letter, points: [] }).paragraphs).toEqual(["What changed."]);
    const bare = releaseBody({ version: "1.4.2", kind: "", blurb: "" });
    expect(bare.subject).toBe("Purify 1.4.2");
    expect(bare.deck).toBeUndefined();
    expect(bare.paragraphs).toEqual(["What changed in Purify 1.4.2 is on the What's New page."]);
    passes(bare);
  });
});

describe("the shop list", () => {
  const piece = (i: number) => ({ title: `Icon ${i}`, slug: `icon-${i}`, priceCents: 2499 });

  it("batches new pieces into one email and counts them in words", () => {
    const body = shopNewBody([piece(1), piece(2), piece(3)]);
    expect(body.subject).toBe("Three new pieces in the Purify shop");
    expect(body.paragraphs).toContain("Icon 2, $24.99");
    passes(body);
  });

  it("lists six at most and says there are more", () => {
    const body = shopNewBody(Array.from({ length: 9 }, (_, i) => piece(i)));
    expect(body.paragraphs.filter((p) => p.startsWith("Icon"))).toHaveLength(6);
    expect(body.paragraphs).toContain("And more in the shop.");
  });

  it("dates the feast windows from the calendar, never as a deadline", () => {
    passes(shopFeastBody({ feast: "nativity", begins: "November 15", pieces: [piece(1)] }));
    passes(shopFeastBody({ feast: "pascha", begins: "April 12", pieces: [piece(1)] }));
  });

  it("picks the next buying moment, not one already past", () => {
    // With nothing in the shop for a great feast, only the two windows remain.
    expect(nextFeastDrop(new Date("2026-06-20T00:00:00Z"), [])).toMatchObject({ key: "nativity" });
    expect(nextFeastDrop(new Date("2026-12-01T00:00:00Z"), []).key).toBe("pascha");
    expect(nextFeastDrop(new Date("2026-12-01T00:00:00Z"), []).date.getUTCFullYear()).toBe(2027);
  });

  it("names a great feast as the calendar does and says only its day", () => {
    const one = shopGreatFeastBody({
      name: "Dormition of the Most Holy Theotokos",
      on: "August 15",
      kind: "theotokos",
      pieces: [piece(1)],
    });
    passes(one);
    expect(one.subject).toBe("For the feast: Dormition of the Most Holy Theotokos");
    expect(one.paragraphs[0]).toBe("The feast is on August 15.");
    expect(one.action?.href).toContain("/shop/icons/");
    for (const kind of ["feast_icon", "christ", "cross"] as const) {
      passes(shopGreatFeastBody({ name: "Holy Theophany of Our Lord", on: "January 6", kind, pieces: [piece(1), piece(2)] }));
    }
  });
});

describe("the name day", () => {
  it("greets the reader on their patron's feast, and mentions an icon only when the shop has one", () => {
    const without = nameDayBody({ saintName: "St Nicholas", saintSlug: "nicholas", piece: null });
    expect(without.subject).toBe("Today is the feast of St Nicholas");
    expect(without.paragraphs.join(" ")).not.toContain("shop");
    const withIcon = nameDayBody({ saintName: "St Nicholas", saintSlug: "nicholas", piece: { title: "St Nicholas, mounted", slug: "n", priceCents: 3200 } });
    expect(withIcon.paragraphs.join(" ")).toContain("$32.00");
    passes(without);
    passes(withIcon);
  });
});
