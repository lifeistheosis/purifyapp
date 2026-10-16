import { SITE_URL } from "@/lib/site";

/**
 * A saint's picture at the top of his page on a phone (1.7, the owner's note
 * 19 of 2026-10-16): "the icon full width at the top", the name over the
 * foot of it, and a slim bar with the name once it scrolls away.
 *
 * A phone's full width wants a picture about a thousand pixels across, and
 * the icons the app carries (public/saints/icons) are 420px tall at most: one
 * stretched across a phone is the "super blurry photo" the owner already sent
 * back once (feedback on You, 2026-10-15). So a saint has a hero only when a
 * public-domain icon of him was found at that size, opened, and cut at its
 * own pixels; every other saint keeps his icon at its own size on the dark
 * plate (components/saints/SaintHero.tsx), never enlarged.
 *
 * THE PICTURES. Eleven are boards of one set, the deesis row of the
 * iconostasis of the Dormition cathedral of the Kirillo-Belozersky monastery
 * (1497), the set the read-aloud covers' prophets and apostles come from
 * (lib/readAloud/covers.ts), so a saint's page and the player read as one
 * family. The Mother of God is the Vladimir icon. Each was read on its own
 * Commons page, opened and looked at before it was cut and again after: the
 * right saint, read from the icon's inscription or from the deesis list the
 * file names; the whole head and halo; nothing outside the painted field (no
 * raised border, no photo background, no red board edge); and no pixel
 * enlarged. scripts/fetch-saint-heroes.mjs holds each cut and
 * docs/licensing/SAINT_HEROES.md each source, licence and rejection.
 *
 * WHERE THEY ARE. On the website, under /covers/saints/, and never inside
 * the apps: /covers/ is the streamed folder the read-aloud covers made
 * (lib/media/streamed.ts), set aside by the native build and asked of the
 * website in the apps. With no signal a page keeps the bundled icon on its
 * plate. A file's name carries its version: a new picture is a new name.
 *
 * lib/saints/__tests__/heroes.test.ts holds the rows to the files and the
 * files to the rows.
 */
export type SaintHero = {
  /** The picture on the website: /covers/saints/<slug>.v<n>.jpg, four wide by five tall. */
  file: string;
  /** Its pixels, which the page reserves the box for. */
  width: number;
  height: number;
  /** What the picture shows, written while looking at the cut. Not shown: the page names the saint. */
  alt: string;
  /** The icon it is cut from. */
  work: string;
  artist: string;
  workDate: string;
  /** The Commons file. */
  source: string;
  /** As the file's Commons page states it. */
  license: string;
  /** The Commons page the licence was read on. */
  evidenceUrl: string;
  /** The day the cut was opened and looked at. */
  inspectedOn: string;
};

