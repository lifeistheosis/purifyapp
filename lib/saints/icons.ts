// Maps a Father's author-name (as it appears in commentary JSON)
// to an icon image in /public/saints/icons/.
// Add new entries here when new authors get icons.

export const AUTHOR_ICONS: Record<string, string> = {
  // The Cappadocians + Alexandrians + Antiochenes.
  "St. John Chrysostom": "/saints/icons/john-chrysostom.v2.jpg",
  "St. Athanasius the Great": "/saints/icons/athanasius-the-great.v3.jpg",
  "St. Athanasius": "/saints/icons/athanasius-the-great.v3.jpg",
  "St. Basil the Great": "/saints/icons/basil-the-great.jpg",
  "St. Basil": "/saints/icons/basil-the-great.jpg",
  "St. Gregory the Theologian": "/saints/icons/gregory-theologian.v2.jpg",
  "St. Gregory of Nazianzus": "/saints/icons/gregory-theologian.v2.jpg",

  // Latin + Alexandrian + Gaulish on John.
  "St. Augustine of Hippo": "/saints/icons/augustine-of-hippo.v2.jpg",
  "St. Augustine": "/saints/icons/augustine-of-hippo.v2.jpg",
  "Blessed Augustine of Hippo": "/saints/icons/augustine-of-hippo.v2.jpg",
  "St. Cyril of Alexandria": "/saints/icons/cyril-of-alexandria.v2.jpg",
  "St. Cyril": "/saints/icons/cyril-of-alexandria.v2.jpg",
  "St. Irenaeus of Lyons": "/saints/icons/irenaeus-of-lyons.jpg",
  "St. Irenaeus": "/saints/icons/irenaeus-of-lyons.jpg",

  // Damascene + apostolic + late Byzantine + Russian.
  "St. John of Damascus": "/saints/icons/john-of-damascus.v2.jpg",
  "St. John Damascene": "/saints/icons/john-of-damascus.v2.jpg",
  "St. Ignatius of Antioch": "/saints/icons/ignatius-of-antioch.v2.jpg",
  "St. Ignatius": "/saints/icons/ignatius-of-antioch.v2.jpg",
  "St. Maximus the Confessor": "/saints/icons/maximus-the-confessor.v2.jpg",
  "St. Maximus": "/saints/icons/maximus-the-confessor.v2.jpg",
  "St. Seraphim of Sarov": "/saints/icons/seraphim-of-sarov.v2.jpg",
  "St. Seraphim": "/saints/icons/seraphim-of-sarov.v2.jpg",

  // v2.5: Apostle Paul, Mary of Egypt, Nicholas the Wonderworker.
  "Holy Apostle Paul": "/saints/icons/apostle-paul.v2.jpg",
  "St. Paul the Apostle": "/saints/icons/apostle-paul.v2.jpg",
  "Apostle Paul": "/saints/icons/apostle-paul.v2.jpg",
  "St. Paul": "/saints/icons/apostle-paul.v2.jpg",
  "Holy Apostle Peter": "/saints/icons/apostle-peter.v2.jpg",
  "St. Peter the Apostle": "/saints/icons/apostle-peter.v2.jpg",
  "Apostle Peter": "/saints/icons/apostle-peter.v2.jpg",
  "St. Peter": "/saints/icons/apostle-peter.v2.jpg",
  "Holy Apostle and Evangelist Matthew": "/saints/icons/apostle-matthew.v2.jpg",
  "Holy Apostle Matthew": "/saints/icons/apostle-matthew.v2.jpg",
  "Apostle Matthew": "/saints/icons/apostle-matthew.v2.jpg",
  "St. Matthew the Evangelist": "/saints/icons/apostle-matthew.v2.jpg",
  "St. Matthew": "/saints/icons/apostle-matthew.v2.jpg",
  "Holy Apostle and Evangelist John": "/saints/icons/apostle-john.v2.jpg",
  "Holy Apostle John": "/saints/icons/apostle-john.v2.jpg",
  "Apostle John": "/saints/icons/apostle-john.v2.jpg",
  "St. John the Theologian": "/saints/icons/apostle-john.v2.jpg",
  "St. John the Evangelist": "/saints/icons/apostle-john.v2.jpg",
  "Holy Apostle Andrew": "/saints/icons/apostle-andrew.v2.jpg",
  "Apostle Andrew": "/saints/icons/apostle-andrew.v2.jpg",
  "St. Andrew the First-Called": "/saints/icons/apostle-andrew.v2.jpg",
  "St. Andrew": "/saints/icons/apostle-andrew.v2.jpg",
  "Holy Apostle James, Son of Zebedee": "/saints/icons/apostle-james-zebedee.v2.jpg",
  "St. James the Son of Zebedee": "/saints/icons/apostle-james-zebedee.v2.jpg",
  "St. James the Greater": "/saints/icons/apostle-james-zebedee.v2.jpg",
  "Holy Apostle Philip": "/saints/icons/apostle-philip.v2.jpg",
  "Apostle Philip": "/saints/icons/apostle-philip.v2.jpg",
  "St. Philip the Apostle": "/saints/icons/apostle-philip.v2.jpg",
  "St. Philip": "/saints/icons/apostle-philip.v2.jpg",
  "Holy Apostle Jude": "/saints/icons/apostle-jude.v2.jpg",
  "Apostle Jude": "/saints/icons/apostle-jude.v2.jpg",
  "St. Jude Thaddaeus": "/saints/icons/apostle-jude.v2.jpg",
  "St. Jude": "/saints/icons/apostle-jude.v2.jpg",
  "St. Thaddaeus": "/saints/icons/apostle-jude.v2.jpg",
  "Holy Apostle Simon the Zealot": "/saints/icons/apostle-simon-zealot.v2.jpg",
  "Apostle Simon the Zealot": "/saints/icons/apostle-simon-zealot.v2.jpg",
  "St. Simon the Zealot": "/saints/icons/apostle-simon-zealot.v2.jpg",
  "Simon the Canaanite": "/saints/icons/apostle-simon-zealot.v2.jpg",
  "Holy Apostle Matthias": "/saints/icons/apostle-matthias.v2.jpg",
  "Apostle Matthias": "/saints/icons/apostle-matthias.v2.jpg",
  "St. Matthias the Apostle": "/saints/icons/apostle-matthias.v2.jpg",
  "St. Matthias": "/saints/icons/apostle-matthias.v2.jpg",
  "Holy Apostle Bartholomew": "/saints/icons/apostle-bartholomew.v2.jpg",
  "Apostle Bartholomew": "/saints/icons/apostle-bartholomew.v2.jpg",
  "St. Bartholomew the Apostle": "/saints/icons/apostle-bartholomew.v2.jpg",
  "St. Bartholomew": "/saints/icons/apostle-bartholomew.v2.jpg",
  "St. Nathanael": "/saints/icons/apostle-bartholomew.v2.jpg",
  "Holy Apostle James, Son of Alphaeus": "/saints/icons/apostle-james-alphaeus.v2.jpg",
  "St. James the Son of Alphaeus": "/saints/icons/apostle-james-alphaeus.v2.jpg",
  "St. James of Alphaeus": "/saints/icons/apostle-james-alphaeus.v2.jpg",
  "St. James the Less": "/saints/icons/apostle-james-alphaeus.v2.jpg",
  "St. Polycarp of Smyrna": "/saints/icons/polycarp-of-smyrna.v2.jpg",
  "St. Polycarp": "/saints/icons/polycarp-of-smyrna.v2.jpg",
  "St. Prochorus": "/saints/icons/prochorus-the-deacon.v2.jpg",
  "St. Prochorus the Deacon": "/saints/icons/prochorus-the-deacon.v2.jpg",
  "St. Anianus of Alexandria": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Anianus": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Hananias of Alexandria": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Mary of Egypt": "/saints/icons/mary-of-egypt.v2.jpg",
  "St. Mary": "/saints/icons/mary-of-egypt.v2.jpg",
  "St. Mary Magdalene": "/saints/icons/mary-magdalene.v2.jpg",
  "Mary Magdalene": "/saints/icons/mary-magdalene.v2.jpg",
  "St. Mary the Myrrhbearer": "/saints/icons/mary-magdalene.v2.jpg",

  // Other Fathers cited in commentary cards but not in the registry yet.
  "St. Gregory of Nyssa": "/saints/icons/gregory-of-nyssa.v3.jpg",

  // Cyprian's file now exists and carries a full rights record in
  // lib/saints/iconRights.ts: permission from the owner, inspected 2026-08-12,
  // alt text written. The note that used to sit here asked for exactly this,
  // "restore the mapping in the same commit that adds the file", so it is
  // restored. Jerome's file still does not exist and stays unmapped.
  "St. Cyprian of Carthage": "/saints/icons/cyprian-of-carthage.jpg",
  "St. Cyprian": "/saints/icons/cyprian-of-carthage.jpg",

  // St Leo's icon is mapped now that its rights are recorded (2026-11-11: a
  // Greek fresco, lib/saints/iconRights.ts), as the note that stood here asked:
  // "Map them in the commit that records their rights, not before."
  "St. Leo the Great": "/saints/icons/leo-the-great.v2.jpg",

  // St John Cassian's too, now that his icon's rights are recorded (2026-11-11:
  // an 18th-century Russian icon). Two of the first four icons ever inspected
  // were watermarked works by living iconographers, rendering in production,
  // which is why a file is mapped only in the commit that records its rights.
  "St. John Cassian": "/saints/icons/john-cassian.v2.jpg",
};

export function authorIcon(author: string): string | null {
  return AUTHOR_ICONS[author] ?? null;
}
