// Shared test fixtures for the local-first content layer.

import {
  buildManifest,
  canonicalRecords,
  sha256Hex,
  type ContentPackage,
  type PackageRecord,
} from "../manifest";

export const SAMPLE_RECORDS: PackageRecord[] = [
  {
    type: "saint",
    ref_id: "john-chrysostom",
    title: "St. John Chrysostom",
    key: null,
    json: JSON.stringify({
      slug: "john-chrysostom",
      name: "St. John Chrysostom",
      life: "Archbishop of Constantinople, the golden-mouthed.",
    }),
    search: "john chrysostom golden mouth homilies constantinople",
  },
  {
    type: "prayer",
    ref_id: "morning",
    title: "Morning Rule",
    key: "daily",
    json: JSON.stringify({
      id: "morning",
      title: "Morning Rule",
      prayers: [{ id: "heavenly-king", text: "O Heavenly King, Comforter" }],
    }),
    search: "o heavenly king comforter morning rule",
  },
  {
    type: "bible_chapter",
    ref_id: "john/1",
    title: "John 1",
    key: "john",
    json: JSON.stringify({
      book: "john",
      name: "John",
      chapter: 1,
      verses: [{ n: 1, text: "In the beginning was the Word" }],
      source: "kjv-pd",
    }),
    search: "in the beginning was the word",
  },
  {
    type: "council",
    ref_id: "first-nicaea/symbol",
    title: "The Symbol of Nicaea",
    key: null,
    json: JSON.stringify({ title: "The Symbol of Nicaea", year: 325 }),
    search: "nicaea symbol creed homoousios",
  },
  {
    type: "feast",
    ref_id: "feast-11-13-chrysostom",
    title: "St. John Chrysostom",
    key: "11-13",
    json: JSON.stringify({
      date: "11-13",
      name: "St. John Chrysostom",
      kind: "feast",
      saintSlug: "john-chrysostom",
    }),
    search: "chrysostom feast",
  },
];

export async function buildSamplePackage(
  version = "test-1",
  records: PackageRecord[] = SAMPLE_RECORDS,
): Promise<ContentPackage> {
  const sha = await sha256Hex(canonicalRecords(records));
  return { manifest: buildManifest(version, records, sha), records };
}
