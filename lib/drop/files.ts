/**
 * Where a drop lives on disk. The only file under lib/drop that reads or
 * writes anything, so the rules, the drafts and the page can be tested
 * without a file system.
 */

import fs from "node:fs";
import path from "node:path";

import { CURRENT_VERSION, featureRelease } from "@/lib/whatsNew/version";

import type { Drop } from "./kit";

export const ROOT = path.resolve(__dirname, "..", "..");

/** The release this checkout is: a patch belongs to its release, and so does its drop. */
export const CURRENT_RELEASE = featureRelease(CURRENT_VERSION);

export const dropFile = (release: string) => path.join(ROOT, "docs", "plans", `v${release}`, "drop.json");
export const dropPage = (release: string) => path.join(ROOT, "docs", "plans", `v${release}`, "drop.md");

export function readDrop(release: string = CURRENT_RELEASE): Drop | null {
  const file = dropFile(release);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Drop) : null;
}

/** Writes text with the line endings the file already has: this checkout is CRLF, CI is LF. */
export function writeText(file: string, text: string): void {
  const crlf = fs.existsSync(file) ? fs.readFileSync(file, "utf8").includes("\r\n") : false;
  const lf = text.replace(/\r\n/g, "\n");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, crlf ? lf.replace(/\n/g, "\r\n") : lf);
}

export function writeDrop(drop: Drop): void {
  writeText(dropFile(drop.release), `${JSON.stringify(drop, null, 2)}\n`);
}

/** A file's text with one kind of line ending, for comparing what is on disk with what would be written. */
export function readLf(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
}
