import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The audit ledger has to be readable by something other than a person.
 *
 * WHY THIS EXISTS. docs/audit/findings.yaml is the file AGENTS.md tells every
 * contributor to read before touching billing, webhook, cancel or CI code. On
 * 2026-08-22 it turned out to be broken in three separate ways at once, and
 * every one of them was invisible to a human reading it top to bottom:
 *
 *   1. F-16 through F-26 were indented under `corrections:` rather than
 *      `findings:`, so eleven of twenty-six findings, including every P1, were
 *      not in findings[] at all. Reported at AUDIT-2026-07-27.md:274, still
 *      there four weeks later.
 *   2. The file did not parse AS YAML AT ALL, and never had. Six values
 *      carried an unquoted ": " which YAML reads as the start of a nested
 *      mapping. So the answer to "what does findings[] contain" was not
 *      "fifteen findings", it was an exception.
 *   3. Twenty-one of thirty status fields kept their entire substance in a
 *      trailing `#` comment. F-21's ran to 3,887 characters. A parser saw
 *      `status: partially-corrected` and nothing else, so even a fixed file
 *      would have exposed almost none of what it knows.
 *
 * The third is the one worth dwelling on: a comment is invisible to every
 * reader except a human with the file open. Anything that lives in one is not
 * in the ledger, it is beside it.
 *
 * NO YAML PARSER. js-yaml resolves in this tree today but only as a
 * transitive dependency of something else, so importing it here would make
 * this test fail on an unrelated upgrade. These are string assertions against
 * the three specific shapes that broke, which is all a ratchet needs to be.
 * The same posture as lib/ui/__tests__/touchTargets.test.ts.
 */

const LEDGER = join(__dirname, "..", "..", "..", "docs", "audit", "findings.yaml");
const src = readFileSync(LEDGER, "utf8");
const lines = src.split(/\r?\n/);

const lineOf = (pred: (l: string) => boolean) => lines.findIndex(pred);

describe("findings.yaml is machine-readable", () => {
  it("keeps every finding under findings: and every correction under corrections:", () => {
    const findingsKey = lineOf((l) => l.startsWith("findings:"));
    const correctionsKey = lineOf((l) => l.startsWith("corrections:"));
    expect(findingsKey, "no findings: key").toBeGreaterThanOrEqual(0);
    expect(correctionsKey, "no corrections: key").toBeGreaterThan(findingsKey);

    const misfiled: string[] = [];
    lines.forEach((l, i) => {
      const m = /^\s*- id: (F-\d+|C-\d+)/.exec(l);
      if (!m) return;
      const isFinding = m[1].startsWith("F-");
      // A finding below `corrections:` is an element of the corrections list.
      // That is the exact defect this file shipped with for four weeks.
      if (isFinding && i > correctionsKey) misfiled.push(`${m[1]} at line ${i + 1}`);
      if (!isFinding && i < correctionsKey) misfiled.push(`${m[1]} at line ${i + 1}`);
    });
    expect(misfiled, "ids on the wrong side of the corrections: key").toEqual([]);
  });

  it("carries no unquoted colon that YAML would read as a nested mapping", () => {
    // `action: none new; 2026-07-11 owner decision: unique product photos`
    // is not a string with a colon in it. It is a parse error.
    const offenders: string[] = [];
    lines.forEach((l, i) => {
      const m = /^(\s*(?:- )?)([A-Za-z_][A-Za-z0-9_]*): (.*)$/.exec(l);
      if (!m) return;
      const value = m[3].split(" #")[0].trim();
      if (!value) return;
      if ("[{\"'>|&*".includes(value[0])) return; // quoted, flow, or block scalar
      if (value.includes(": ")) offenders.push(`line ${i + 1}: ${l.trim().slice(0, 80)}`);
    });
    expect(offenders, "quote the value or make it a >- block scalar").toEqual([]);
  });

  it("puts the substance in status_notes, never in a trailing comment", () => {
    // A 3,887-character account of what is actually true about native push
    // lived in a comment, where nothing but a human eye could reach it.
    const offenders = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /^\s*status:.*\s#/.test(l))
      .map(({ l, i }) => `line ${i + 1}: ${l.trim().slice(0, 80)}`);
    expect(offenders, "move the comment into a status_notes: >- field").toEqual([]);
  });

  it("still holds every finding the ledger claims to have", () => {
    const ids = lines.flatMap((l) => {
      const m = /^\s*- id: (F-\d+)/.exec(l);
      return m ? [m[1]] : [];
    });
    // Contiguous from F-01. A gap means one was deleted rather than resolved,
    // and resolving a finding is a status change, never a deletion.
    expect(new Set(ids).size, "duplicate finding ids").toBe(ids.length);
    const numbers = ids.map((i) => Number(i.slice(2))).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i], `gap after F-${String(numbers[i - 1]).padStart(2, "0")}`).toBe(
        numbers[i - 1] + 1,
      );
    }
  });
});
