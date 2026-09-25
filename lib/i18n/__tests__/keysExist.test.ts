import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every message key the code asks for exists in English.
 *
 * `t(key)` answers the key itself when the catalog has no entry, so a missing
 * key never throws: the reader sees "settings.showSupporterMark" printed on
 * the page where a label should be. That shipped. The supporter mark's toggle
 * was restored onto main by hand after the 1.4 revert, the component came
 * back and its two strings did not, and nothing noticed, because typecheck
 * cannot read a string and catalogs.test.ts measures the catalogs against
 * each other, never against the code.
 *
 * So this reads the code. It collects every literal `t("ns.key")` and
 * `tn("ns.key", ...)` whose namespace the catalog already uses, and requires
 * the key, or for `tn` its plural forms, to be in en.json. A computed key
 * (`t(\`desktop.presence.${kind}\`)`) is invisible to it, which is why those
 * call sites keep their keys in a small closed union next to the call.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EN = JSON.parse(
  fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"),
) as Record<string, string>;
const KEYS = Object.keys(EN);
const NAMESPACES = new Set(KEYS.map((k) => k.split(".")[0]));

function literalKeys(): Map<string, string[]> {
  const out = execFileSync(
    "git",
    ["grep", "-n", "-o", "-E", String.raw`(^|[^A-Za-z0-9_])tn?\("[A-Za-z0-9_]+\.[A-Za-z0-9_.]+"`, "--", "app", "components", "lib"],
    { cwd: ROOT, encoding: "utf8" },
  );
  const found = new Map<string, string[]>();
  for (const line of out.split("\n")) {
    if (!line) continue;
    const [file, lineNo, match] = [line.split(":")[0], line.split(":")[1], line.split(":").slice(2).join(":")];
    if (file.includes("__tests__")) continue;
    const key = /"([^"]+)"/.exec(match)?.[1];
    if (!key || !NAMESPACES.has(key.split(".")[0])) continue;
    found.set(key, [...(found.get(key) ?? []), `${file}:${lineNo}`]);
  }
  return found;
}

describe("message keys used in code", () => {
  const used = literalKeys();

  it("finds the call sites", () => {
    // A regex that silently matched nothing would pass the check below.
    expect(used.size).toBeGreaterThan(500);
  });

  it("all exist in English", () => {
    const missing = [...used.entries()]
      .filter(([key]) => !(key in EN) && !KEYS.some((k) => k.startsWith(`${key}.`)))
      .map(([key, sites]) => `${key}  (${sites.slice(0, 3).join(", ")})`);
    expect(missing, `Keys the code renders that en.json does not have:\n${missing.join("\n")}`).toEqual([]);
  });
});
