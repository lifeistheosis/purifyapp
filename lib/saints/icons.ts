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
  "St. Paisios the Athonite": "/saints/icons/paisios-the-athonite.jpg",
  "St. Paisios": "/saints/icons/paisios-the-athonite.jpg",
  "Elder Paisios": "/saints/icons/paisios-the-athonite.jpg",

  // v2.5: Apostle Paul, Mary of Egypt, Nicholas the Wonderworker.
  "Holy Apostle Paul": "/saints/icons/apostle-paul.jpg",
  "St. Paul the Apostle": "/saints/icons/apostle-paul.jpg",
  "Apostle Paul": "/saints/icons/apostle-paul.jpg",
  "St. Paul": "/saints/icons/apostle-paul.jpg",
  "Holy Apostle Peter": "/saints/icons/apostle-peter.jpg",
  "St. Peter the Apostle": "/saints/icons/apostle-peter.jpg",
  "Apostle Peter": "/saints/icons/apostle-peter.jpg",
  "St. Peter": "/saints/icons/apostle-peter.jpg",
  "Holy Apostle and Evangelist Matthew": "/saints/icons/apostle-matthew.jpg",
  "Holy Apostle Matthew": "/saints/icons/apostle-matthew.jpg",
  "Apostle Matthew": "/saints/icons/apostle-matthew.jpg",
  "St. Matthew the Evangelist": "/saints/icons/apostle-matthew.jpg",
  "St. Matthew": "/saints/icons/apostle-matthew.jpg",
  "Holy Apostle and Evangelist John": "/saints/icons/apostle-john.jpg",
  "Holy Apostle John": "/saints/icons/apostle-john.jpg",
  "Apostle John": "/saints/icons/apostle-john.jpg",
  "St. John the Theologian": "/saints/icons/apostle-john.jpg",
  "St. John the Evangelist": "/saints/icons/apostle-john.jpg",
  "Holy Apostle Thomas": "/saints/icons/apostle-thomas.jpg",
  "Apostle Thomas": "/saints/icons/apostle-thomas.jpg",
  "St. Thomas the Apostle": "/saints/icons/apostle-thomas.jpg",
  "St. Thomas": "/saints/icons/apostle-thomas.jpg",
  "St. Mary of Egypt": "/saints/icons/mary-of-egypt.jpg",
  "St. Mary": "/saints/icons/mary-of-egypt.jpg",
  "St. Nicholas the Wonderworker": "/saints/icons/nicholas-the-wonderworker.jpg",
  "St. Nicholas of Myra": "/saints/icons/nicholas-the-wonderworker.jpg",
  "St. Nicholas": "/saints/icons/nicholas-the-wonderworker.jpg",

  // Other Fathers cited in commentary cards but not in the registry yet.
  "St. Cyprian of Carthage": "/saints/icons/cyprian-of-carthage.jpg",
  "St. Cyprian": "/saints/icons/cyprian-of-carthage.jpg",
  "St. Gregory of Nyssa": "/saints/icons/gregory-of-nyssa.jpg",
  "St. Jerome": "/saints/icons/jerome.jpg",
};

export function authorIcon(author: string): string | null {
  return AUTHOR_ICONS[author] ?? null;
}
