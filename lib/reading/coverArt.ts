import { isCarried } from "@/lib/media/carried";
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
  // November's saints (1.9, docs/1.9-build/notes/november-saints.md): page
  // icons settled on 2026-11-10, on the books of their Lives. The others of
  // the month keep the plate until a picture of each is settled.
  "paul-the-confessor": bundled("paul-the-confessor.jpg", 26),
  "varlaam-of-khutyn": bundled("varlaam-of-khutyn.jpg", 36),
  // November's Lives in Alban Butler's words (released 2026-11-10): their
  // saints' icons, settled with full rights rows, on the books. St. Marcian
  // has no icon, and his book keeps the plate.
  "joannicius-the-great": bundled("joannicius-the-great.jpg", 25),
  "menas-of-egypt": bundled("menas-of-egypt.jpg", 27),
  "nilus-of-sinai": bundled("nilus-of-sinai.jpg", 25),
  "catherine-of-alexandria": bundled("catherine-of-alexandria.jpg", 32),
  "james-the-persian": bundled("james-the-persian.jpg", 45),
  "stephen-the-new": bundled("stephen-the-new.jpg", 25),
  "john-the-merciful": bundled("john-the-merciful.jpg", 18),
  // December's saints (1.9, docs/1.9-build/notes/december-saints.md): the two
  // older pages whose icons the owner supplied with full permission
  // (lib/saints/iconRights.ts), on the books of their Lives.
  "peter-of-moscow": bundled("peter-of-moscow.jpg", 36),
  "stephen-the-protomartyr": bundled("stephen-the-protomartyr.jpg", 29),
  // Push 2: the second half of the month's icons, on their books.
  "gregory-the-wonderworker": bundled("gregory-the-wonderworker.jpg", 34),
  "clement-of-rome": bundled("clement-of-rome.jpg", 31),
  "peter-of-alexandria": bundled("peter-of-alexandria.jpg", 54),
  "prophet-obadiah": bundled("prophet-obadiah.jpg", 29),
  "michael-of-tver": bundled("michael-of-tver.jpg", 25),
  "alexander-nevsky": bundled("alexander-nevsky.jpg", 34),
  "innocent-of-irkutsk": bundled("innocent-of-irkutsk.jpg", 31),
  "barlaam-and-josaphat": bundled("barlaam-and-josaphat.jpg", 35),
  // Push 2b: the icons placed with the house tool (2026-11-10), on their
  // books. The five prophets are cut from their read-aloud covers and the
  // Martyrs of Nicomedia from History's miniature; the rest are from
  // Wikimedia Commons. St Anastasia and St Sebastian wear the quiet pictures
  // of call 30, the owner's word of 2026-11-11 ("rec for all"), and St
  // Anysia and the Ten Martyrs of Crete a detail of their own pictures that
  // shows them and not their deaths (build 93 note 12).
  "prophet-nahum": bundled("prophet-nahum.jpg", 27),
  "prophet-habakkuk": bundled("prophet-habakkuk.jpg", 22),
  "prophet-zephaniah": bundled("prophet-zephaniah.jpg", 24),
  "prophet-haggai": bundled("prophet-haggai.jpg", 20),
  "prophet-daniel": bundled("prophet-daniel.jpg", 21),
  "ambrose-of-milan": bundled("ambrose-of-milan.jpg", 30),
  "martyrs-of-nicomedia": bundled("martyrs-of-nicomedia.v3.jpg", 45),
  "melania-the-younger": bundled("melania-the-younger.jpg", 27),
  "sosthenes-apollos-cephas-and-tychicus": bundled("sosthenes-apollos-cephas-and-tychicus.jpg", 15),
  "anastasia-the-pharmakolytria": bundled("anastasia-the-pharmakolytria.jpg", 20),
  "barbara-the-great-martyr": bundled("barbara-the-great-martyr.jpg", 22),
  "boniface-of-tarsus": bundled("boniface-of-tarsus.jpg", 16),
  chrysogonus: bundled("chrysogonus.jpg", 25),
  "eugenia-of-rome": bundled("eugenia-of-rome.jpg", 25),
  "juliana-of-nicomedia": bundled("juliana-of-nicomedia.jpg", 24),
  "lucia-of-syracuse": bundled("lucia-of-syracuse.jpg", 30),
  "marcellus-of-the-unsleeping-ones": bundled("marcellus-of-the-unsleeping-ones.jpg", 28),
  "philemon-apollonius-and-arrianus": bundled("philemon-apollonius-and-arrianus.jpg", 15),
  "sabbas-the-sanctified": bundled("sabbas-the-sanctified.jpg", 25),
  "sebastian-and-companions": bundled("sebastian-and-companions.jpg", 28),
  "theodore-the-branded": bundled("theodore-the-branded.jpg", 25),
  "thyrsus-leucius-and-callinicus": bundled("thyrsus-leucius-and-callinicus.jpg", 13),
  "anysia-of-thessaloniki": bundled("anysia-of-thessaloniki.v2.jpg", 30),
  "ten-martyrs-of-crete": bundled("ten-martyrs-of-crete.v2.jpg", 25),
  // November's, dressed with build 93 note 18 (2026-11-11): the panel of the
  // three martyrs, whole.
  "gurias-samonas-and-habib": bundled("gurias-samonas-and-habib.jpg", 30),
  // St John of Kronstadt's photograph of 1890, on his My Life in Christ (the
  // arbiter's word under build 93 note 12).
  "john-of-kronstadt": bundled("john-of-kronstadt.jpg", 25),
  // St John of Shanghai's photograph, first printed in Tianjin in 1939, on
  // his Life (the arbiter's word of 2026-11-11; its freedom is shown in its
  // row in lib/saints/iconRights.ts).
  "john-of-shanghai": bundled("john-of-shanghai.jpg", 30),

  // 1.9, build 90 note 3: St Memnon, who hosted the Third Council, his face on
  // its page from Commons' unmarked copy of the fresco at Dionysiou (his
  // answer of 2026-11-10; lib/saints/iconRights.ts). Carried, so it shows
  // with no signal; too small a picture for a streamed portrait.
  "memnon-of-ephesus": bundled("memnon-of-ephesus.v3.jpg", 37),
  // Build 93 note 12 (Updates 2, 2026-11-11): two saints' settled page icons
  // on their books, carried, so they show with no signal. St Isaac's
  // miniature of 1802, kept whole with its painted border; St Papias's
  // woodcut of 1493, in place of the Apostle John's icon, which his book wore
  // while no picture of him had passed (WORK_ART).
  "isaac-the-syrian": bundled("isaac-the-syrian.v2.jpg", 39),
  "papias-of-hierapolis": bundled("papias-of-hierapolis.v2.jpg", 35),
  // January's saints (1.9, push 2): their settled page icons on their books.
  "philip-of-moscow": bundled("philip-of-moscow.jpg", 15),
  "sylvester-of-rome": bundled("sylvester-of-rome.jpg", 18),
  "prophet-malachi": bundled("prophet-malachi.jpg", 18),
  "apostle-timothy": bundled("apostle-timothy.jpg", 18),
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
 *    eve of Ephesus;
 *  - and a saint of the text who already has a cover (the owner's "ok to
 *    all" to the research's four): the Apostle Philip for his daughter St
 *    Hermione, St Pachomius for St Isidora of his Tabenna, St John
 *    Chrysostom for St Olympias, his deaconess, and the Apostle John for St
 *    Papias, his hearer, until St Papias's own woodcut was settled (build 93
 *    note 12, COVER_ART);
 *  - and a Desert Father of the book (the owner's "all recs", 2026-11-10):
 *    St Moses the Ethiopian, Desert Father of Scetis, for St John Cassian's
 *    Conferences, which open in Scetis with the two conferences of Abbot
 *    Moses; and St Pachomius for his Institutes, whose first books set out
 *    the dress and the rule of the monks of Egypt, and whose fourth tells of
 *    the Tabennesiots, St Pachomius's monasteries (build 90 note 5, his "All
 *    recommendations. Start." of 2026-11-10). Both are icons the app carries,
 *    verified in lib/saints/iconRights.ts, so both show with no signal and in
 *    a build that talks to an older website: St Moses is the fresco of 1547
 *    at Dionysiou (until note 5 the Conferences wore the Anger door's
 *    Novgorod icon, a file the 1.8 website does not have, so a plate in
 *    build 90; the door keeps it). St John Cassian's own carried icon is
 *    unverified, so neither book wears it. St Symeon's and St Irenaeus's
 *    books keep the plate: no picture passed for them (St Isaac's wears his
 *    own icon since build 93 note 12).
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
  "john-cassian/conferences": bundled("moses-the-black.v2.jpg", 27),
  "john-cassian/institutes": COVER_ART["pachomius-the-great"],
  // Build 93 note 18 ("every work wears a picture", 2026-11-11): November's
  // books whose saints have no picture yet wear, by the same rule, a saint of
  // their own text who has one, or a council's picture for one of its Fathers.
  // The Apostle Paul for the two books of names, which come from his letters
  // (Romans 16, 2 Timothy 4); St John Chrysostom for St Proclus, whose Life
  // tells of John's deposition and the bringing home of his relics; St
  // Athanasius for St Frumentius, whom he made bishop and whose story he tells
  // in his Apology; the Apostle John for St Victorinus's On the Creation of
  // the World, which reads his Gospel and his Apocalypse; and the council of
  // 381 for St Amphilochius, one of its Fathers. Each stays the book's alone.
  "erastus-olympas-rodion-sosipater-quartus-and-tertius/their-names-in-scripture": COVER_ART["apostle-paul"],
  "patrobas-hermas-linus-gaius-and-philologus/their-names-in-scripture": COVER_ART["apostle-paul"],
  "proclus-of-constantinople/life-of-proclus": COVER_ART["john-chrysostom"],
  "frumentius-of-axum/life-of-frumentius": COVER_ART["athanasius-the-great"],
  "victorinus-of-pettau/on-the-creation-of-the-world": COVER_ART["apostle-john"],
  "amphilochius-of-iconium/life-of-amphilochius": COUNCIL_COVERS["first-constantinople"],
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
  // A picture the apps carry as well (lib/media/carried.ts) is the bundle's own.
  return art.kind === "streamed" && native && !isCarried(art.file) ? `${SITE_URL}${art.file}` : art.file;
}
