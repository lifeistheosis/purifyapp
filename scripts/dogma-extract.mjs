// One-off: extract quotes + explanations + framing from a pulled dogma
// thread JSON into a human-readable markdown audit. Used as source brief
// for the /theology section; output is gitignored under .dogma-audit/.
//
//   node scripts/dogma-extract.mjs .dogma-audit/<threadId>.json > out.md

import fs from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/dogma-extract.mjs <thread.json>");
  process.exit(1);
}

const d = JSON.parse(await fs.readFile(file, "utf8"));
const title = d.channel?.name ?? "(thread)";
const msgs = d.messages ?? [];

const lines = [];
lines.push(`# ${title}`);
lines.push(`Total messages: ${msgs.length}`);
lines.push("");

for (const m of msgs) {
  if (m.author?.bot) continue;
  const c = (m.content || "").trim();
  if (!c) continue;
  const who = m.author?.username ?? "?";
  const ts = (m.timestamp || "").slice(0, 19);
  lines.push(`---`);
  lines.push(`**${who}**  ${ts}`);
  lines.push("");
  lines.push(c);
  lines.push("");
}

process.stdout.write(lines.join("\n"));
