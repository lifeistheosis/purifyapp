import type { Side } from "@/lib/councils/map";

/**
 * Where each event of the timeline happened (1.8, the owner's yes of
 * 2026-10-24). Each place is set by hand from the event's own account; an
 * event that spans an empire is placed where it began (the Great Persecution
 * at Nicomedia, where the first edict was posted).
 *
 * 1.9, the owner of 2026-11-06: "make sure when it says like where the event
 * happened, it shows the actual location on where it happened. So, for
 * example, like Alaska, that should be in Alaska." The map now runs to
 * Alaska and America (data/maps/church-history.json), so nothing is listed
 * "beyond" it, and every place below was read again against its event's own
 * text: the 2018 schism was declared by the Russian Synod meeting in Minsk,
 * not Moscow; the Alaskan mission went to Kodiak; the OCA's center was New
 * York. An event that happened in two places names the second in `with`: it
 * lights there too, with a thread to the first (the Phanar's decisions and
 * Minsk's answer; Valaam, which chose the monks, and Kodiak).
 *
 * Its own file, with no imports but a type, so the councils' map can read it
 * too (lib/councils/map.ts: a council's own account among the events is the
 * one that happened where the council met) without the two maps importing
 * each other. lib/history/map.ts draws it.
 */
export type EventPlace = { place: string; lat: number; lon: number; side?: Side };

const CONSTANTINOPLE: EventPlace = { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 };
const MOSCOW: EventPlace = { place: "Moscow", lat: 55.756, lon: 37.617 };
const ANTIOCH: EventPlace = { place: "Antioch", lat: 36.202, lon: 36.16 };
const ATHOS: EventPlace = { place: "Mount Athos", lat: 40.157, lon: 24.326 };

export const EVENT_PLACES: Readonly<Record<string, (EventPlace & { with?: EventPlace[] }) | "beyond">> = {
  pentecost: { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  "council-of-jerusalem": { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  // The journeys set out from Antioch (Acts 13:1-3) and came back to it.
  "missions-of-apostle-paul": { place: "Antioch", lat: 36.202, lon: 36.16 },
  "neronian-persecution": { place: "Rome", lat: 41.902, lon: 12.496 },
  // Taken from Antioch to die in Rome.
  "martyrdom-of-ignatius": { place: "Rome", lat: 41.902, lon: 12.496, with: [ANTIOCH] },
  "martyrdom-of-polycarp": { place: "Smyrna", side: "left", lat: 38.419, lon: 27.129 },
  "apologies-of-justin-martyr": { place: "Rome", lat: 41.902, lon: 12.496 },
  "irenaeus-against-heresies": { place: "Lyons", lat: 45.764, lon: 4.836 },
  // The Inner Mountain by the Red Sea, where St Anthony's monastery stands.
  "anthony-and-the-desert": { place: "The desert of Egypt", lat: 28.924, lon: 32.348 },
  // Above its mark: Nicaea's mark is the same one, between Constantinople's
  // name and Gangra's.
  "great-persecution": { place: "Nicomedia", side: "up", lat: 40.767, lon: 29.917 },
  "edict-of-milan": { place: "Milan", lat: 45.464, lon: 9.19 },
  "arian-controversy-begins": { place: "Alexandria", lat: 31.2, lon: 29.918 },
  "first-council-of-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "foundation-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "first-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "chrysostom-at-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "council-of-ephesus": { place: "Ephesus", side: "left", lat: 37.941, lon: 27.342 },
  "council-of-chalcedon": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // Egypt, Syria and Armenia: placed at Alexandria, the see of the first to part.
  "non-chalcedonian-estrangement": { place: "Alexandria", lat: 31.2, lon: 29.918 },
  "second-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "third-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "first-iconoclasm": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "second-council-of-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "second-iconoclasm": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "triumph-of-orthodoxy": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // Velehrad, the seat of St Methodius in Great Moravia.
  "mission-of-cyril-and-methodius": { place: "Great Moravia", lat: 49.104, lon: 17.394 },
  "photian-council": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "conversion-of-kievan-rus": { place: "Kyiv", lat: 50.45, lon: 30.523 },
  "great-schism-1054": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "sack-of-constantinople-1204": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // The councils of 1341 to 1351 met in the city; the Mountain was the cause.
  "hesychast-councils": { ...CONSTANTINOPLE, with: [ATHOS] },
  // Opened at Ferrara in 1438, moved to Florence in 1439.
  "council-of-florence": { place: "Florence", lat: 43.77, lon: 11.256, with: [{ place: "Ferrara", lat: 44.838, lon: 11.62 }] },
  "fall-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "moscow-patriarchate-established": { place: "Moscow", lat: 55.756, lon: 37.617 },
  // Gathered on the Holy Mountain, printed in Venice.
  "philokalia-published": { ...ATHOS, with: [{ place: "Venice", lat: 45.438, lon: 12.335 }] },
  // "Valaam chose the missionaries"; they went to Kodiak, where the mission was.
  "alaska-mission": { place: "Kodiak", lat: 57.79, lon: -152.407, with: [{ place: "Valaam", lat: 61.384, lon: 30.946 }] },
  "bolshevik-persecution": { place: "Moscow", lat: 55.756, lon: 37.617 },
  // The Metropolia's center "long since moved to New York"; the tomos came from Moscow.
  "oca-autocephaly": { place: "New York", lat: 40.713, lon: -74.006, with: [MOSCOW] },
  // The council in Kyiv; the tomos from the Phanar.
  "ukrainian-autocephaly": { place: "Kyiv", lat: 50.45, lon: 30.523, with: [CONSTANTINOPLE] },
  // The Phanar's synod of 9 to 11 October 2018, then "On October 15, 2018,
  // meeting in Minsk, the Holy Synod of the Russian Orthodox Church declared ...
  // communion with it broken."
  "moscow-constantinople-schism-2018": { place: "Minsk", lat: 53.904, lon: 27.562, with: [CONSTANTINOPLE] },
};
