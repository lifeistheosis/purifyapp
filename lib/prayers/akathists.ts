// Akathist registry — currently one corpus, room for more.
// Each akathist is a Rule (akathist kind) with a top-level `refrain`
// the reader uses to fall back to when an individual stanza doesn't
// carry its own refrain field.

import type { Rule } from "@/components/prayers/PrayerRuleReader";
import theotokos from "@/data/prayers/akathists/theotokos.json";

export type AkathistMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  feastDays?: string[];
  intro: string;
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
  }));
}

export function getAkathist(slug: string): Rule | null {
  return REGISTRY.find((r) => r.slug === slug)?.data ?? null;
}
