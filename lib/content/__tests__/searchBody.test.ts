// The search body moved off the wire and onto the device.
//
// The packager used to ship a `search` field that was a lowercased flattening
// of every string in the record, duplicating text already in `json` on the
// same row. These assert the device rebuild is equivalent, so search results
// do not change, and that old packages still import.

import { describe, expect, it } from "vitest";

import { canonicalRecords, searchBodyFor } from "@/lib/content/manifest";
import type { PackageRecord } from "@/lib/content/manifest";

/** The packager's original flattener, kept here as the reference. */
function legacyFlatten(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) legacyFlatten(x, out);
  else if (v && typeof v === "object")
    for (const x of Object.values(v)) legacyFlatten(x, out);
  return out;
}

const obj = {
  slug: "on-the-mortality",
  title: "On the Mortality",
  sections: [
    { title: "I", paragraphs: ["Beloved brethren.", "That the just lives by faith."] },
    { title: "II", paragraphs: ["A second paragraph."], n: 2, pivotal: true },
  ],
  tags: ["cyprian", "plague"],
};

const record = (extra: Partial<PackageRecord> = {}): PackageRecord => ({
  type: "saint_writing",
  ref_id: "cyprian-of-carthage/on-the-mortality",
  title: "On the Mortality",
  key: "cyprian-of-carthage",
  json: JSON.stringify(obj),
  ...extra,
});

describe("searchBodyFor", () => {
  it("reproduces what the packager used to ship", () => {
    const legacy = legacyFlatten(obj).join(" ").toLowerCase();
    expect(searchBodyFor(record())).toBe(legacy);
  });

  it("indexes the body text, not just the title", () => {
    const body = searchBodyFor(record());
    expect(body).toContain("that the just lives by faith");
    expect(body).toContain("plague");
  });

  it("is lowercased, so the LIKE index matches how it is queried", () => {
    expect(searchBodyFor(record())).toBe(searchBodyFor(record()).toLowerCase());
  });

  it("still honours a `search` field, so older packages import unchanged", () => {
    const withSearch = record({ search: "A Pre Built Body" });
    expect(searchBodyFor(withSearch)).toBe("a pre built body");
  });

  it("falls back to the title rather than throwing on unparseable json", () => {
    const broken = record({ json: "{not json" });
    expect(searchBodyFor(broken)).toBe("on the mortality");
  });

  it("does not change the package checksum, because search was never in it", () => {
    // This is the property that makes dropping the field safe. If someone
    // adds `search` to canonicalRecords, every shipped package's sha256
    // changes and this fails loudly.
    const withSearch = canonicalRecords([record({ search: "anything at all" })]);
    const without = canonicalRecords([record()]);
    expect(withSearch).toBe(without);
  });
});
