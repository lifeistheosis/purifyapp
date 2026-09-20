// The committed bank, whatever it holds, must be sound: every row parses,
// every id is unique, every source_ref lands on a page that exists. Empty is
// fine (the page shows its quiet empty state). A row that fails here would
// be dropped by bank.ts with a warning, so this is the check that makes
// that warning a test failure instead of a silent gap in someone's five.

import { describe, expect, it } from "vitest";

import raw from "@/data/catechism/questions.json";

import { bankRegistries, loadBank } from "../bank";
import { parseQuestion } from "../schema";
import { resolveSourceRef } from "../sourceRef";

describe("data/catechism/questions.json", () => {
  it("is an array of questions the schema accepts, with unique ids", () => {
    expect(Array.isArray(raw)).toBe(true);
    const rows = raw as unknown[];
    const ids = new Set<string>();
    rows.forEach((row, i) => {
      const r = parseQuestion(row);
      expect(r.ok, `row ${i}: ${r.ok ? "" : r.errors.join("; ")}`).toBe(true);
      if (r.ok) {
        expect(ids.has(r.question.id), `row ${i}: duplicate id ${r.question.id}`).toBe(false);
        ids.add(r.question.id);
      }
    });
    expect(loadBank()).toHaveLength(rows.length);
  });

  it("has a source_ref that resolves on every question", async () => {
    const registries = await bankRegistries();
    for (const q of loadBank()) {
      expect(resolveSourceRef(q.source_ref, registries), `${q.id}: ${q.source_ref}`).not.toBeNull();
    }
  });

  it("never carries an em dash", () => {
    const text = JSON.stringify(raw);
    expect(text.includes("\u2014")).toBe(false);
  });
});
