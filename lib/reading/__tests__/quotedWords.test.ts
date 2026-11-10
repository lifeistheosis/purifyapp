import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ENTRIES } from "../entries";

// No words in quotation marks in our own prose that their source does not hold
// (F-49, 1.9). The reading room's words of the Fathers were checked against
// their editions in 1.8; what was never checked was our own prose around them:
// the retellings, the introductions above a passage, the notes beside it. On
// 2026-11-10, 29 quotations there gave a Father or a historian words his edition
// does not hold: Eusebius reworded ("In the eighth year of the reign of Nero"
// where McGiffert prints "When Nero was in the eighth year of his reign"),
// Irenaeus's "wheat of Christ" as Ignatius's "wheat of God", a sentence given to
// Eusebius that he never wrote, a Latin word given to Ambrose that is not his.
//
// So every quotation of six words or more in our prose is found, word for word,
// in the library's own texts (any section not ours), in the app's Bible, or in a
// passage of its edition recorded in data/reading/quoted-sources.json, cut from
// the edition's text as downloaded. A note may also quote the work's own words.
// Spelling, case and punctuation are not compared; the words and their order are.
// What a reader would notice if this broke: a saint or a historian quoted, in
// quotation marks, in words that are not his book's.

const ROOT = process.cwd();
const MIN_WORDS = 6;

type Section = { n: number; voice?: string; framing?: string; paragraphs: string[]; notes?: string[] };
type Work = { sections: Section[] };
type Passage = { edition: string; place: string; text: string };

/** The words, without case, accents, apostrophes or punctuation. */
function words(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’'`]/g, "")
    .replace(/[^a-z0-9Ͱ-Ͽἀ-῿]+/g, " ")
    .trim();
}

function isOurs(form: string, s: Section): boolean {
  return s.voice === "editorial" || (form === "retelling" && s.voice === undefined);
}

/**
 * The quotations in a text: “curly” double marks, straight double marks paired
 * in their order, and single marks (an apostrophe inside, "Lord's", is part of
 * the quotation; a mark that ends one is not followed by a letter).
 */
export function quotations(text: string): string[] {
  const out: string[] = [];
  let rest = text.replace(/“([^”]*)”/g, (_, q: string) => {
    out.push(q);
    return " ";
  });
  const straight = rest.split('"');
  for (let i = 1; i < straight.length; i += 2) out.push(straight[i]);
  rest = straight.filter((_, i) => i % 2 === 0).join(" ");
  const single = /(?:^|(?<=[\s(—:]))[‘']((?:[^‘’']|['’](?=[A-Za-z])){12,}?)[’'](?![A-Za-z])/g;
  for (const m of rest.matchAll(single)) out.push(m[1]);
  return out;
}

const forms: Record<string, string> = {};
const works: Record<string, Work> = {};
for (const [key, entry] of Object.entries(ENTRIES)) {
  const file = path.join(ROOT, "data/saints", `${key}.json`);
  if (!fs.existsSync(file)) continue;
  forms[key] = entry.form;
  works[key] = JSON.parse(fs.readFileSync(file, "utf8")) as Work;
}

const RECORDED = (JSON.parse(fs.readFileSync(path.join(ROOT, "data/reading/quoted-sources.json"), "utf8")) as { passages: Passage[] }).passages;

function haystacks(): { library: string; bible: string; recorded: string[] } {
  const library: string[] = [];
  for (const [key, work] of Object.entries(works)) {
    for (const s of work.sections) if (!isOurs(forms[key], s)) library.push(words(s.paragraphs.join(" ")));
  }
  const bible: string[] = [];
  const bibleDir = path.join(ROOT, "data/bible");
  for (const book of fs.readdirSync(bibleDir)) {
    const dir = path.join(bibleDir, book);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/^\d+\.json$/.test(f)) continue;
      const ch = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { verses?: { text?: string }[] };
      // A chapter is one text, so a quotation may run from one verse into the next.
      bible.push(words((ch.verses ?? []).map((v) => v.text ?? "").join(" ")));
    }
  }
  return { library: ` ${library.join(" | ")} `, bible: ` ${bible.join(" | ")} `, recorded: RECORDED.map((p) => ` ${words(p.text)} `) };
}

describe("quotations in our own prose", () => {
  it("are each the words of the library, the Bible, or a recorded edition", () => {
    const hay = haystacks();
    const used = new Set<number>();
    const missing: string[] = [];
    let checked = 0;
    for (const [key, work] of Object.entries(works)) {
      const own = ` ${work.sections.flatMap((s) => (isOurs(forms[key], s) ? [words(s.paragraphs.join(" "))] : [])).join(" | ")} `;
      for (const s of work.sections) {
        const fields: { kind: string; text: string }[] = [];
        if (isOurs(forms[key], s)) for (const p of s.paragraphs) fields.push({ kind: "paragraph", text: p });
        if (s.framing) fields.push({ kind: "introduction", text: s.framing });
        for (const n of s.notes ?? []) fields.push({ kind: "note", text: n });
        for (const { kind, text } of fields) {
          for (const q of quotations(text)) {
            if (words(q).split(" ").filter(Boolean).length < MIN_WORDS) continue;
            checked += 1;
            // Each part between ellipses is found, in order of the text it quotes.
            const parts = q
              .split(/\.\.\.|…/)
              .map(words)
              .filter((p) => p.split(" ").length >= 2)
              .map((p) => ` ${p} `);
            const inAll = (h: string) => parts.every((p) => h.includes(p));
            const r = hay.recorded.findIndex(inAll);
            if (r >= 0) used.add(r);
            const found = r >= 0 || inAll(hay.library) || inAll(hay.bible) || (kind !== "paragraph" && inAll(own));
            if (!found) missing.push(`${key} section ${s.n}, ${kind}: "${q.slice(0, 90)}"`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(missing, "quote the source's own words, or say it in our words without quotation marks").toEqual([]);
    // A recorded passage that nothing quotes any more is taken out.
    expect(RECORDED.map((p, i) => (used.has(i) ? null : p.place)).filter(Boolean), "recorded passages no quotation uses").toEqual([]);
  }, 60_000);

  it("are recorded with their edition and place, cut from the edition and never typed", () => {
    for (const p of RECORDED) {
      expect(p.edition.length, p.place).toBeGreaterThan(10);
      expect(p.place.length, p.edition).toBeGreaterThan(2);
      expect(p.text.split(" ").length, p.place).toBeGreaterThan(MIN_WORDS);
    }
  });

  it("are found in the text however they are marked", () => {
    expect(quotations("He said, “one two three four five six” and 'seven eight nine ten eleven twelve'.")).toEqual([
      "one two three four five six",
      "seven eight nine ten eleven twelve",
    ]);
    expect(quotations('Wensinck writes "miyatruta" (excellence) where the Greek has "areté".')).toEqual(["miyatruta", "areté"]);
    expect(quotations("Polycrates: 'and John, who reclined upon the Lord's breast, a teacher'; so")).toEqual([
      "and John, who reclined upon the Lord's breast, a teacher",
    ]);
  });
});
