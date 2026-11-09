// Builds data/maps/history-step-places.json from the decisions below: for each step,
// the exact words that name its place, or why it names none. Run: node scripts/history/build-step-places.mjs
// Each placed step carries the exact words of its text that name the place;
// the build refuses to write if those words are not in the step's text.
import fs from "node:fs";
import path from "node:path";

// The repository: given, or the one this script lives in.
const repo = process.argv[2] ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

// Coordinates: places already in lib/history/places.ts reuse its numbers;
// the rest were checked against sources in this session.
const PLACES = {
  alexandria: { name: "Alexandria", lat: 31.2, lon: 29.918 },
  athens: { name: "Athens", lat: 37.984, lon: 23.728 },
  berestovoye: { name: "Berestovoye", lat: 50.437, lon: 30.555 },
  blachernae: { name: "Blachernae", lat: 41.034, lon: 28.94 },
  chalcedon: { name: "Chalcedon", lat: 40.984, lon: 29.027 },
  constantinople: { name: "Constantinople", lat: 41.008, lon: 28.978 },
  corfu: { name: "Corfu", lat: 39.624, lon: 19.921 },
  ephesus: { name: "Ephesus", lat: 37.941, lon: 27.342 },
  ferrara: { name: "Ferrara", lat: 44.838, lon: 11.62 },
  florence: { name: "Florence", lat: 43.77, lon: 11.256 },
  "golden-horn": { name: "Golden Horn", lat: 41.019, lon: 28.974 },
  "hagia-sophia": { name: "Hagia Sophia", lat: 41.008, lon: 28.98 },
  hieria: { name: "Hieria", lat: 40.969, lon: 29.034 },
  // lib/history/places.ts's own point for the event: "The Inner Mountain by the Red Sea, where St Anthony's monastery stands".
  "inner-mountain": { name: "The inner mountain", lat: 28.924, lon: 32.348 },
  jerusalem: { name: "Jerusalem", lat: 31.778, lon: 35.235 },
  kodiak: { name: "Kodiak", lat: 57.79, lon: -152.407 },
  kyiv: { name: "Kyiv", lat: 50.45, lon: 30.523 },
  lyons: { name: "Lyons", lat: 45.764, lon: 4.836 },
  "milvian-bridge": { name: "Milvian Bridge", lat: 41.936, lon: 12.467 },
  moscow: { name: "Moscow", lat: 55.756, lon: 37.617 },
  nicaea: { name: "Nicaea", lat: 40.429, lon: 29.721 },
  nicomedia: { name: "Nicomedia", lat: 40.767, lon: 29.917 },
  rome: { name: "Rome", lat: 41.902, lon: 12.496 },
  "santa-maria-del-fiore": { name: "Santa Maria del Fiore", lat: 43.773, lon: 11.256 },
  "spruce-island": { name: "Spruce Island", lat: 57.918, lon: -152.41 },
  studios: { name: "Studios", lat: 40.996, lon: 28.929 },
  thessalonica: { name: "Thessalonica", lat: 40.64, lon: 22.935 },
  unalaska: { name: "Unalaska", lat: 53.874, lon: -166.534 },
  varna: { name: "Varna", lat: 43.2, lon: 27.91 },
  venice: { name: "Venice", lat: 45.438, lon: 12.335 },
  zara: { name: "Zara", lat: 44.119, lon: 15.232 },
  // Added 2026-11-09 for the steps of eighteen more events (1.9, PLAN row 20),
  // each read from Wikidata's coordinates for the place that day: Antioch on
  // the Orontes (Q200441), Byzantium (Q12544), Chrysopolis (Q326339, Uskudar),
  // Comana Pontica (Q2140586), Ancient Corinth (Q1363688), Cucusus (Q939677,
  // Goksun), Damascus (Q3766), Flavia Neapolis (Nablus's old city, Q4022315),
  // Milan (Q490), Smyrna (Q35997, Izmir) and Alexandria Troas (Q1393407).
  antioch: { name: "Antioch", lat: 36.2, lon: 36.15 },
  byzantium: { name: "Byzantium", lat: 41.013, lon: 28.98 },
  chrysopolis: { name: "Chrysopolis", lat: 41.017, lon: 29.017 },
  comana: { name: "Comana", lat: 40.357, lon: 36.639 },
  corinth: { name: "Corinth", lat: 37.906, lon: 22.879 },
  cucusus: { name: "Cucusus", lat: 38.017, lon: 36.5 },
  damascus: { name: "Damascus", lat: 33.513, lon: 36.292 },
  "flavia-neapolis": { name: "Flavia Neapolis", lat: 32.218, lon: 35.269 },
  milan: { name: "Milan", lat: 45.467, lon: 9.19 },
  smyrna: { name: "Smyrna", lat: 38.413, lon: 27.138 },
  troas: { name: "Troas", lat: 39.761, lon: 26.153 },
};

