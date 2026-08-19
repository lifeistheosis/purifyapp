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
  "Holy Apostle Andrew": "/saints/icons/apostle-andrew.jpg",
  "Apostle Andrew": "/saints/icons/apostle-andrew.jpg",
  "St. Andrew the First-Called": "/saints/icons/apostle-andrew.jpg",
  "St. Andrew": "/saints/icons/apostle-andrew.jpg",
  "Holy Apostle James, Son of Zebedee": "/saints/icons/apostle-james-zebedee.jpg",
  "St. James the Son of Zebedee": "/saints/icons/apostle-james-zebedee.jpg",
  "St. James the Greater": "/saints/icons/apostle-james-zebedee.jpg",
  "Holy Apostle Philip": "/saints/icons/apostle-philip.jpg",
  "Apostle Philip": "/saints/icons/apostle-philip.jpg",
  "St. Philip the Apostle": "/saints/icons/apostle-philip.jpg",
  "St. Philip": "/saints/icons/apostle-philip.jpg",
  "Holy Apostle Jude": "/saints/icons/apostle-jude.jpg",
  "Apostle Jude": "/saints/icons/apostle-jude.jpg",
  "St. Jude Thaddaeus": "/saints/icons/apostle-jude.jpg",
  "St. Jude": "/saints/icons/apostle-jude.jpg",
  "St. Thaddaeus": "/saints/icons/apostle-jude.jpg",
  "Holy Apostle Simon the Zealot": "/saints/icons/apostle-simon-zealot.jpg",
  "Apostle Simon the Zealot": "/saints/icons/apostle-simon-zealot.jpg",
  "St. Simon the Zealot": "/saints/icons/apostle-simon-zealot.jpg",
  "Simon the Canaanite": "/saints/icons/apostle-simon-zealot.jpg",
  "Holy Apostle Matthias": "/saints/icons/apostle-matthias.jpg",
  "Apostle Matthias": "/saints/icons/apostle-matthias.jpg",
  "St. Matthias the Apostle": "/saints/icons/apostle-matthias.jpg",
  "St. Matthias": "/saints/icons/apostle-matthias.jpg",
  "Holy Apostle Bartholomew": "/saints/icons/apostle-bartholomew.jpg",
  "Apostle Bartholomew": "/saints/icons/apostle-bartholomew.jpg",
  "St. Bartholomew the Apostle": "/saints/icons/apostle-bartholomew.jpg",
  "St. Bartholomew": "/saints/icons/apostle-bartholomew.jpg",
  "St. Nathanael": "/saints/icons/apostle-bartholomew.jpg",
  "Holy Apostle James, Son of Alphaeus": "/saints/icons/apostle-james-alphaeus.jpg",
  "St. James the Son of Alphaeus": "/saints/icons/apostle-james-alphaeus.jpg",
  "St. James of Alphaeus": "/saints/icons/apostle-james-alphaeus.jpg",
  "St. James the Less": "/saints/icons/apostle-james-alphaeus.jpg",
  "St. Polycarp of Smyrna": "/saints/icons/polycarp-of-smyrna.jpg",
  "St. Polycarp": "/saints/icons/polycarp-of-smyrna.jpg",
  "St. Papias of Hierapolis": "/saints/icons/papias-of-hierapolis.jpg",
  "St. Papias": "/saints/icons/papias-of-hierapolis.jpg",
  "St. Prochorus": "/saints/icons/prochorus-the-deacon.jpg",
  "St. Prochorus the Deacon": "/saints/icons/prochorus-the-deacon.jpg",
  "St. Anianus of Alexandria": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Anianus": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Hananias of Alexandria": "/saints/icons/anianus-of-alexandria.jpg",
  "St. Theophylact of Ohrid": "/saints/icons/theophylact-of-ohrid.jpg",
  "St. Theophylact of Bulgaria": "/saints/icons/theophylact-of-ohrid.jpg",
  "St. Theophylact": "/saints/icons/theophylact-of-ohrid.jpg",
  "Blessed Theophylact": "/saints/icons/theophylact-of-ohrid.jpg",
  "St. Mary of Egypt": "/saints/icons/mary-of-egypt.jpg",
  "St. Mary": "/saints/icons/mary-of-egypt.jpg",
  "St. Mary Magdalene": "/saints/icons/mary-magdalene.jpg",
  "Mary Magdalene": "/saints/icons/mary-magdalene.jpg",
  "St. Mary the Myrrhbearer": "/saints/icons/mary-magdalene.jpg",
  "St. Nicholas the Wonderworker": "/saints/icons/nicholas-the-wonderworker.jpg",
  "St. Nicholas of Myra": "/saints/icons/nicholas-the-wonderworker.jpg",
  "St. Nicholas": "/saints/icons/nicholas-the-wonderworker.jpg",

  // Other Fathers cited in commentary cards but not in the registry yet.
  "St. Gregory of Nyssa": "/saints/icons/gregory-of-nyssa.jpg",

  // Cyprian's file now exists and carries a full rights record in
  // lib/saints/iconRights.ts: permission from the owner, inspected 2026-08-12,
  // alt text written. The note that used to sit here asked for exactly this,
  // "restore the mapping in the same commit that adds the file", so it is
  // restored. Jerome's file still does not exist and stays unmapped.
  "St. Cyprian of Carthage": "/saints/icons/cyprian-of-carthage.jpg",
  "St. Cyprian": "/saints/icons/cyprian-of-carthage.jpg",

  // DELIBERATELY NOT MAPPED, though the files are on disk:
  // leo-the-great.jpg and john-cassian.jpg. Both records in iconRights.ts read
  // "No source, licence or attribution recorded ... Not yet opened and
  // inspected." Two of the first four icons ever inspected turned out to be
  // watermarked works by living iconographers, rendering in production, which
  // is why that registry exists. Mapping an uninspected file would put it in
  // front of every reader of a Leo or Cassian note. Map them in the commit that
  // records their rights, not before.
};

export function authorIcon(author: string): string | null {
  return AUTHOR_ICONS[author] ?? null;
}
