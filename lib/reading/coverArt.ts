import { SITE_URL } from "@/lib/site";
import { SAINT_HEROES } from "@/lib/saints/heroes";

import { AUTHOR_COVERS, COUNCIL_COVERS, WORK_COVERS } from "./authorCovers";

/**
 * The picture on a book's cover (1.7, the owner's note 18): the icon of the
 * saint the book is by, or about (lib/reading/entries.ts, coverSubject).
 *
 * Only a settled picture reaches a cover. Covers multiply the reach of every
 * icon, and sixty-one of the icons the app carries have never been opened or
 * sourced (lib/saints/iconRights.ts, UNVERIFIED_ICONS). So a cover's picture
 * is one of two kinds:
 *
 *  - "streamed": a public-domain icon from Wikimedia Commons, read on its own
 *    page, opened and cut at its own pixels (the owner's yes of 2026-10-16),
 *    four wide by five tall, about 600 by 750. It lives on the website under
 *    /covers/authors/ and the apps ask the website for it
 *    (lib/media/streamed.ts), so the apps carry none. Ten are the saints'
 *    page pictures (lib/saints/heroes.ts), made smaller: the same icon on a
 *    saint's page and on his books. With no signal the cover is its plate
 *    and title (components/covers/WorkCover.tsx).
 *  - "bundled": an icon the app already carries whose rights are settled in
 *    lib/saints/iconRights.ts (a verified or a permission row). It works with
 *    no signal.
 *
 * Any other saint's books have the plate with the title alone, until a
 * picture of him is settled. `focusY` is where the face sits in the picture,
 * from its top, for the cover's window. Each streamed row carries the same
 * seven rights fields as iconRights.ts; docs/licensing/COVER_ICONS.md says
 * where each came from and which were turned down.
 * lib/reading/__tests__/coverArt.test.ts holds rows and files together.
 */
export type StreamedArt = {
  kind: "streamed";
  /** /covers/authors/<subject>.v<n>.jpg on the website. */
  file: string;
  width: number;
  height: number;
  focusY: number;
  /** What the picture shows, written while looking at the cut. */
  alt: string;
  work: string;
  artist: string;
  workDate: string;
  /** The Commons file. */
  source: string;
  /** As the file's Commons page states it. */
  license: string;
  /**
   * For a CC BY or CC BY-SA photograph (1.9): the photographer, as the
   * file's page asks to be credited, named on the Photo credits page
   * (lib/credits/photos.ts). Required with such a licence.
   */
  credit?: string;
  evidenceUrl: string;
  /** The day the cut was opened and looked at. */
  inspectedOn: string;
};

export type BundledArt = {
  kind: "bundled";
  /** /saints/icons/<file>, settled in lib/saints/iconRights.ts. */
  file: string;
  focusY: number;
};

export type CoverArt = StreamedArt | BundledArt;

/** A saint's page picture, made a cover: the same icon, at a cover's size. */
function fromHero(slug: string, focusY: number): StreamedArt {
  const hero = SAINT_HEROES[slug];
  return {
    kind: "streamed",
    file: `/covers/authors/${slug}.v1.jpg`,
    width: 600,
    height: 750,
    focusY,
    alt: hero.alt,
    work: hero.work,
    artist: hero.artist,
    workDate: hero.workDate,
    source: hero.source,
    license: hero.license,
    evidenceUrl: hero.evidenceUrl,
    inspectedOn: "2026-10-16",
  };
}

const bundled = (file: string, focusY: number): BundledArt => ({ kind: "bundled", file: `/saints/icons/${file}`, focusY });

