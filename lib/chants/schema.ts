import { z } from "zod";

import { CHANT_KINDS, CHANT_TRADITIONS } from "./types";

/**
 * The chant data file, checked. lib/chants/registry.server.ts reads every
 * file in data/chants through this, so a file that does not match fails the
 * build (and lib/chants/__tests__/data.test.ts fails first) instead of
 * drawing a broken page. Kept beside lib/chants/types.ts, which it mirrors.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a YYYY-MM-DD date");
const monthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "an MM-DD date");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "a slug of lowercase words and hyphens");
const seconds = z.number().min(0);

const line = z
  .object({
    text: z.string().trim().min(1),
    translit: z.string().trim().min(1).optional(),
    en: z.string().trim().min(1).optional(),
  })
  .strict();

const window = z.union([
  z.object({ paschal: z.tuple([z.number().int(), z.number().int()]) }).strict(),
  z.object({ fixed: z.tuple([monthDay, monthDay]) }).strict(),
]);

const variant = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "a short id of lowercase letters, digits and hyphens"),
    language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, "a BCP-47 language tag"),
    label: z.string().trim().min(1),
    tradition: z.enum(CHANT_TRADITIONS),
    setting: z.string().trim().min(1).optional(),
    performer: z.string().trim().min(1).nullable(),
    audio: z.object({ src: z.string().startsWith("/audio/"), durationSec: seconds.positive() }).strict(),
    timing: z.string().startsWith("/audio/").optional(),
    preview: z.object({ from: seconds, to: seconds }).strict(),
    underPrayer: z.boolean().optional(),
    rtl: z.boolean().optional(),
    lines: z.array(line).min(1),
    wordsSource: z.string().trim().min(1),
    translation: z
      .object({ kind: z.enum(["parallel", "public-domain", "ours"]), title: z.string().trim().min(1) })
      .strict()
      .optional(),
  })
  .strict();

export const chantSchema = z
  .object({
    slug,
    key: z.string().regex(/^[a-z][A-Za-z0-9]*$/, "a camelCase key"),
    title: z.string().trim().min(1),
    originalTitle: z.string().trim().min(1).optional(),
    kind: z.enum(CHANT_KINDS),
    tone: z.number().int().min(1).max(8).optional(),
    psalm: z.number().int().min(1).max(151).optional(),
    when: z
      .object({
        anytime: z.boolean().optional(),
        windows: z.array(window).optional(),
        services: z.array(z.string().trim().min(1)).optional(),
      })
      .strict(),
    about: z
      .object({
        what: z.string().trim().min(1),
        history: z.string().trim().min(1),
        when: z.string().trim().min(1),
      })
      .strict(),
    aboutKeys: z
      .object({ what: z.string().optional(), history: z.string().optional(), when: z.string().optional() })
      .strict()
      .optional(),
    sources: z.array(
      z
        .object({
          title: z.string().trim().min(1),
          author: z.string().optional(),
          year: z.string().optional(),
          url: z.url().optional(),
          note: z.string().optional(),
        })
        .strict(),
    ),
    review: z.object({ status: z.enum(["awaiting-clergy-review", "reviewed"]), since: day }).strict(),
    related: z.array(slug).optional(),
    cover: z
      .object({ src: z.string().startsWith("/"), alt: z.string().trim().min(1), credit: z.string().trim().min(1) })
      .strict()
      .optional(),
    status: z.enum(["live", "hidden"]),
    addedOn: day,
    variants: z.array(variant).min(1),
  })
  .strict();

export const timingSchema = z
  .object({
    v: z.literal(1),
    durationSec: seconds.positive(),
    lines: z.array(z.object({ at: seconds, end: seconds, text: z.string().min(1) }).strict()).min(1),
  })
  .strict();

export const liveListSchema = z
  .object({
    v: z.literal(1),
    live: z.array(z.string()),
    pulled: z.array(z.string()),
  })
  .strict();
