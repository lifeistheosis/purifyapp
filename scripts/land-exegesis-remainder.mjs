// Land the last two dogma-exegesis threads from the workflow journal.
//
// The return schema could not carry curatedBy / curatedOn / origin, so those
// are re-attached here. For atheism the existing `origin` says the florilegium
// "is being assembled", which stops being true the moment this lands, so it is
// rewritten rather than preserved.
//
// Usage: node scripts/land-exegesis-remainder.mjs

import fs from "node:fs";
import path from "node:path";

const JOURNAL =
  "C:/Users/Leona/.claude/projects/C--Users-Leona-Homebase/dbf4dbd5-0f62-474f-8946-294bfb0a3e5c/subagents/workflows/wf_7ea6ecab-38e/journal.jsonl";
const ON = "2026-07-27";

const bySlug = {};
for (const line of fs.readFileSync(JOURNAL, "utf8").trim().split("\n")) {
  let j;
  try { j = JSON.parse(line); } catch { continue; }
  if (j.type !== "result" || !j.result || !j.result.slug) continue;
  bySlug[j.result.slug] = j.result;
}

/** Reader-facing shape. editorialNotes stay in the review record, not here. */
function toData(s, origin) {
  return {
    slug: s.slug,
    title: s.title,
    subtitle: s.subtitle,
    group: s.group,
    summary: s.summary,
    curatedBy: "Purify Team",
    curatedOn: ON,
    origin,
    essay: s.essay,
    florilegium: s.florilegium,
    scripture: s.scripture,
    related: s.related,
  };
}

const QUEUE = path.join(process.cwd(), "docs", "editorial", "dogma-queue");

// 1. essence-energies -> new theology study
const ee = bySlug["essence-energies"];
if (ee) {
  fs.writeFileSync(
    path.join(process.cwd(), "data", "theology", "essence-energies.json"),
    JSON.stringify(
      toData(ee, "Discord, dogma-exegesis: God, Necessity, and Metaphysical Dead Ends: Why the Essence-Energies Distinction is Non-Negotiable."),
      null, 2,
    ) + "\n",
  );
  fs.writeFileSync(path.join(QUEUE, "essence-energies.json"), JSON.stringify(ee, null, 2) + "\n");
  console.log(`essence-energies  florilegium=${ee.florilegium.length} essay=${ee.essay.length} notes=${ee.editorialNotes.length}`);
}

// 2. atheism -> overwrite the existing apologetics topic
const at = bySlug["atheism"];
if (at) {
  const p = path.join(process.cwd(), "data", "apologetics", "atheism.json");
  const prev = JSON.parse(fs.readFileSync(p, "utf8"));
  const origin =
    "Opened in v9.9 as a foundation entry. Florilegium assembled and verified 2026-07-27 " +
    "(NPNF and ANF, checked against source). Enriched with the transcendental and " +
    "intentionality arguments from the dogma-exegesis thread, permission on record.";
  const next = toData(at, origin);
  // Keep anything the old file had that the new shape does not model.
  for (const k of Object.keys(prev)) if (!(k in next)) next[k] = prev[k];
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + "\n");
  fs.writeFileSync(path.join(QUEUE, "atheism.json"), JSON.stringify(at, null, 2) + "\n");
  console.log(
    `atheism           florilegium=${prev.florilegium.length} -> ${at.florilegium.length}` +
    `  essay=${prev.essay.length} -> ${at.essay.length}  notes=${at.editorialNotes.length}`,
  );
}