const _ = null;
// [key, words of the text that name the place], or null.
const STEPS = {
  "alaska-mission": [
    _, // Valaam only in a title ("Abbot Nazarius of Valaam")
    _, // a journey: Siberia, Irkutsk and Okhotsk
    ["kodiak", "land on Kodiak"],
    _, // regions: Aleutian Islands, Chugach, Kenai shore
    _, // "on the mainland"
    _, // "at Irkutsk": named, but at 104.3 E it is off the history map's outline (box ends at 50 E)
    _,
    ["unalaska", "arrives on Unalaska"],
    ["spruce-island", "dies on Spruce Island"],
    ["kodiak", "glorified at Kodiak"],
  ],
  "anthony-and-the-desert": [
    _, // Egypt, a country
    _,
    _, // "a deserted fort", unnamed
    _, // "the desert"
    ["alexandria", "serves the confessors at Alexandria"],
    ["inner-mountain", "withdraws to the inner mountain near the Red Sea"],
    ["alexandria", "comes down to Alexandria"],
    ["inner-mountain", "dies in the inner mountain"],
    _,
    _, // Antioch only in a name ("Evagrius of Antioch")
  ],
  "bolshevik-persecution": [
    ["moscow", "in the Dormition Cathedral of the Moscow Kremlin"],
    _,
    _, // "Metropolitan Tikhon of Moscow": a title
    _,
    _,
    _, // "Metropolitan Vladimir of Kyiv": a title
    _,
    _, // "Metropolitan Benjamin of Petrograd": a title
    ["moscow", "dies in Moscow"],
    _, // "Metropolitan Peter of Krutitsy": a title
    _,
    _, // "of the Moscow Patriarchate": an institution
  ],
  "conversion-of-kievan-rus": [
    _, // Constantinople is the target of an earlier attack, not the scene
    _,
    _,
    _,
    _, // "prince of Kyiv": a title
    _,
    _,
    _, // "The people of Kyiv ... in the Dnieper": residents and a river
    ["kyiv", "the church of the Mother of God in Kyiv"],
    ["berestovoye", "dies at Berestovoye"],
  ],
  "council-of-chalcedon": [
    ["constantinople", "A synod at Constantinople"],
    _,
    ["ephesus", "The second council of Ephesus"],
    _,
    ["chalcedon", "The council opens at Chalcedon"],
    _,
    _,
    _,
    _,
    _,
  ],
  "council-of-ephesus": [
    _, // "bishop of Constantinople": a title
    _,
    _, // "his Roman synod": an adjective, and a dispatch
    ["alexandria", "A synod at Alexandria"],
    ["ephesus", "The council opens at Ephesus"],
    _,
    _,
    _, // the dissolution has no place; Alexandria is only Cyril's return after it
    _,
  ],
  "council-of-florence": [
    ["lyons", "The Second Council of Lyons"],
    ["thessalonica", "Thessalonica, the empire's second city, falls"],
    _, // "from Basel to Ferrara": two places
    ["constantinople", "sail from Constantinople"],
    ["venice", "lands at Venice"],
    ["ferrara", "The first session at Ferrara"],
    _,
    ["ferrara", "Public sessions at Ferrara"],
    ["florence", "move the council to Florence"],
    _,
    _,
    ["florence", "dies at Florence"],
    _,
    ["santa-maria-del-fiore", "proclaimed in Santa Maria del Fiore"],
    ["constantinople", "reaches Constantinople"],
    ["moscow", "proclaims the union in Moscow"],
    ["jerusalem", "issued at Jerusalem"],
    _, // "St Mark of Ephesus": a name
    ["varna", "destroyed at Varna"],
    _, // Constantinople and Moscow named, neither as the scene
    ["hagia-sophia", "proclaimed in Hagia Sophia"],
    ["constantinople", "Constantinople falls to Mehmed II"],
    _,
    ["constantinople", "A synod at Constantinople"],
  ],
  "fall-of-constantinople": [
    _,
    _, // "on the Bosporus": a strait 30 km long; the spot is not named
    ["hagia-sophia", "celebrated in Hagia Sophia"],
    ["golden-horn", "the mouth of the Golden Horn"],
    _, // "the land walls": a description
    _, // "the walls"
    _, // "the harbour"
    ["golden-horn", "hauled overland into the Golden Horn"],
    _, // two scenes: the walls and Hagia Sophia
    _, // several scenes: the assault, the emperor, the city, Hagia Sophia
    _,
  ],
  "first-council-of-constantinople": [
    ["constantinople", "Theodosius enters Constantinople"],
    _, // "the capital"
    ["constantinople", "bishops meet at Constantinople"],
    _, // "Meletius of Antioch": a name
    _,
    _, // "bishop of Constantinople": a title
    _,
    _,
    _, // Rome is where the letter went, not where the bishops met
  ],
  "great-persecution": [
    ["nicomedia", "The church of Nicomedia is sacked"],
    _,
    _,
    _,
    _, // "in the East"
    _, // "Pamphilus of Caesarea": a name
    ["nicomedia", "issues an edict of toleration at Nicomedia"],
    _,
    ["milvian-bridge", "at the Milvian Bridge"],
    ["nicomedia", "posts at Nicomedia"],
  ],
  "great-schism-1054": [
    _,
    ["rome", "is sung at Rome"],
    _, // two acts: Leo of Ohrid's writing, and the Latin churches of Constantinople closed
    _,
    ["constantinople", "reach Constantinople"],
    ["studios", "At Studios"],
    ["hagia-sophia", "on the altar of Hagia Sophia"],
    _,
    ["constantinople", "sacks Constantinople"],
    _, // "at Lyons and at Florence": two places
    _,
  ],
  "hesychast-councils": [
    ["hagia-sophia", "A council in Hagia Sophia"],
    _,
    _,
    ["constantinople", "Kantakouzenos enters Constantinople"],
    ["blachernae", "The council at Blachernae"],
    _,
  ],
  "mission-of-cyril-and-methodius": [
    ["thessalonica", "born at Thessalonica"],
    _, // the Khazars and Cherson: a journey
    _, // Moravia, a region
    _, // Moravia, a region
    ["rome", "The brothers reach Rome"],
    ["rome", "dies in Rome"],
    _,
    _,
    _,
    _,
    _, // Moravia and Bulgaria, regions
  ],
  "philokalia-published": [
    ["venice", "printed at Venice"],
    _,
    ["moscow", "printed at the Synodal Press in Moscow"],
    _,
    _, // Optina named as the publisher, not as where the book was made
    _,
  ],
  "sack-of-constantinople-1204": [
    _, // Écry: named, but not a well-known place
    _, // "contract with Venice": Venice as the other party
    ["zara", "The crusaders take Zara"],
    ["corfu", "At Corfu the leaders agree"],
    _, // "The city"
    _,
    _,
    _, // "the city"
    _,
    ["hagia-sophia", "crowned emperor in Hagia Sophia"],
    _, // the crimes were at Constantinople; the rebuke's place is not named
    ["constantinople", "recovers Constantinople"],
    ["athens", "In Athens"],
    _,
  ],
  "second-council-of-nicaea": [
    _,
    _,
    ["hieria", "The council of Hieria"],
    _,
    _,
    _, // "patriarch of Constantinople": a title
    ["constantinople", "the Church of the Holy Apostles in Constantinople"],
    ["nicaea", "The council opens at Nicaea"],
    _,
    ["constantinople", "in the Magnaura palace at Constantinople"],
    _,
    _,
  ],
  "triumph-of-orthodoxy": [
    ["nicaea", "The Seventh Ecumenical Council at Nicaea"],
    ["hagia-sophia", "a synod in Hagia Sophia"],
    _,
    _, // "patriarch of Constantinople": a title
    _,
    _,
    ["hagia-sophia", "carried in procession to Hagia Sophia"],
    _,
  ],
  // 2026-11-09: the steps of eighteen more events (1.9, PLAN row 20), each
  // held to its event's own words in docs/1.9-build/thread-steps.json.
  "apologies-of-justin-martyr": [
    _,
    ["flavia-neapolis", "at Flavia Neapolis"],
    ["rome", "the faith at Rome"],
    _,
    ["rome", "to death at Rome"],
    _,
  ],
  "arian-controversy-begins": [
    ["alexandria", "At Alexandria"],
    _,
    _,
    ["alexandria", "to Alexandria"],
    ["nicaea", "at Nicaea"],
  ],
  "chrysostom-at-constantinople": [
    ["antioch", "born at Antioch"],
    ["antioch", "Ordained presbyter at Antioch"],
    ["constantinople", "At Constantinople"],
    ["constantinople", "to Constantinople"],
    ["chalcedon", "near Chalcedon"],
    ["hagia-sophia", "beside Hagia Sophia"],
    ["cucusus", "exile at Cucusus"],
    ["comana", "at Comana"],
  ],
  "edict-of-milan": [
    _,
    ["nicomedia", "issued at Nicomedia"],
    ["milvian-bridge", "at the Milvian Bridge"],
    ["milan", "At Milan"],
    ["nicomedia", "at Nicomedia"],
  ],
  "first-council-of-nicaea": [
    ["alexandria", "At Alexandria"],
    ["alexandria", "to Alexandria"],
    ["nicaea", "opens at Nicaea"],
    _,
    _,
    _,
    _,
  ],
  "first-iconoclasm": [
    ["constantinople", "besiege Constantinople"],
    _,
    _,
    ["damascus", "In Damascus"],
    _,
    ["hieria", "meets at Hieria"],
    _,
    _,
    ["nicaea", "at Nicaea"],
  ],
  "foundation-of-constantinople": [
    ["chrysopolis", "at Chrysopolis"],
    ["byzantium", "At Byzantium"],
    _,
    ["constantinople", "as Constantinople"],
    _,
  ],
  "irenaeus-against-heresies": [
    ["smyrna", "probably at Smyrna"],
    ["lyons", "presbyter at Lyons"],
    ["lyons", "The churches of Lyons"],
    ["lyons", "bishop at Lyons"],
    _,
  ],
  "martyrdom-of-ignatius": [
    _,
    ["smyrna", "Halted at Smyrna"],
    ["troas", "At Troas"],
    ["rome", "reaches Rome"],
    ["antioch", "in Antioch"],
  ],
  "martyrdom-of-polycarp": [
    ["rome", "travels to Rome"],
    ["smyrna", "breaks out at Smyrna"],
    _,
    _,
    _,
    _,
    _,
  ],
  "missions-of-apostle-paul": [
    _,
    ["jerusalem", "at Jerusalem"],
    ["troas", "at Troas"],
    ["thessalonica", "then come Thessalonica"],
    ["athens", "At Athens"],
    ["corinth", "At Corinth"],
    ["ephesus", "at Ephesus"],
    ["jerusalem", "in the Temple at Jerusalem"],
    ["rome", "Sent to Rome"],
  ],
  "moscow-patriarchate-established": [
    ["moscow", "to Moscow"],
    ["moscow", "returns to Moscow"],
    _,
    _,
    _,
    ["moscow", "arrives in Moscow"],
    ["moscow", "in the Moscow Kremlin"],
    _,
    ["constantinople", "A council at Constantinople"],
    _,
    _,
    ["moscow", "takes Moscow"],
  ],
  "neronian-persecution": [
    ["rome", "districts of Rome"],
    _,
    ["rome", "crucified at Rome"],
    ["rome", "beheaded in Rome"],
    _,
    _,
  ],
  "non-chalcedonian-estrangement": [
    ["chalcedon", "At Chalcedon"],
    _,
    ["alexandria", "In Alexandria"],
    _,
    _,
    _,
    _,
    _,
    _,
  ],
  "photian-council": [
    _,
    ["constantinople", "a council at Constantinople"],
    _,
    _,
    ["constantinople", "a council in Constantinople"],
    _,
    _,
    _,
    ["hagia-sophia", "in Hagia Sophia"],
    _,
  ],
  "second-council-of-constantinople": [
    _,
    ["constantinople", "brought to Constantinople"],
    _,
    ["constantinople", "the great church of Constantinople"],
    _,
    _,
  ],
  "second-iconoclasm": [
    _,
    _,
    ["hagia-sophia", "in Hagia Sophia"],
    ["studios", "the monastery of Studios"],
    _,
    _,
    _,
    _,
  ],
  "third-council-of-constantinople": [
    _,
    _,
    _,
    ["rome", "in Rome"],
    ["constantinople", "tried in Constantinople"],
    _,
    ["constantinople", "meets at Constantinople"],
    _,
    _,
  ],
};

