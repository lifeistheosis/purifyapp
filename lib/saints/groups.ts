// Thematic grouping of the saints corpus, layered on top of the data in
// `saints.ts` so the index screen can offer a "by kind" filter alongside the
// existing "by century" one. Kept in a separate module — keyed by slug — so the
// large SAINTS array stays untouched and the editorial assignments are easy to
// scan and amend in one place.
//
// A saint may belong to several groups (e.g. a Cappadocian is also a Church
// Father and a Hierarch). The Theotokos is pinned at the top of the index as
// the most perfect of the saints and is also tagged "women" so she appears when
// that filter is chosen.

export type SaintGroupId =
  | "apostles"
  | "equals-to-apostles"
  | "apostolic-fathers"
  | "cappadocians"
  | "church-fathers"
  | "hierarchs"
  | "desert-monastics"
  | "council-fathers"
  | "martyrs"
  | "wonderworkers"
  | "women"
  | "rulers"
  | "angels";

export const SAINT_GROUPS: { id: SaintGroupId; label: string; blurb: string }[] =
  [
    {
      id: "apostles",
      label: "Apostles",
      blurb:
        "The Twelve, Paul, and Matthias, sent out by Christ Himself, and the Seventy He sent ahead of Him two by two.",
    },
    {
      id: "equals-to-apostles",
      label: "Equals to the Apostles",
      blurb: "Those whose missionary labors rank with the Apostles' own.",
    },
    {
      id: "apostolic-fathers",
      label: "Apostolic Fathers",
      blurb: "The first generation taught directly by the Apostles.",
    },
    {
      id: "cappadocians",
      label: "Cappadocian Fathers",
      blurb: "Basil the Great and the two Gregories.",
    },
    {
      id: "church-fathers",
      label: "Church Fathers",
      blurb: "The great teachers and theologians of the Church.",
    },
    {
      id: "hierarchs",
      label: "Hierarchs",
      blurb: "Bishops, patriarchs, and popes who shepherded the Church.",
    },
    {
      id: "desert-monastics",
      label: "Desert & Monastics",
      blurb: "Ascetics, hermits, abbots, and elders of the monastic life.",
    },
    {
      id: "council-fathers",
      label: "Fathers of the Councils",
      blurb: "Those who convened, presided at, or defended the seven Councils.",
    },
    {
      id: "martyrs",
      label: "Martyrs",
      blurb: "Witnesses who sealed the Faith with their blood.",
    },
    {
      id: "wonderworkers",
      label: "Wonderworkers",
      blurb: "Saints renowned for miracles in life and after repose.",
    },
    {
      id: "women",
      label: "Holy Women",
      blurb: "The Theotokos, myrrhbearers, martyrs, and ascetic mothers.",
    },
    {
      id: "rulers",
      label: "Holy Rulers",
      blurb: "Emperors and empresses who served the Church.",
    },
    {
      id: "angels",
      label: "The Bodiless Hosts",
      blurb: "The holy angels and archangels.",
    },
  ];

export const SAINT_GROUP_LABELS: Record<SaintGroupId, string> =
  Object.fromEntries(SAINT_GROUPS.map((g) => [g.id, g.label])) as Record<
    SaintGroupId,
    string
  >;