export const COVER_ART: Readonly<Record<string, CoverArt>> = {
  theotokos: fromHero("theotokos", 24),
  "john-chrysostom": fromHero("john-chrysostom", 20),
  "basil-the-great": fromHero("basil-the-great", 20),
  "gregory-theologian": fromHero("gregory-theologian", 20),
  "nicholas-the-wonderworker": fromHero("nicholas-the-wonderworker", 20),
  "apostle-peter": fromHero("apostle-peter", 20),
  "apostle-paul": fromHero("apostle-paul", 20),
  "apostle-john": fromHero("apostle-john", 20),
  "apostle-andrew": fromHero("apostle-andrew", 20),
  "archangel-michael": fromHero("archangel-michael", 20),

  // Settled in lib/saints/iconRights.ts, and carried by the app.
  "john-the-baptist": bundled("john-the-baptist.jpg", 24),
  "cyprian-of-carthage": bundled("cyprian-of-carthage.jpg", 34),
  "lawrence-the-archdeacon": bundled("lawrence-the-archdeacon.jpg", 20),
  "sixtus-of-rome": bundled("sixtus-of-rome.jpg", 28),
  "pimen-the-great": bundled("pimen-the-great.jpg", 20),
  "herman-of-alaska": bundled("herman-of-alaska.jpg", 18),
  "tikhon-of-zadonsk": bundled("tikhon-of-zadonsk.jpg", 20),
  "thaddeus-of-edessa": bundled("thaddeus-of-edessa.jpg", 22),
  "titus-of-crete": bundled("titus-of-crete.jpg", 20),
  "euplus-of-catania": bundled("euplus-of-catania.jpg", 22),
  "maccabean-martyrs": bundled("maccabean-martyrs.jpg", 50),
  "seven-sleepers-of-ephesus": bundled("seven-sleepers-of-ephesus.jpg", 55),
  "pachomius-the-great": bundled("pachomius-the-great.jpg", 44),
  "ammon-of-nitria": bundled("ammon-of-nitria.jpg", 34),
  "hilarion-the-great": bundled("hilarion-the-great.jpg", 30),
  "macarius-the-great": bundled("macarius-the-great.jpg", 42),
  // 1.9, build 89 note 3: three saints whose books were on the plate while
  // their settled page icons (2026-10-31) were not yet on them. Small, as the
  // owner was told: the app carries them at a page icon's size.
  "cyril-of-jerusalem": bundled("cyril-of-jerusalem.v2.jpg", 26),
  "photius-the-great": bundled("photius-the-great.v2.jpg", 24),
  "justinian-the-great": bundled("justinian-the-great.v2.jpg", 26),

  // From Wikimedia Commons for the covers (lib/reading/authorCovers.ts).
  ...AUTHOR_COVERS,
};

/**
 * A book's own picture, ahead of its saint's (lib/reading/cards.ts), where
 * the picture is not of the person whose book it is, so it is keyed by the
 * work and never stands for the saint elsewhere (a saint's face on a
 * council's page, the You tab: coverArtFor):
 *
 *  - the anonymous Way of a Pilgrim's own (WORK_COVERS);
 *  - 1.9, build 89 note 3: the icon of the council a book belongs to, for an
 *    author with no picture (COUNCIL_COVERS): St Alexander's letter against
 *    Arius, the council of Nicaea that followed it; St Nectarius, chosen
 *    bishop at the council of 381; St Celestine's letter, read at Ephesus;
 *    St John Cassian's On the Incarnation, written against Nestorius on the
 *    eve of Ephesus (his other books wait for a picture of him);
 *  - and a saint of the text who already has a cover (the owner's "ok to
 *    all" to the research's four): the Apostle Philip for his daughter St
 *    Hermione, St Pachomius for St Isidora of his Tabenna, St John
 *    Chrysostom for St Olympias, his deaconess, and the Apostle John for St
 *    Papias, his hearer.
 */
export const WORK_ART: Readonly<Record<string, CoverArt>> = {
  ...WORK_COVERS,
  "alexander-of-alexandria/encyclical-against-arius": COUNCIL_COVERS["first-nicaea"],
  "nectarius-of-constantinople/the-senator-bishop": COUNCIL_COVERS["first-constantinople"],
  "celestine-of-rome/letter-to-the-synod-of-ephesus": COUNCIL_COVERS.ephesus,
  "john-cassian/on-the-incarnation": COUNCIL_COVERS["ephesus-ferapontov"],
  "hermione-of-ephesus/life-of-hermione": COVER_ART["apostle-philip"],
  "isidora-of-tabenna/life-of-isidora": COVER_ART["pachomius-the-great"],
  "olympias-the-deaconess/life-of-olympias": COVER_ART["john-chrysostom"],
  "papias-of-hierapolis/the-living-voice": COVER_ART["apostle-john"],
};

/** The settled picture for a book's saint, or null for the plate alone. */
export function coverArtFor(subject: string | null): CoverArt | null {
  if (!subject) return null;
  return COVER_ART[subject] ?? null;
}

/**
 * The address to load, decided by the build (`native` is IS_STATIC_EXPORT,
 * which only a server file can read): a streamed picture is the website's own
 * file on the website and the website's address in the apps; a bundled icon
 * is the app's own. lib/media/streamed.ts gives every streamed file the same
 * address, asked of the device; this is the server's twin, as
 * lib/saints/heroes.ts has, and the test holds the two together.
 */
export function coverSrc(art: CoverArt, native: boolean): string {
  return art.kind === "streamed" && native ? `${SITE_URL}${art.file}` : art.file;
}