const commons = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURI(title.replace(/ /g, "_"))}`;

/** One board of the Kirillo-Belozersky deesis row. */
function kirillo(
  slug: string,
  board: string,
  figure: string,
  size: [number, number],
  alt: string,
): SaintHero {
  const source = `File:Kirillo-Belozersky iconostasis ${board}.jpg`;
  return {
    file: `/covers/saints/${slug}.v1.jpg`,
    width: size[0],
    height: size[1],
    alt,
    work: `Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: ${figure}`,
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source,
    license: "Public domain",
    evidenceUrl: commons(source),
    inspectedOn: "2026-10-16",
  };
}

export const SAINT_HEROES: Readonly<Record<string, SaintHero>> = {
  theotokos: {
    file: "/covers/saints/theotokos.v1.jpg",
    width: 1088,
    height: 1360,
    alt: "The Mother of God in a dark mantle edged with gold, a star on her veil, her cheek against the Child's as he reaches round her neck, on a worn gold ground.",
    work: "The Theotokos of Vladimir, the Tretyakov Gallery, Moscow",
    artist: "Anonymous",
    workDate: "12th century",
    source: "File:Vladimirskaja ikona Božiej Materi.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Vladimirskaja ikona Božiej Materi.jpg"),
    inspectedOn: "2026-10-16",
  },
  "john-chrysostom": kirillo(
    "john-chrysostom",
    "16 - John Chrysostom",
    "St John Chrysostom",
    [960, 1200],
    "A dark-haired bishop with a short beard, his head bowed, in a white omophorion with brown crosses over a robe patterned with black crosses, holding a jewelled Gospel, his name in red at the top.",
  ),
  "basil-the-great": kirillo(
    "basil-the-great",
    "06 - Basil",
    "St Basil the Great",
    [960, 1200],
    "A bishop with a long, dark, pointed beard, in a white omophorion with black crosses over a robe patterned in red, one hand open and a red jewelled Gospel in the other, his name in red at the top.",
  ),
  // The inscription is on a metal plate that cannot be read. The list the
  // Commons file names as its source (icon-art.info, group 84) gives this
  // row one Gregory, Gregory the Theologian.
  "gregory-theologian": kirillo(
    "gregory-theologian",
    "05 - Gregorius",
    "St Gregory the Theologian",
    [940, 1175],
    "A balding bishop with a broad brown beard, his head bowed, in a robe patterned with black crosses, holding a red jewelled Gospel and one hand open, before an embossed silver ground and a silver halo.",
  ),
  "nicholas-the-wonderworker": kirillo(
    "nicholas-the-wonderworker",
    "17 - Nicholas",
    "St Nicholas the Wonderworker",
    [936, 1170],
    "A bald, white-bearded bishop, his head bowed, in a white omophorion with red crosses over a robe of black crosses, holding a jewelled Gospel and one hand open, before an embossed silver ground and a silver halo.",
  ),
  "apostle-peter": kirillo(
    "apostle-peter",
    "08 - Peter",
    "St Peter the Apostle",
    [968, 1210],
    "The Apostle Peter with curly grey hair and beard, bowing, in a dark blue tunic and an ochre cloak, holding an unrolled scroll written in Slavonic, on a gold ground.",
  ),
  "apostle-paul": kirillo(
    "apostle-paul",
    "14 - Paul",
    "St Paul the Apostle",
    [944, 1180],
    "The Apostle Paul with a high bald forehead and a long dark beard, bowing, in a dark tunic and a grey-brown cloak, holding a red jewelled book, on a gold ground.",
  ),
  "apostle-john": kirillo(
    "apostle-john",
    "07 - John Evangelist",
    "St John the Theologian",
    [976, 1220],
    "The Apostle John, bald with a long white beard, bowing, in a dark green tunic and a red cloak, holding a jewelled Gospel, his name in red at the top left, on a gold ground.",
  ),
  "apostle-andrew": kirillo(
    "apostle-andrew",
    "15 - Andrew",
    "St Andrew the Apostle",
    [980, 1225],
    "The Apostle Andrew with tousled grey-brown hair and beard, bowing, in a blue-green cloak, holding a rolled scroll, his name in red at the top right, on a gold ground.",
  ),
  "archangel-michael": kirillo(
    "archangel-michael",
    "09 - Michael",
    "the Archangel Michael",
    [980, 1225],
    "The Archangel Michael with curly brown hair and a blue ribbon, dark wings behind him, in a red cloak over a jewelled tunic, holding a staff and a sphere marked with the name of Christ.",
  ),
  "saint-george": kirillo(
    "saint-george",
    "19 - George",
    "St George",
    [976, 1220],
    "The young martyr George with curly brown hair, his head bowed, in a red cloak edged with pearls over a dark green tunic, his hands held out, his name in red at the top right, on a gold ground.",
  ),
  "peter-of-moscow": kirillo(
    "peter-of-moscow",
    "18 - Peter of Moscow",
    "St Peter, Metropolitan of Moscow",
    [976, 1220],
    "A grey-bearded metropolitan in a white cowl with a red cross, bowing, his hands held out, in a white omophorion over a robe patterned with green circled crosses, on a gold ground.",
  ),
};

/** The saint's hero, or null when his page keeps the icon on its plate. */
export function saintHero(slug: string): SaintHero | null {
  return SAINT_HEROES[slug] ?? null;
}

/**
 * The address to load, decided by the build: the website's own file on the
 * website, the website's address in the apps (`native` is IS_STATIC_EXPORT,
 * which only a server file can read). Deciding it at build time writes the
 * same address into the page and its payload, so nothing changes between the
 * first paint and hydration, and the picture starts loading with the page.
 *
 * It is the address lib/media/streamed.ts gives every streamed file, written
 * out here because that module asks the device (it reaches a client module)
 * and this one is read on the server; heroes.test.ts holds the two together.
 */
export function heroSrc(hero: SaintHero, native: boolean): string {
  return native ? `${SITE_URL}${hero.file}` : hero.file;
}