// Per-saint group membership, keyed by the saint's `slug`. Edit here to retag.
export const SAINT_GROUP_MEMBERSHIP: Record<string, SaintGroupId[]> = {
  theotokos: ["women"],

  // Apostles (the Twelve, Paul, Matthias)
  "apostle-peter": ["apostles"],
  "apostle-andrew": ["apostles"],
  "apostle-john": ["apostles"],
  "apostle-james-zebedee": ["apostles", "martyrs"],
  "apostle-philip": ["apostles"],
  "apostle-bartholomew": ["apostles"],
  "apostle-matthew": ["apostles"],
  "apostle-thomas": ["apostles"],
  "apostle-james-alphaeus": ["apostles"],
  "apostle-jude": ["apostles"],
  "apostle-simon-zealot": ["apostles"],
  "apostle-matthias": ["apostles"],
  "apostle-paul": ["apostles"],

  // Equals-to-the-Apostles & enlighteners
  "mary-magdalene": ["equals-to-apostles", "women"],
  "constantine-the-great": ["equals-to-apostles", "rulers", "council-fathers"],
  "cyril-and-methodius": ["equals-to-apostles"],
  "nikon-metanoeite": ["equals-to-apostles"],

  // Apostolic Fathers & their disciples
  "ignatius-of-antioch": ["apostolic-fathers", "martyrs", "hierarchs"],
  "polycarp-of-smyrna": ["apostolic-fathers", "martyrs", "hierarchs"],
  "papias-of-hierapolis": ["apostolic-fathers", "hierarchs"],
  "prochorus-the-deacon": ["apostolic-fathers", "hierarchs"],
  "anianus-of-alexandria": ["apostolic-fathers", "hierarchs"],
  "irenaeus-of-lyons": ["apostolic-fathers", "church-fathers", "hierarchs"],

  // Cappadocian Fathers
  "basil-the-great": ["cappadocians", "church-fathers", "hierarchs"],
  "gregory-theologian": [
    "cappadocians",
    "church-fathers",
    "hierarchs",
    "council-fathers",
  ],
  "gregory-of-nyssa": [
    "cappadocians",
    "church-fathers",
    "hierarchs",
    "council-fathers",
  ],

  // Church Fathers / theologians & hierarchs
  "athanasius-the-great": ["church-fathers", "hierarchs", "council-fathers"],
  "john-chrysostom": ["church-fathers", "hierarchs"],
  "john-of-damascus": ["church-fathers", "desert-monastics"],
  "cyril-of-alexandria": ["church-fathers", "hierarchs", "council-fathers"],
  "augustine-of-hippo": ["church-fathers", "hierarchs"],
  "maximus-the-confessor": ["church-fathers", "desert-monastics"],
  "symeon-the-new-theologian": ["church-fathers", "desert-monastics"],
  "cyril-of-jerusalem": ["church-fathers", "hierarchs", "council-fathers"],
  "epiphanius-of-salamis": ["church-fathers", "hierarchs"],
  "gregory-palamas": ["church-fathers", "hierarchs"],
  "theophylact-of-ohrid": ["church-fathers", "hierarchs"],
  "ephraim-the-syrian": ["church-fathers", "desert-monastics"],
  "justin-martyr": ["church-fathers", "martyrs"],
  "isaac-the-syrian": ["church-fathers", "desert-monastics"],
  "mark-of-ephesus": ["church-fathers", "hierarchs"],
  "photius-the-great": ["church-fathers", "hierarchs"],

  // Desert & monastic saints
  "anthony-the-great": ["desert-monastics"],
  "mary-of-egypt": ["desert-monastics", "women"],
  "isidora-of-tabenna": ["desert-monastics", "women"],
  "paisios-the-athonite": ["desert-monastics"],
  "seraphim-of-sarov": ["desert-monastics", "wonderworkers"],
  "olympias-the-deaconess": ["women"],

  // Hierarchs of the Councils & later wonderworkers
  "nicholas-the-wonderworker": ["hierarchs", "wonderworkers", "council-fathers"],
  "spyridon-of-trimythous": ["hierarchs", "wonderworkers", "council-fathers"],
  "nektarios-of-aegina": ["hierarchs", "wonderworkers"],
  "alexander-of-alexandria": ["hierarchs", "council-fathers"],
  "hosius-of-cordova": ["hierarchs", "council-fathers"],
  "eustathius-of-antioch": ["hierarchs", "council-fathers"],
  "meletius-of-antioch": ["hierarchs", "council-fathers"],
  "nectarius-of-constantinople": ["hierarchs", "council-fathers"],
  "leo-the-great": ["church-fathers", "hierarchs", "council-fathers"],
  "celestine-of-rome": ["hierarchs", "council-fathers"],
  "memnon-of-ephesus": ["hierarchs", "council-fathers"],
  "juvenal-of-jerusalem": ["hierarchs", "council-fathers"],
  "anatolius-of-constantinople": ["hierarchs", "council-fathers"],
  "eutychius-of-constantinople": ["hierarchs", "council-fathers"],
  "agatho-of-rome": ["hierarchs", "wonderworkers", "council-fathers"],
  "sophronius-of-jerusalem": ["church-fathers", "hierarchs", "council-fathers"],
  "martin-the-confessor": ["hierarchs", "martyrs", "council-fathers"],
  "tarasius-of-constantinople": ["hierarchs", "council-fathers"],
  "adrian-of-rome": ["hierarchs", "council-fathers"],

  // Martyrs
  "marina-the-great-martyr": ["martyrs", "women"],
  "hermione-of-ephesus": ["martyrs", "women"],
  "florian-of-lorch": ["martyrs"],

  // Holy rulers
  "theodosius-the-great": ["rulers", "council-fathers"],
  "marcian-the-emperor": ["rulers", "council-fathers"],
  "pulcheria-the-empress": ["rulers", "women", "council-fathers"],
  "justinian-the-great": ["rulers", "council-fathers"],
  "irene-the-empress": ["rulers", "women", "council-fathers"],

  // The Bodiless Hosts
  "archangel-michael": ["angels"],

  // The August menologion (see docs/editorial/august-menologion.md)
  "cyprian-of-carthage": ["church-fathers", "hierarchs", "martyrs"],
  "lawrence-the-archdeacon": ["martyrs"],
  "sixtus-of-rome": ["hierarchs", "martyrs"],
  "maccabean-martyrs": ["martyrs", "women"],
  "pimen-the-great": ["desert-monastics"],
  "herman-of-alaska": ["desert-monastics", "wonderworkers"],
  "tikhon-of-zadonsk": ["hierarchs", "church-fathers"],
  "thaddeus-of-edessa": ["apostles"],
  "titus-of-crete": ["apostles", "hierarchs"],
  "euplus-of-catania": ["martyrs"],
  "seven-sleepers-of-ephesus": ["martyrs"],

  // August, batch 2
  "basil-the-blessed": ["wonderworkers"],
  "dalmatus-of-constantinople": ["desert-monastics", "council-fathers"],
  "anthony-the-roman": ["desert-monastics", "wonderworkers"],
  "eusignius-of-antioch": ["martyrs"],
  "dometius-the-persian": ["desert-monastics", "martyrs"],
  "or-of-the-thebaid": ["desert-monastics"],
  "aemilian-of-cyzicus": ["hierarchs"],
  "myron-of-crete": ["hierarchs", "wonderworkers"],
  "theodore-and-vasily-of-the-caves": ["desert-monastics", "martyrs"],
  "photius-and-anicetus": ["martyrs"],
  "diomedes-the-physician": ["martyrs", "wonderworkers"],
  "myron-of-cyzicus": ["martyrs"],
  "floros-and-lauros": ["martyrs"],
  "andrew-stratelates": ["martyrs"],
  "abraham-of-smolensk": ["desert-monastics", "wonderworkers"],
  "agathonicus-of-nicomedia": ["martyrs"],
  "lupus-of-thessaloniki": ["martyrs"],
  "peter-of-moscow": ["hierarchs", "wonderworkers"],
  "adrian-and-natalia": ["martyrs", "women"],
  "phanourios-the-newly-revealed": ["martyrs"],
  "job-of-pochaev": ["desert-monastics", "wonderworkers"],
  "alexander-of-svir": ["desert-monastics", "wonderworkers"],
  "patriarchs-alexander-john-paul": ["hierarchs", "council-fathers"],
};

export function groupsForSlug(slug: string): SaintGroupId[] {
  return SAINT_GROUP_MEMBERSHIP[slug] ?? [];
}
