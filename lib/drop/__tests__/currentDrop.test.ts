import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ENTRIES } from "@/lib/whatsNew/entries";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

import { checkDrop, type Finding } from "../check";
import { fillDrafts } from "../compose";
import { CURRENT_RELEASE, ROOT, dropPage, readDrop, readLf, writeDrop, writeText } from "../files";
import { releaseOf } from "../kit";
import { pasteFiles, renderKit, renderMarkdown, renderStatus } from "../page";

/**
 * The drop of the release this checkout IS: docs/plans/v<release>/drop.json.
 *
 * It exists because of 1.5, which was pushed, built and checked, and then
 * told to nobody: the note sat in a queue, the site showed the release
 * before, and nothing said so. A drop that breaks a rule now fails here,
 * with every other unit test, before anybody pastes a word of it.
 *
 * `node scripts/drop.mjs` runs this file as a tool, the way
 * `node scripts/release.mjs email` runs the release email's test: with
 * DROP_DRAFT set it first fills the drop's blanks, and with DROP_OUT set it
 * writes the kit for the owner. Both happen before the rules are tried, so
 * what is written is what was checked.
 *
 * A release with no drop.json is not refused here: `node scripts/release.mjs
 * check` says that it has none.
 */

const OUT = process.env.DROP_OUT?.trim();
const DRAFT = Boolean(process.env.DROP_DRAFT?.trim());
/** The tool may be pointed at another release's drop, to read an old one or to start the next. */
const RELEASE = process.env.DROP_RELEASE?.trim() || CURRENT_RELEASE;

let drop = readDrop(RELEASE);

if (drop && DRAFT) {
  const drafted = fillDrafts(drop);
  drop = drafted.drop;
  writeDrop(drop);
  console.log(`Drafts: ${drafted.added.length} piece(s) added${drafted.added.length ? ` (${drafted.added.join(", ")})` : ""}, ${drafted.filled.length} filled${drafted.filled.length ? ` (${drafted.filled.join(", ")})` : ""}.`);
}

const findings: Finding[] = drop ? checkDrop(drop, { entries: ENTRIES, email: RELEASE_EMAIL }) : [];

if (drop && OUT) {
  const dir = path.resolve(ROOT, OUT);
  const pasteDir = path.join(dir, "paste");
  fs.rmSync(pasteDir, { recursive: true, force: true });
  fs.mkdirSync(pasteDir, { recursive: true });
  const made = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(dir, "kit.html"), renderKit({ drop, findings, entries: ENTRIES, made }));
  fs.writeFileSync(path.join(dir, "status.txt"), renderStatus(drop, findings));
  fs.writeFileSync(path.join(dir, "findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
  for (const f of pasteFiles(drop, ENTRIES)) fs.writeFileSync(path.join(pasteDir, f.file), f.text);
  writeText(dropPage(drop.release), renderMarkdown(drop));
}

describe.runIf(drop)(`the drop for ${RELEASE}`, () => {
  it("is this release's, and carries one of its builds", () => {
    expect(drop!.release).toBe(RELEASE);
    expect(releaseOf(drop!.version)).toBe(RELEASE);
    // Never a build that does not exist yet.
    expect(ENTRIES.some((e) => e.version === drop!.version), drop!.version).toBe(true);
    if (RELEASE === CURRENT_RELEASE) expect(ENTRIES.some((e) => e.version === CURRENT_VERSION), CURRENT_VERSION).toBe(true);
  });

  it("holds every rule in docs/DROP.md", () => {
    const refused = findings.filter((f) => f.level === "error").map((f) => `${f.rule} ${f.where}: ${f.says}`);
    expect(refused).toEqual([]);
  });

  it("is written out beside itself, so a change to it can be read", () => {
    // drop.md is drop.json as a page. When they differ: node scripts/drop.mjs kit
    expect(readLf(dropPage(drop!.release)), "docs/plans/v" + drop!.release + "/drop.md is behind drop.json. Run: node scripts/drop.mjs kit").toBe(renderMarkdown(drop!));
  });
});
