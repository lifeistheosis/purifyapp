import type { HistoryEventMeta } from "@/lib/history/events";

/**
 * A local council's own picture (1.9, build 97 note 4; his word, 2026-11-14
 * about 16:02 UTC: "please ensure every photo is accounted for and not missed
 * in the councils section (even the local synods and book covers)").
 *
 * The seven's pictures are their History events' (lib/councils/page.ts,
 * councilEvent), and no local council has an event. A local council whose own
 * picture has been found, opened, cut and checked is here instead, in
 * History's shape and History's folder (/history/media/ on the website;
 * scripts/history-media.mjs makes its AVIF and its preview), and
 * councilPicture draws it where it draws the seven's: the head of its page,
 * the windows its books are cut from, its shelf's backdrop and Theology's
 * door. Its credit is printed where History's are, at the foot of its page,
 * and a CC BY or CC BY-SA photograph's maker is named on the Credits page too
 * (lib/credits/photos.ts), as St Victorinus's photograph is.
 * docs/licensing/HISTORY_MEDIA.md records where each came from. His rule of
 * 2026-11-13: a council's plate takes its real picture where one is allowed,
 * and is dropped where not; lib/councils/__tests__/everyCouncilAPicture.test.ts
 * names every local council still without one.
 *
 * As History's pictures are, and as a local council's Fathers' faces are, these
 * are the website's: the apps carry the seven's pictures alone, at his yes
 * (lib/media/carried.ts), and ask the website for these. With no signal the
 * head keeps its blurred preview under the name
 * (components/councils/CouncilHero.tsx).
 *
 * Both found so far are the north wall of the Church of the Nativity in
 * Bethlehem, where the mosaicists of 1169 set the local councils' decisions in
 * gold, each council a church with its name above and its words beneath.
 * Two panels are whole there now, Antioch's and Sardica's.
 */
export type CouncilOwnPicture = Omit<NonNullable<HistoryEventMeta["media"]>, "gallery"> & {
  /** For a CC BY or CC BY-SA photograph: the photographer, as the file's page asks to be credited. */
  credit?: string;
};

export const COUNCIL_PICTURES: Readonly<Record<string, CouncilOwnPicture>> = {
  // The panel's words name the synod of Antioch in Syria of thirty-three
  // bishops, before the first council, against Paul of Samosata, who called
  // Christ a mere man: the council of 268, not that of 341. Cut from the
  // whole wall's photograph, the panel alone, at the photograph's own pixels.
  "antioch-268": {
    hero: "/history/media/council-of-antioch-268.v1.jpg",
    shape: "wide",
    width: 838,
    height: 470,
    alt: "The mosaic of the Council of Antioch in the Church of the Nativity, Bethlehem: a domed church between two towers, a cross in its arch, and beneath it the council's Greek words against Paul of Samosata",
    work: "The Council of Antioch against Paul of Samosata, wall mosaic in the Church of the Nativity, Bethlehem",
    artist: "The mosaicists of 1169, photographed by Thaler Tamas",
    workDate: "1169",
    source: "File:Church of the Nativity (Bethlehem) FotoThalerTamas9.jpg",
    license: "CC BY-SA 4.0",
    credit: "Thaler Tamas",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Nativity_(Bethlehem)_FotoThalerTamas9.jpg",
  },
  // "+ΣΑΡΔΙΚΗ" above, and beneath the words of the holy synod at Sardica,
  // held because of the Arians, which restored Athanasius of Alexandria and
  // Paul of Constantinople to their own thrones. Cut above the plaster where
  // the panel's last line is lost, and below the band of leaves over it.
  sardica: {
    hero: "/history/media/council-of-sardica.v1.jpg",
    shape: "wide",
    width: 1280,
    height: 735,
    alt: "The mosaic of the Council of Sardica in the Church of the Nativity, Bethlehem: a domed church between two towers, a cross in its arch, and the council's Greek words beneath its name",
    work: "The Council of Sardica, wall mosaic in the Church of the Nativity, Bethlehem",
    artist: "The mosaicists of 1169, photographed by Thaler Tamas",
    workDate: "1169",
    source: "File:Church of the Nativity (Bethlehem) FotoThalerTamas8.jpg",
    license: "CC BY-SA 4.0",
    credit: "Thaler Tamas",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Nativity_(Bethlehem)_FotoThalerTamas8.jpg",
  },
};
