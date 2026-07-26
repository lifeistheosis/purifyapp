// Move reviewed studies from the editorial queue into the live /theology data.
//
// The queue files carry drafting metadata (editorialNotes, modernScholarship)
// that is a review record, not reader-facing content, so it stays in
// docs/editorial/dogma-queue/ and is deliberately not copied here. The shape
// written is exactly the shape the existing files use: slug, title, subtitle,
// group, summary, curatedBy, curatedOn, origin, essay, florilegium, scripture,
// related.
//
// Run scripts/audit-florilegium.mjs --drop FIRST. Anything whose quotations
// could not be matched against their cited source must not reach this step.
//
// Usage: node scripts/land-theology-studies.mjs

import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "docs", "editorial", "dogma-queue");
const DST = path.join(process.cwd(), "data", "theology");
const CURATED_ON = "2026-07-26";

/** Which Discord thread each study came from, for the `origin` line. */
const ORIGIN = {
  "council-of-florence": ["dogma-exegesis", "The Vatican Illusion: Anatomy of a False Council"],
  "theodore-the-studite-and-rome": ["dogma-exegesis", "Did the Venerable Confessor Theodore Studite profess the papacy?"],
  "justin-martyr-subordinationism": ["dogma-exegesis", "Blessed Justin Martyr is not a Subordinationist"],
  "penal-substitution": ["dogma-exegesis", "Penal Substitutionary Atonement"],
  "the-divine-liturgy": ["liturgics-forum", "The Unveiled Altar"],
  vestments: ["liturgics-forum", "In the Likeness of Angels"],
};

let n = 0;
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  const origin = ORIGIN[s.slug];
  if (!origin) {
    console.warn(`skip ${s.slug}: no origin recorded`);
    continue;
  }
  const out = {
    slug: s.slug,
    title: s.title,
    subtitle: s.subtitle,
    group: s.group,
    summary: s.summary,
    curatedBy: "Purify Team",
    curatedOn: CURATED_ON,
    origin: `Discord, ${origin[0]}: ${origin[1]}.`,
    essay: s.essay,
    florilegium: s.florilegium,
    scripture: s.scripture,
    related: s.related,
  };
  fs.writeFileSync(path.join(DST, `${s.slug}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(
    `landed ${s.slug.padEnd(34)} group=${String(s.group).padEnd(12)} florilegium=${s.florilegium.length} essay=${s.essay.length}`,
  );
  n++;
}
console.log(`\n${n} studies landed. data/theology now holds ${fs.readdirSync(DST).length} files.`);
