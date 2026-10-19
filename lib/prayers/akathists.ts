// Akathist registry: one corpus so far, room for more. Each akathist is a
// Rule (kind "akathist") whose stanzas carry their own refrains: "Hail, O
// Bride Unwedded!" (or its other wordings) closes the first kontakion and the
// ikoi, "Alleluia" the other kontakia, so no refrain is set for the whole
// hymn. The prayer page names each stanza by the Church's own word for it in
// the reader's language (prayers.akathist.kontakion, prayers.akathist.ikos).

import type { Rule } from "@/lib/prayers/types";
import theotokos from "@/data/prayers/akathists/theotokos.json";

export type AkathistMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  feastDays?: string[];
  intro: string;
  estimatedMinutes: number;
  stanzas: number;
};

const REGISTRY: { slug: string; data: Rule }[] = [
  { slug: "theotokos", data: theotokos as Rule },
];

export function listAkathists(): AkathistMeta[] {
  return REGISTRY.map(({ slug, data }) => ({
    slug,
    title: data.title,
    subtitle: data.subtitle,
    intro: data.intro,
    estimatedMinutes: data.estimatedMinutes,
    stanzas: data.prayers.length,
  }));
}

export function getAkathist(slug: string): Rule | null {
  return REGISTRY.find((r) => r.slug === slug)?.data ?? null;
}

/** The akathist's name in the catalogs, in the reader's language. */
export function akathistTitleKey(slug: string): string {
  return `prayers.akathist.${slug}.title`;
}
