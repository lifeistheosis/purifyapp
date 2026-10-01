// Builds lib/bible/strongs-greek.json, the lexicon behind the Greek word card
// and the top of the Plus word study sheet, from Strong's 1890 Greek
// dictionary (public domain) as marked up in XML by Ulrik Petersen and
// published by Open Scriptures.
//
// The first import (scripts/fetch-tagged-nt.mjs, v1.3) read Open Scriptures'
// strongs-greek-dictionary.js and kept `strongs_def`. That JSON is the XML's
// text with the tags removed, so it inherits every misplaced tag, and the tag
// strip loses more. Checked against the plain e-text the XML was made from
// (strongsgreek.dat in the same repository), 166 of 5,523 definitions were
// wrong in the card:
//
// 1. The definition starts inside the derivation. G2316 read "figuratively,
//    a magistrate; by Hebraism, very" because "a deity, especially (with
//    G3588 (ὁ)) the supreme Divinity;" was tagged as derivation. No rule finds
//    these safely (G1510's second derivation clause has the same shape), so
//    DEF_START lists them by hand.
// 2. The derivation runs into the definition. Mostly the tag closes inside a
//    parenthesis the derivation opened, so G5587 read "by implication, a
//    slander; probably akin to G5574 (ψεύδομαι)); whispering, i.e. secret
//    detraction". Found by rule: if the derivation leaves a parenthesis open,
//    or the definition closes one it never opened, the definition starts
//    after the first top-level semicolon. Derivations in two clauses
//    (G2521 "from G2596 (κατά); and ἧμαι (to sit; ...); to sit down") are in
//    DEF_START.
// 3. The definition ends inside the KJV renderings, or sits there entirely
//    (G2022), or is missing and the KJV renderings stood in for it (G2570
//    καλός read "X better, fair, good(-ly), honest, meet, well, worthy").
// 4. Inline Greek words are empty elements, <greek unicode="ἦρι" .../>, which
//    a tag strip turns into nothing: G712 read "perhaps from ("early")". They
//    are written back. Pronunciation respellings are left out, as they are
//    for headwords.
//
// Every definition is one unbroken run of the dictionary's own words.
// DEF_START only says where that run begins, and the build fails unless the
// text occurs exactly once in the entry. docs/editorial-standards.md: verbatim
// public-domain text, never retyped. Cross-references are written
// "G3588 (ὁ)", the form the first import used and every other entry has.
// The e-text's own slips stay as printed (G852 "non-apparent)").
//
// Usage: node scripts/build-strongs-greek.mjs [path/to/strongsgreek.xml]
// Without a path the XML is downloaded from Open Scriptures.

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LEXICON_OUT = path.join(ROOT, "lib", "bible", "strongs-greek.json");
const STRONGS_XML_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/StrongsGreekDictionaryXML_1.4/strongsgreek.xml";

