/**
 * Registry of the Byzantine theme icons used by the prayer section.
 * Saint icons live in lib/saints/saints.ts; this is the separate vocabulary
 * for the major iconographic types (Christ, Theotokos, Pentecost, etc.).
 *
 * All sources are public domain (or PD-Art: faithful photographic
 * reproductions of 2D PD works of art). Attribution lives on this row so
 * the /support page can later surface a credits panel.
 */

export type PrayerIcon = {
  slug: string;
  title: string;
  alt: string;
  /** Path under public/. Served as a static asset. */
  src: string;
  /** Plain-text attribution: era, location, why it's public-domain. */
  source: string;
};

export const PRAYER_ICONS: Record<string, PrayerIcon> = {
  "christ-pantocrator": {
    slug: "christ-pantocrator",
    title: "Christ Pantocrator",
    alt: "Christ Pantocrator — the icon of Christ as Almighty",
    src: "/icons/prayer/christ-pantocrator.jpg",
    source:
      "Saint Catherine's Monastery, Sinai, 6th c. Encaustic on panel. Public domain.",
  },
  anastasis: {
    slug: "anastasis",
    title: "The Anastasis",
    alt: "Anastasis — Christ raising Adam and Eve from the tombs",
    src: "/icons/prayer/anastasis.jpg",
    source:
      "Russian icon, c. 1500. Public domain (PD-Art).",
  },
  "theotokos-of-vladimir": {
    slug: "theotokos-of-vladimir",
    title: "The Vladimir Theotokos",
    alt: "The Theotokos of Vladimir — the Mother of God",
    src: "/icons/prayer/theotokos-of-vladimir.jpg",
    source:
      "Constantinople, early 12th c. Tretyakov Gallery, Moscow. Public domain.",
  },
  "christ-enthroned": {
    slug: "christ-enthroned",
    title: "Christ Enthroned",
    alt: "Christ enthroned in glory",
    src: "/icons/prayer/christ-enthroned.jpg",
    source: "Russian icon, 13th c. Tretyakov Gallery, Moscow. Public domain.",
  },
  pentecost: {
    slug: "pentecost",
    title: "The Pentecost",
    alt: "The Descent of the Holy Spirit on the Apostles",
    src: "/icons/prayer/pentecost.jpg",
    source: "Russian icon, 1420s. Sergiev Posad. Public domain.",
  },
  crucifixion: {
    slug: "crucifixion",
    title: "The Crucifixion",
    alt: "The Crucifixion of Christ",
    src: "/icons/prayer/crucifixion.jpg",
    source:
      "Sinai icon, 12th c. Saint Catherine's Monastery. Public domain.",
  },
  entombment: {
    slug: "entombment",
    title: "The Entombment of Christ",
    alt: "The Entombment of Christ — the Lord laid in the tomb",
    src: "/icons/prayer/entombment.jpg",
    source: "Russian icon, 15th c. Tretyakov Gallery, Moscow. Public domain.",
  },
  "three-hierarchs": {
    slug: "three-hierarchs",
    title: "The Three Hierarchs",
    alt: "Saints Basil, Gregory the Theologian, and John Chrysostom",
    src: "/icons/prayer/three-hierarchs.jpg",
    source:
      "Novgorod icon, before 1917. Public domain (PD-Russia-expired).",
  },
};

export function getPrayerIcon(slug: string): PrayerIcon | null {
  return PRAYER_ICONS[slug] ?? null;
}
