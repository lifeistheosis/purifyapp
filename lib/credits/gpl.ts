import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * The GNU General Public License, version 3, in its own words (1.9, the
 * arbiter's word of 2026-11-11: the Almeida of 1911, Portuguese among the
 * Bibles to download, is read from a transcription that the CrossWire Bible
 * Society distributes under the GNU GPL, and the licence asks that its terms
 * travel with the text). The module's conf names the licence without a
 * version ("DistributionLicense=GPL"), and the licence itself says that where
 * no version is named any version ever published may be chosen; Purify
 * follows version 3. The file is gnu.org's, byte for byte
 * (lib/credits/__tests__/gpl.test.ts holds it to its hash). On the page its
 * hard-wrapped lines are joined into paragraphs, so a phone's width reads it;
 * not a word is changed.
 */
export const GPL_FILE = path.join(process.cwd(), "data", "licenses", "gpl-3.0.txt");

/** Where Purify's converted copy of the Almeida, and the scripts that made it, can be had. */
export const ALMEIDA_COPY = {
  files: "https://github.com/lifeistheosis/purifyapp/tree/main/public/bibles/pt-almeida-1911",
  scripts: "https://github.com/lifeistheosis/purifyapp/tree/main/scripts/bibles",
};

/**
 * The licence as paragraphs: its blank lines divide them, and each
 * paragraph's lines are joined with a space. A block of centred lines (every
 * line set in by eight spaces or more: the title and its version, Preamble,
 * TERMS AND CONDITIONS) keeps each line as its own.
 */
export function gplParagraphs(text = fs.readFileSync(GPL_FILE, "utf8")): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return [];
      const centred = lines.every((line) => /^ {8,}\S/.test(line));
      return centred ? lines.map((line) => line.trim()) : [lines.map((line) => line.trim()).join(" ")];
    });
}
