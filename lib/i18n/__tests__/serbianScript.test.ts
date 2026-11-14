// The Serbian catalog is written in Cyrillic (the arbiter, 2026-11-10, from
// the prayer campaigns chat's find). 113 of its lines had Latin letters
// where Cyrillic belongs: 111 written wholly in Serbian Latin (whole screens
// of the history, the florilegium, theology, the councils and settings read
// "Pretraži istoriju Crkve" beside lines in Cyrillic), and two names with
// Latin endings ("Od Edgara", "U Safariju").
// Serbian Latin to Cyrillic is one letter to one letter (lj, nj and dž each
// one letter), so the lines were transliterated, not retranslated; the
// prayer campaigns chat fixed its own three.
//
// The rule: no Latin letters in a Serbian line except a placeholder, an
// address, or a name or term below, each with its reason. A name keeps a
// Serbian ending after a hyphen in Cyrillic, as the catalog writes it
// ("Chrome-у", "Safari-ју"). Russian, Ukrainian and Bulgarian write the
// owner's name in their own letters, so Serbian does too ("Од Едгара").
//
// What would go wrong if this broke: a Serbian reader meeting half a screen
// in the other script, or a Latin letter hidden inside a Cyrillic word.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const sr: Record<string, string> = JSON.parse(readFileSync(path.join(ROOT, "lib/i18n/messages/sr.json"), "utf8"));

/** Never words: placeholders, addresses, handles, site paths, query keys, versions, storage keys. */
const MASKS = [
  /\{[^{}]*\}/g,
  /https?:\/\/\S+/g,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /@[\w.]+/g,
  /\b[\w-]+\.(?:net|org|com|info)\b(?:\/[\w/-]*)?/g,
  /(?<![\w/])\/[a-z0-9][a-z0-9/-]*/g,
  /\?[a-z]+=/g,
  /\bv\d[\d.]*/g,
  /\bpurify:\*/g,
];

/** Names of more than one word, read whole so that their words are not allowed alone. */
const PHRASES: Array<[string, string]> = [
  ["Service Book of the Holy Orthodox-Catholic Apostolic Church", "a book's title, cited as it was published"],
  ["Supabase Dashboard, Authentication, Settings", "another service's screens, named as it shows them"],
  ["Manual Linking", "a setting of another service, named as it shows it"],
  ["New King James", "a translation's name"],
  ["New International", "a translation's name"],
  ["New Living", "a translation's name"],
  ["King James", "a translation's name"],
  ["World English Bible", "a translation's name, its publisher's trademark, kept as written (build 95 note 25)"],
  ["Textus Receptus", "a text's name"],
  ["Thomas Nelson", "a publisher"],
  ["Tyndale House", "a publisher"],
  ["CrossWire Bible Society", "a source"],
  ["Orthodox Media Network", "a source"],
  ["Open Scriptures", "a source"],
  ["Copenhagen Alliance", "a source"],
  ["manuscript4u", "the transcribers of the Almeida of 1911, by the name they give themselves"],
  ["GNU GPL", "a licence"],
  ["Nicene Fathers", "a series' title (Schaff and Wace)"],
  ["Amazon Associates", "a programme's name"],
  ["App Store", "a store"],
  ["Google Play", "a store"],
  ["Web Push", "a web standard"],
  ["Harrison Hill", "a reader's name, as he gives it (every catalog keeps it)"],
  ["Creative Commons", "the licences' own name"],
  ["CC BY-SA", "a licence"],
  ["CC BY", "a licence"],
];

