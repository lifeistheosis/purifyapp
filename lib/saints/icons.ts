// Maps a Father's author-name (as it appears in commentary JSON)
// to an icon image in /public/icons/saints/.
// Add new entries here when new authors get icons.

export const AUTHOR_ICONS: Record<string, string> = {
  "St. John Chrysostom": "/icons/saints/john-chrysostom.jpg",
  "St. Athanasius the Great": "/icons/saints/athanasius-the-great.jpg",
  "St. Athanasius": "/icons/saints/athanasius-the-great.jpg",
  // The three Cappadocians — drop matching JPG/PNG files into the same folder
  // to make these icons render in commentary blocks.
  "St. Basil the Great": "/icons/saints/basil-the-great.jpg",
  "St. Gregory the Theologian": "/icons/saints/gregory-the-theologian.jpg",
  "St. Gregory of Nazianzus": "/icons/saints/gregory-the-theologian.jpg",
  "St. Gregory of Nyssa": "/icons/saints/gregory-of-nyssa.jpg",
  // Major early commentators on the Gospel of John (v1.5).
  // Drop matching JPG/PNG files into the same folder to make these render.
  "St. Augustine of Hippo": "/icons/saints/augustine-of-hippo.jpg",
  "St. Augustine": "/icons/saints/augustine-of-hippo.jpg",
  "Blessed Augustine of Hippo": "/icons/saints/augustine-of-hippo.jpg",
  "St. Cyril of Alexandria": "/icons/saints/cyril-of-alexandria.jpg",
  "St. Irenaeus of Lyons": "/icons/saints/irenaeus-of-lyons.jpg",
  "St. Irenaeus": "/icons/saints/irenaeus-of-lyons.jpg",
};

export function authorIcon(author: string): string | null {
  return AUTHOR_ICONS[author] ?? null;
}