// Where the definition begins, for entries whose XML tags put it somewhere
// else. Each value is the opening words of the definition, copied from the
// entry; the definition runs from there to the end of the entry's text.
export const DEF_START = {
  // Opening of the definition tagged as derivation.
  G2316: "a deity, especially", // θεός
  G2983: "to take (in very many applications", // λαμβάνω
  G3741: "properly, right (by intrinsic", // ὅσιος
  G5384: "properly, dear, i.e. a friend", // φίλος
  G2919: "properly, to distinguish", // κρίνω, no derivation given
  G3708: "properly, to stare at", // ὁράω, no derivation given
  G1537: "a primary preposition denoting origin", // ἐκ, all definition
  // Derivation runs into the definition, past where the rule would cut.
  G5177: "properly, to affect", // τυγχάνω
  G5143: "to run or walk hastily", // τρέχω
  G4486: "to \"break,\"", // ῥήγνυμι
  G4563: "to sweep", // σαρόω, "meaning a broom" glosses the derivative
  G1163: "it is (was, etc.) necessary", // δεῖ, after the second form δέον
  G1832: "impersonally, it is right", // ἔξεστι, after the second form ἐξόν
  // A derivation in two clauses, tagged as ending after the first.
  G77: "costless, i.e.", // ἀδάπανος
  G97: "undeceitful, i.e.", // ἄδολος
  G1156: "a loan", // δάνειον
  G2358: "to make an acclamatory procession", // θριαμβεύω
  G2359: "hair", // θρίξ
  G2521: "to sit down", // κάθημαι
  G2524: "to lower", // καθίημι
  G2528: "to equip fully", // καθοπλίζω
  G2530: "according to which certain thing", // καθότι
  G3685: "to gratify, i.e.", // ὀνίνημι
  G4482: "to flow (", // ῥέω, the XML lost the e-text's "is used; to flow"
  G5176: "to gnaw or chew", // τρώγω
  G5501: "more evil or aggravated", // χείρων
  // The rule would cut the definition's own first clause.
  G5494: "a storm (as pouring rain)", // χειμών
  // No <strongs_def> at all: the first import fell back to the KJV
  // renderings. G1848 and G5333 keep them, Strong's gives no definition.
  G302: "a primary particle, denoting", // ἄν
  G687: "denoting an interrogation", // ἆρα
  G814: "irregularly (morally)", // ἀτάκτως
  G976: "properly, the inner bark", // βίβλος
  G1065: "a primary particle of emphasis", // γέ
  G1122: "a writer, i.e.", // γραμματεύς
  G1473: "a primary pronoun of the first person", // ἐγώ
  G1682: "my God", // ἐλωΐ
  G2048: "lonesome, i.e.", // ἔρημος
  G2063: "red, i.e.", // ἐρυθρός
  G2073: "the eve", // ἑσπέρα
  G2289: "to kill", // θανατόω
  G2366: "a storm", // θύελλα
  G2537: "new (especially in freshness", // καινός
  G2570: "properly, beautiful", // καλός
  G3718: "to make a straight cut", // ὀρθοτομέω
  G5184: "Tyrus (i.e. Tsor)", // Τύρος
};

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(n);
    }
    if (!(e in ENTITIES)) throw new Error(`Unknown entity ${m}`);
    return ENTITIES[e];
  });
}

// Inner XML of one part of an entry to plain text. References become
// "G3588 (ὁ)" (or "H06865" for Hebrew), as Open Scriptures wrote them.
function toText(xml, lemmas) {
  if (xml == null) return null;
  let s = xml.replace(/<strongsref language="([A-Z]+)" strongs="(\d+)"\/>/g, (_, lang, n) => {
    if (lang !== "GREEK") return `H${n}`;
    const key = `G${parseInt(n, 10)}`;
    return lemmas[key] ? `${key} (${lemmas[key]})` : key;
  });
  s = s.replace(/<greek [^>]*unicode="([^"]*)"[^>]*\/>/g, "$1");
  s = s.replace(/\s*<pronunciation [^>]*\/>/g, "");
  s = s.replace(/<latin>([\s\S]*?)<\/latin>/g, "$1");
  if (/<\/?[a-z]/i.test(s)) throw new Error(`Unhandled markup: ${s}`);
  return decode(s).replace(/\s+/g, " ").normalize("NFC");
}

function parenDepth(s) {
  let d = 0;
  for (const c of s) {
    if (c === "(") d++;
    else if (c === ")") d--;
  }
  return d;
}

// The definition the XML tagged, minus any derivation that ran into it.
function trimDerivationTail(def, open) {
  let d = open;
  let min = d;
  for (let i = 0; i < def.length; i++) {
    const c = def[i];
    if (c === "(") d++;
    else if (c === ")") min = Math.min(min, --d);
    else if (c === ";" && d <= 0) return open > 0 || min < 0 ? def.slice(i + 1) : def;
  }
  return def;
}

