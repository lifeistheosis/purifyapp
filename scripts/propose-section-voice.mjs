// Proposes a `voice` for each section in the saints corpus, and PRINTS the
// proposal. It never writes. Applying a voice is an editorial act: a wrong
// one is emitted as structured data and propagates into every model that
// reads the site, so the machine's job here is to sort the corpus into
// "obvious" and "look at this yourself", not to decide.
//
// Signals, in the order they are trusted:
//
//   1. The section TITLE. "Troparion", "Kontakion", "Prayer of ..." are
//      liturgical texts by name. This is the most reliable signal we have.
//   2. The CITATION, when present. A citation naming Scripture means
//      scripture; one naming a liturgical book means liturgical; one naming
//      the saint's own work means saint.
//   3. The presence of FRAMING. The corpus convention (documented on the
//      Section type) is that framing signals a second register: with a
//      citation the paragraphs are a quotation, without one they are a
//      retelling. That distinguishes registers but cannot say WHOSE words,
//      so it only ever proposes `editorial`, never `saint`.
//
// The work's prose `source` string is deliberately NOT used. It describes
// how the text was gathered, not who spoke it: St Seraphim's Instructions
// are "Compiled from the saint's oral teaching" and are nonetheless his own
// verbatim words.
//
// Usage:  node scripts/propose-section-voice.mjs [--all]
//   default: only sections in scope (compiled-source works + framed sections)
//   --all:   every section, for a full-corpus review later

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "saints");
const ALL = process.argv.includes("--all");

const LITURGICAL_TITLE =
  /\b(troparion|kontakion|apolytikion|megalynarion|sticheron|stichera|ikos|oikos|exapostilarion|theotokion|akathist|canon of|hymn|magnification|dismissal)\b/i;
const PRAYER_TITLE = /\b(prayer|prayers)\b/i;
const SCRIPTURE_CITATION =
  /\b(genesis|exodus|psalm|proverbs|isaiah|jeremiah|ezekiel|daniel|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation|sirach|wisdom|kjv|lxx|septuagint)\b/i;
const LITURGICAL_CITATION =
  /\b(troparion|kontakion|apolytikion|byzantine|menaion|octoechos|triodion|pentecostarion|horologion|euchologion|liturgy of|divine liturgy|matins|vespers)\b/i;

function propose(work, sec) {
  const title = sec.title || "";
  const cit = sec.citation || "";

  if (LITURGICAL_TITLE.test(title)) return ["liturgical", "title names a liturgical form"];
  if (LITURGICAL_CITATION.test(cit)) return ["liturgical", "citation names a liturgical source"];
  if (SCRIPTURE_CITATION.test(cit)) return ["scripture", "citation names Scripture"];
  if (PRAYER_TITLE.test(title) && sec.framing)
    return ["REVIEW", "titled a prayer: is it his own composition or the Church's?"];
  if (sec.framing && !sec.citation)
    return ["editorial", "framing without citation, the corpus convention for a retelling"];
  if (sec.framing && sec.citation)
    return ["REVIEW", "framing + citation: a quotation, but of whom?"];
  return ["saint", "no second register declared"];
}

const COMPILED = /compiled|drawn from|based on|retell|adapted|synthesi|summar/i;

const rows = [];
for (const d of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json") || f === "licensed-works.json") continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(j.sections)) continue;
    const compiledWork = COMPILED.test(j.source || "");
    for (const s of j.sections) {
      const inScope = compiledWork || Boolean(s.framing);
      if (!ALL && !inScope) continue;
      const [voice, why] = propose(j, s);
      rows.push({
        saint: d,
        work: j.slug,
        n: s.n,
        title: s.title,
        voice,
        why,
        compiledWork,
        hasFraming: Boolean(s.framing),
        citation: s.citation || "",
      });
    }
  }
}

const byVoice = {};
for (const r of rows) byVoice[r.voice] = (byVoice[r.voice] || 0) + 1;

console.log(`sections considered: ${rows.length}`);
console.log("proposal:", JSON.stringify(byVoice, null, 1));
console.log("\n=== NEEDS A HUMAN (REVIEW) ===");
for (const r of rows.filter((r) => r.voice === "REVIEW")) {
  console.log(
    `${r.saint}/${r.work} s${r.n}  ${JSON.stringify(r.title)}\n    ${r.why}${r.citation ? `\n    citation: ${r.citation}` : ""}`,
  );
}
console.log("\n=== proposed liturgical (verbatim, but NOT the saint's words) ===");
for (const r of rows.filter((r) => r.voice === "liturgical")) {
  console.log(`${r.saint}/${r.work} s${r.n}  ${JSON.stringify(r.title)}`);
}
console.log("\n=== proposed editorial (Purify's prose) ===");
for (const r of rows.filter((r) => r.voice === "editorial")) {
  console.log(`${r.saint}/${r.work} s${r.n}  ${JSON.stringify(r.title)}`);
}
console.log("\n=== proposed scripture ===");
for (const r of rows.filter((r) => r.voice === "scripture")) {
  console.log(`${r.saint}/${r.work} s${r.n}  ${JSON.stringify(r.title)}`);
}

fs.writeFileSync(
  path.join(process.cwd(), ".tmp", "voice-proposal.json"),
  JSON.stringify(rows, null, 2) + "\n",
);
console.log("\nwrote .tmp/voice-proposal.json");