/** Single names and terms, each kept in Latin letters wherever it stands. */
const WORDS: Record<string, string> = {
  // Ours.
  Purify: "the app", Plus: "the membership", Pro: "the membership", EIKON: "the shop", Shop: "Purify Shop", Beta: "a release's name",
  // Companies, services and platforms.
  Google: "", Apple: "", Amazon: "", Discord: "", Stripe: "", Render: "", TikTok: "", Instagram: "", YouTube: "", X: "",
  Windows: "", Android: "", iPhone: "", Chrome: "", Edge: "", Firefox: "", eBible: "", Biblica: "",
  Play: "Google's store, as a Serbian line names it (\"Play продавница\")",
  // Churches, editions, sources and people, by their own names.
  OCA: "the Orthodox Church in America's own initials", Nestle: "an edition", "Ante-Nicene": "a series' title", Schaff: "an editor", Wace: "an editor",
  Edgar: "the owner, as he signs", ChristosAnesti: "a reader's name, as he gives it", Markos: "a reader's name, as he gives it",
  // A typeface, a print, formats, units and terms of the trade.
  Lora: "a typeface", "Giclée": "a kind of print", "Wi-Fi": "", OLED: "", PDF: "", JPEG: "", PNG: "", WebP: "", AVIF: "", JSON: "",
  Markdown: "", MB: "", IP: "", USD: "", localStorage: "a browser's store, by its name in code", push: "the phone's own push service",
  // Keys, and the marks on them.
  Enter: "", Esc: "", esc: "", Escape: "", Cmd: "",
  // Numbers and formats: a Roman century, Strong's Greek numbers, date patterns.
  IV: "a century in Roman numerals", G: "Strong's number for a Greek word (G{n})", "MM-DD": "a date pattern", "YYYY-MM-DD": "a date pattern",
};

const LATIN = /[A-Za-zČĆŽŠĐčćžšđé]+(?:-[A-Za-zČĆŽŠĐčćžšđé]+)*/g;

/** The Latin words of a line that are none of the above, and the names it used. */
function unexplained(value: string, used?: Set<string>): string[] {
  let text = value;
  for (const mask of MASKS) text = text.replace(mask, " ");
  for (const [phrase] of PHRASES) {
    if (text.includes(phrase)) {
      used?.add(phrase);
      text = text.split(phrase).join(" ");
    }
  }
  return (text.match(LATIN) ?? []).filter((word) => {
    if (word in WORDS) {
      used?.add(word);
      return false;
    }
    return true;
  });
}

describe("the Serbian catalog is written in Cyrillic", () => {
  it("reads the whole catalog", () => {
    expect(Object.keys(sr).length).toBeGreaterThan(5000);
  });

  it("the rule catches Serbian in Latin letters and a Latin letter inside a Cyrillic word, and lets names through", () => {
    expect(unexplained("Pretraži istoriju Crkve")).toEqual(["Pretraži", "istoriju", "Crkve"]);
    expect(unexplained("Од Edgara, тим Purify.")).toEqual(["Edgara"]);
    expect(unexplained("У Safariju на iPhone-у")).toEqual(["Safariju"]);
    expect(unexplained("Прaвослaвнa Црква")).toEqual(["a", "a", "a"]);
    expect(unexplained("Book of the Holy")).toEqual(["Book", "of", "the", "Holy"]);
    expect(unexplained("Отвори Purify на iPhone-у, {count} пута, на purifyapp.net/who-said-it")).toEqual([]);
  });

  it("holds no Latin word but a placeholder, an address, or a name named here", () => {
    const found = Object.entries(sr)
      .map(([key, value]) => [key, unexplained(value)] as const)
      .filter(([, words]) => words.length > 0)
      .map(([key, words]) => `${key}: ${words.join(" ")}`);
    expect(found).toEqual([]);
  });

  it("names nothing it no longer needs", () => {
    const used = new Set<string>();
    for (const value of Object.values(sr)) unexplained(value, used);
    const unused = [...PHRASES.map(([p]) => p), ...Object.keys(WORDS)].filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });

  it("writes the owner's name in Cyrillic when it takes a Serbian ending, as Russian, Ukrainian and Bulgarian do", () => {
    expect(sr["whatsnew.fromTheTeam"]).toBe("Од Едгара, тим Purify.");
  });
});