function parseEntries(xml) {
  const chunks = xml.split(/<entry strongs="/).slice(1);
  const lemmas = {};
  const raw = [];
  for (const chunk of chunks) {
    const body = chunk.slice(0, chunk.indexOf("</entry>"));
    const key = `G${parseInt(body.slice(0, body.indexOf('"')), 10)}`;
    // The headword is the entry's first <greek>; entries without one are
    // unused numbers, skipped as the first import skipped them.
    const head = body.match(/<greek [^>]*unicode="([^"]*)"[^>]*translit="([^"]*)"/);
    if (!head) continue;
    lemmas[key] = decode(head[1]).normalize("NFC");
    const part = (tag) => body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? null;
    raw.push({
      key,
      translit: decode(head[2]).replace(/\s+/g, " ").normalize("NFC"),
      der: part("strongs_derivation"),
      def: part("strongs_def"),
      kjv: part("kjv_def"),
    });
  }
  return { lemmas, raw };
}

export function buildFromXml(xml) {
  const { lemmas, raw } = parseEntries(xml);
  const used = new Set();
  const out = {};
  for (const e of raw) {
    const der = (toText(e.der, lemmas) ?? "").trim();
    const def = toText(e.def, lemmas)?.trim() || null;
    const kjv = toText(e.kjv, lemmas)?.trim() ?? "";
    // ":--" opens the KJV renderings. Where the tag opens on an earlier one,
    // the clause before the second is the end of the definition, and the
    // e-text has "; " where the tag boundary now sits: G3354 ends
    // "...(i.e. allot by rule); figuratively, to estimate:--measure, mete."
    const spill = kjv.match(/^:?--(.+?):--/)?.[1].trim();
    let d;
    if (DEF_START[e.key]) {
      const whole = `${der} ${def ?? ""}`.replace(/\s+/g, " ").trim();
      const start = DEF_START[e.key];
      const at = whole.indexOf(start);
      if (at < 0 || whole.indexOf(start, at + 1) >= 0) {
        throw new Error(`${e.key}: "${start}" must occur exactly once in "${whole}"`);
      }
      d = whole.slice(at);
      used.add(e.key);
    } else if (def) {
      d = trimDerivationTail(def, parenDepth(der)).trim();
      if (spill) d = `${d}; ${spill}`;
    } else if (spill) {
      d = spill; // G2022, whose <strongs_def> is empty
    } else {
      // No definition in the dictionary: the KJV renderings, as Open
      // Scriptures cleaned them (no leading ":--", no final period).
      d = kjv.replace(/^:--/, "").replace(/\.$/, "");
    }
    // Where the KJV tag opens on "--" its ":" or ";" stays behind on the
    // definition (G422 "irreprehensible:").
    d = d.replace(/^[\s,]+/, "").replace(/\s*[:;]$/, "");
    out[e.key] = { l: lemmas[e.key], t: e.translit, d };
  }
  const unused = Object.keys(DEF_START).filter((k) => !used.has(k));
  if (unused.length) throw new Error(`DEF_START entries not in the dictionary: ${unused}`);
  return out;
}

// One entry per line, in Strong's order, so a change shows as a line diff.
export function serialize(lexicon) {
  const keys = Object.keys(lexicon).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return `{\n${keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(lexicon[k])}`).join(",\n")}\n}\n`;
}

export async function buildStrongsGreek(xmlPath) {
  const xml = xmlPath ? await fs.readFile(xmlPath, "utf8") : await get(STRONGS_XML_URL);
  const lexicon = buildFromXml(xml);
  await fs.writeFile(LEXICON_OUT, serialize(lexicon), "utf8");
  const sz = (await fs.stat(LEXICON_OUT)).size;
  console.log(`lexicon: ${Object.keys(lexicon).length} entries, ${Math.round(sz / 1024)} KB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildStrongsGreek(process.argv[2]).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
