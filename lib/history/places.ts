import type { Side } from "@/lib/councils/map";

/**
 * Where each event of the timeline happened (1.8, the owner's yes of
 * 2026-10-24). Each place is set by hand from the event's own account; an
 * event that spans an empire is placed where it began (the Great Persecution
 * at Nicomedia, where the first edict was posted). Alaska and America are off
 * the map, so they are listed under it ("beyond").
 *
 * Its own file, with no imports but a type, so the councils' map can read it
 * too (lib/councils/map.ts: a council's own account among the events is the
 * one that happened where the council met) without the two maps importing
 * each other. lib/history/map.ts draws it.
 */
export const EVENT_PLACES: Readonly<Record<string, { place: string; lat: number; lon: number; side?: Side } | "beyond">> = {
  pentecost: { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  "council-of-jerusalem": { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  // The journeys set out from Antioch (Acts 13:1-3) and came back to it.
  "missions-of-apostle-paul": { place: "Antioch", lat: 36.202, lon: 36.16 },
  "neronian-persecution": { place: "Rome", lat: 41.902, lon: 12.496 },
  // Taken from Antioch to die in Rome.
  "martyrdom-of-ignatius": { place: "Rome", lat: 41.902, lon: 12.496 },
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
  // The councils of 1341 to 1351 met in the city.
  "hesychast-councils": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "council-of-florence": { place: "Florence", lat: 43.77, lon: 11.256 },
  "fall-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "moscow-patriarchate-established": { place: "Moscow", lat: 55.756, lon: 37.617 },
  // Gathered on the Holy Mountain, printed in Venice: the Mountain's.
  "philokalia-published": { place: "Mount Athos", lat: 40.157, lon: 24.326 },
  "alaska-mission": "beyond",
  "bolshevik-persecution": { place: "Moscow", lat: 55.756, lon: 37.617 },
  "oca-autocephaly": "beyond",
  "ukrainian-autocephaly": { place: "Kyiv", lat: 50.45, lon: 30.523 },
  "moscow-constantinople-schism-2018": { place: "Moscow", lat: 55.756, lon: 37.617 },
};