const problems = [];
const used = new Set();
const steps = {};
const report = [];
const dir = path.join(repo, "data/history");
const withChronology = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))])
  .filter(([, d]) => Array.isArray(d.chronology));

for (const [slug, d] of withChronology) {
  const decided = STEPS[slug];
  if (!decided) { problems.push(`${slug}: no decisions`); continue; }
  if (decided.length !== d.chronology.length)
    problems.push(`${slug}: ${decided.length} decisions for ${d.chronology.length} entries`);
  steps[slug] = decided.map((s, i) => {
    if (s === null) return null;
    const [key, words] = s;
    const text = d.chronology[i]?.text ?? "";
    if (!PLACES[key]) problems.push(`${slug}[${i}]: unknown key ${key}`);
    if (!text.includes(words)) problems.push(`${slug}[${i}]: "${words}" not in its text`);
    if (!words.toLowerCase().includes((PLACES[key]?.name ?? "\u0000").toLowerCase()))
      problems.push(`${slug}[${i}]: the words do not spell "${PLACES[key]?.name}"`);
    used.add(key);
    report.push(`${slug} [${i}] ${key}: "${words}"`);
    return key;
  });
}
for (const slug of Object.keys(STEPS))
  if (!withChronology.some(([s]) => s === slug)) problems.push(`${slug}: not an event with a chronology`);
for (const key of Object.keys(PLACES)) if (!used.has(key)) problems.push(`place ${key} is never used`);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const places = Object.fromEntries(Object.keys(PLACES).sort().map((k) => [k, PLACES[k]]));
const out = {
  _comment:
    "One place per step of each event's chronology (data/history/<slug>.json), where the step's own words name it; null where they name none, and the Thread's map then names no place (components/history/EventThread.tsx). Built by scripts/history/build-step-places.mjs, which keeps the words for each. For the Thread's map that follows (1.9, the owner's pick of 2026-11-07).",
  places,
  steps: Object.fromEntries(Object.keys(steps).sort().map((k) => [k, steps[k]])),
};
fs.writeFileSync(path.join(repo, "data/maps/history-step-places.json"), JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(report.join("\n"));
