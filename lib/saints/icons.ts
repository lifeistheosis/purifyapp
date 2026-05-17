// Maps a Father's author-name (as it appears in commentary JSON)
// to an icon image in /public/saints/icons/.
// Add new entries here when new authors get icons.

export const AUTHOR_ICONS: Record<string, string> = {
  // The Cappadocians + Alexandrians + Antiochenes.
  "St. John Chrysostom": "/saints/icons/john-chrysostom.jpg",
  "St. Athanasius the Great": "/saints/icons/athanasius-the-great.jpg",
  "St. Athanasius": "/saints/icons/athanasius-the-great.jpg",
  "St. Basil the Great": "/saints/icons/basil-the-great.jpg",
  "St. Basil": "/saints/icons/basil-the-great.jpg",
  "St. Gregory the Theologian": "/saints/icons/gregory-theologian.jpg",
  "St. Gregory of Nazianzus": "/saints/icons/gregory-theologian.jpg",

  // Latin + Alexandrian + Gaulish on John.
  "St. Augustine of Hippo": "/saints/icons/augustine-of-hippo.jpg",
  "St. Augustine": "/saints/icons/augustine-of-hippo.jpg",
  "Blessed Augustine of Hippo": "/saints/icons/augustine-of-hippo.jpg",
  "St. Cyril of Alexandria": "/saints/icons/cyril-of-alexandria.jpg",
  "St. Cyril": "/saints/icons/cyril-of-alexandria.jpg",
  "St. Irenaeus of Lyons": "/saints/icons/irenaeus-of-lyons.jpg",
  "St. Irenaeus": "/saints/icons/irenaeus-of-lyons.jpg",

  // Damascene + apostolic + late Byzantine + Russian.
  "St. John of Damascus": "/saints/icons/john-of-damascus.jpg",
  "St. John Damascene": "/saints/icons/john-of-damascus.jpg",
  "St. Ignatius of Antioch": "/saints/icons/ignatius-of-antioch.jpg",
  "St. Ignatius": "/saints/icons/ignatius-of-antioch.jpg",
  "St. Maximus the Confessor": "/saints/icons/maximus-the-confessor.jpg",
  "St. Maximus": "/saints/icons/maximus-the-confessor.jpg",
  "St. Symeon the New Theologian": "/saints/icons/symeon-the-new-theologian.jpg",
  "St. Symeon": "/saints/icons/symeon-the-new-theologian.jpg",
  "St. Seraphim of Sarov": "/saints/icons/seraphim-of-sarov.jpg",
  "St. Seraphim": "/saints/icons/seraphim-of-sarov.jpg",
};

export function authorIcon(author: string): string | null {
  return AUTHOR_ICONS[author] ?? null;
}
