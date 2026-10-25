import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ENTRIES, type WorkKey } from "../entries";
import { CHECKED_KEYS, provenanceOf } from "../provenance";

// The source badge (1.8): "Checked word for word against <edition>" at the
// top of a work's page claims only what the reading-room check measured
// (data/reading/provenance.json, F-49), and a retelling says it is ours.

const ROOT = process.cwd();
type Section = { voice?: string; framing?: string };

describe("the source badge", () => {
  it("names only works the reading room holds, and never a retelling", () => {
    for (const key of CHECKED_KEYS) {
      const entry = ENTRIES[key as WorkKey];
      expect(entry, key).toBeDefined();
      expect(entry.form, `${key} is a retelling: its words are ours`).not.toBe("retelling");
      expect(fs.existsSync(path.join(ROOT, "data/saints", `${key}.json`)), key).toBe(true);
    }
  });

  it("says so when some of the page is ours", () => {
    for (const key of CHECKED_KEYS) {
      const work = JSON.parse(fs.readFileSync(path.join(ROOT, "data/saints", `${key}.json`), "utf8")) as { sections: Section[] };
      const ours = work.sections.some((s) => s.voice === "editorial" || Boolean(s.framing));
      const p = provenanceOf(key as WorkKey, ENTRIES[key as WorkKey]);
      expect(p?.kind, key).toBe("checked");
      if (p?.kind === "checked") expect(p.withNotes, `${key}: our introductions or sections`).toBe(ours);
    }
  });

  it("tells every retelling as ours, and says nothing of a work it has not checked", () => {
    for (const [key, entry] of Object.entries(ENTRIES)) {
      const p = provenanceOf(key as WorkKey, entry);
      if (entry.form === "retelling") expect(p, key).toEqual({ kind: "ours" });
      else if (!CHECKED_KEYS.includes(key)) expect(p, key).toBeNull();
    }
  });
});
