// The Study Collections file, checked with zod.
//
// Apart from ./collections.ts on purpose. That module ships in the client
// bundle, and until 1.6 it held this schema too, so zod came with it: 263 KB
// of validation library on every cold open of the app, to read a file of a
// few rows that is checked before it is ever committed. The app reads the
// file with the small check in ./collections.ts (readCollection); this is
// the full check, for the tests and for anything that parses a file handed
// to it. lib/catechism/__tests__/collections.test.ts holds the two to the
// same answer on every row it tries.

import { z } from "zod";

import { isCollectionTheme } from "@/lib/reader/readingModes";

import { COLLECTION_SLUG, type Collection } from "./collections";

const EM_DASH = String.fromCharCode(0x2014);

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    // The editorial rule, enforced at the file like the bank's schema does.
    .refine((s) => !s.includes(EM_DASH), "contains an em dash");

export const collectionSchema = z
  .object({
    slug: z.string().regex(COLLECTION_SLUG, "slug: lowercase words joined by hyphens").max(64),
    name: text(80),
    description: text(400),
    tag: z.string().regex(COLLECTION_SLUG, "tag: a lowercase slug, as on the questions").max(64),
    theme_id: z
      .string()
      .refine(isCollectionTheme, "theme_id: not a collection palette in READING_THEMES"),
    sort_order: z.number().int().min(0).max(10_000),
  })
  .strict();

export type ParseCollectionsResult =
  | { ok: true; collections: Collection[] }
  | { ok: false; errors: string[] };

/**
 * The whole file or nothing, the rule scripts/quiz-import.ts applies to the
 * bank. Every row against the schema, every slug unique, every theme_id a
 * collection palette the registry knows (which lib/reader/__tests__/prepaint
 * .test.ts in turn holds against the pre-paint list and the CSS token
 * blocks).
 */
export function parseCollections(input: unknown): ParseCollectionsResult {
  if (!Array.isArray(input)) return { ok: false, errors: ["not an array"] };
  const errors: string[] = [];
  const out: Collection[] = [];
  const slugs = new Set<string>();
  input.forEach((row, i) => {
    const r = collectionSchema.safeParse(row);
    if (!r.success) {
      for (const issue of r.error.issues) {
        errors.push(`row ${i}: ${issue.path.join(".") || "row"}: ${issue.message}`);
      }
      return;
    }
    if (slugs.has(r.data.slug)) {
      errors.push(`row ${i}: duplicate slug ${r.data.slug}`);
      return;
    }
    slugs.add(r.data.slug);
    out.push(r.data);
  });
  if (errors.length) return { ok: false, errors };
  out.sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
  return { ok: true, collections: out };
}
