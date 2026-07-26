// Theology, the deep-study surface. /topics is a thin reference index
// (definition + deep-links into saint works); /theology is the long-form
// companion: framing essay, full patristic florilegium, councils cited,
// scripture cross-refs, and links to the saint profiles for every Father
// who speaks on the doctrine.
//
// The doctrinal source material started in the Purify Discord's
// dogma-exegesis forum (Trinity, Filioque, Theotokos, Theosis, original
// sin, papacy, the textual case for 1 John 5:7 and Mark 16:9-20). The
// editorial team (the Discord author plus reviewers) brings each thread
// here as a long-form study, with every patristic citation kept verbatim
// from public-domain sources (NPNF, ANF, CCEL) and sourced.
//
// Pure data + pure helpers, no fs, no "use client", so it can be imported
// from both server pages and client components. Actual topic body is read
// at request time from data/theology/<slug>.json.

export type TheologyGroup =
  | "trinity"
  | "christology"
  | "mariology"
  | "soteriology"
  | "ecclesiology"
  | "liturgics"
  | "textual";

export type TheologyTopicMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  group: TheologyGroup;
  /** Short blurb shown in the hub index. */
  summary: string;
  /** Mark a topic that's coming but not yet seeded. Surfaces honestly. */
  planned?: boolean;
  /** Approximate read time in minutes for the long-form study. */
  estimatedMinutes?: number;
};

export const THEOLOGY_GROUP_ORDER: TheologyGroup[] = [
  "trinity",
  "christology",
  "mariology",
  "soteriology",
  "ecclesiology",
  "liturgics",
  "textual",
];

export const THEOLOGY_GROUP_LABEL: Record<
  TheologyGroup,
  { en: string; de: string; subtitle: string }
> = {
  trinity: {
    en: "The Holy Trinity",
    de: "Die Heilige Dreifaltigkeit",
    subtitle: "The one God in three Persons, the eternal cause and the procession of the Spirit.",
  },
  christology: {
    en: "Christology",
    de: "Christologie",
    subtitle: "The one Christ, two natures, and the Hypostasis of the Word.",
  },
  mariology: {
    en: "The Theotokos",
    de: "Die Gottesgebärerin",
    subtitle: "Mary the God-bearer, ever-virgin, more honorable than the cherubim.",
  },
  soteriology: {
    en: "Salvation & the human person",
    de: "Erlösung & der Mensch",
    subtitle: "Theosis, original sin, grace, and the path from likeness to communion.",
  },
  ecclesiology: {
    en: "The Church",
    de: "Die Kirche",
    subtitle: "Conciliarity, the rejection of papal supremacy, and the unity of the bishops.",
  },
  liturgics: {
    en: "The worship of the Church",
    de: "Der Gottesdienst der Kirche",
    subtitle:
      "The Divine Liturgy, the vesting of the clergy, and the meaning of what the Church does when she prays.",
  },
  textual: {
    en: "Scripture & textual criticism",
    de: "Schrift & Textkritik",
    subtitle: "Defenses of disputed passages on textual, patristic, and historical grounds.",
  },
};

export const THEOLOGY_TOPICS: TheologyTopicMeta[] = [
  {
    slug: "filioque",
    title: "The Annihilation of the Filioque",
    subtitle:
      "The Holy Spirit proceeds from the Father alone, and the Father is the one cause.",
    group: "trinity",
    summary:
      "The most consequential single word in Christian history. A line-by-line case from the Fathers and the Councils that the Spirit proceeds from the Father alone, and that the Western insertion of \"and the Son\" is both dogmatically and canonically void.",
    estimatedMinutes: 35,
  },
  {
    slug: "the-theotokos",
    title: "The Theotokos",
    subtitle:
      "More honorable than the cherubim and beyond compare more glorious than the seraphim.",
    group: "mariology",
    summary:
      "Mary the God-bearer is the test of Christology. The doctrine of the Theotokos guards the Incarnation, the perpetual virginity, and her unique role in the economy of salvation. Drawn from Justin Martyr, Ambrose, Ephraim the Syrian, Cyril of Alexandria, John Chrysostom, and the Third Ecumenical Council.",
    estimatedMinutes: 18,
  },
  {
    slug: "theosis",
    title: "On Theosis",
    subtitle: "The highest and ultimate purpose for which we were created.",
    group: "soteriology",
    summary:
      "Theosis, deification by grace, is the goal of the Christian life. We participate in the uncreated energies of God without participating in his essence, and so become by grace what God is by nature. Justin Martyr, Irenaeus, Theophilus of Antioch, Athanasius, Basil, Maximus the Confessor.",
    estimatedMinutes: 14,
  },
  {
    slug: "original-sin",
    title: "Original sin, reatus or culpa?",
    subtitle:
      "We inherit the consequence (corruption and death), not the personal guilt, of Adam's sin.",
    group: "soteriology",
    summary:
      "Whether the descendants of Adam inherit reatus (legal guilt) or culpa (corrupted nature) is the dividing line between Latin scholastic anthropology and the Orthodox patristic mind. Romans 5:12, the Greek manuscript tradition, Cyril of Alexandria, John Chrysostom, and the conciliar witness against Augustinian transmission of guilt.",
    estimatedMinutes: 30,
  },
  {
    slug: "papacy",
    title: "Why the Orthodox Church rejects the Papacy",
    subtitle:
      "There is no first throne above the Church; the Council is the seat of authority.",
    group: "ecclesiology",
    summary:
      "Universal jurisdiction, papal infallibility, and the development of supremacy at Rome are rejected on conciliar and patristic grounds. The Third Ecumenical Council, the Council in Trullo, Canon 28 of Chalcedon, the witness of Cyprian, Firmilian, and the Eastern Patriarchs' 1848 encyclical to Pius IX.",
    estimatedMinutes: 32,
  },
  {
    slug: "comma-johanneum",
    title: "The case for 1 John 5:7",
    subtitle:
      "\"There are three that bear witness in heaven: the Father, the Word, and the Holy Spirit, and these three are one.\"",
    group: "textual",
    summary:
      "A textual and patristic defense of the Comma Johanneum: its presence in the Vetus Latina, Cyprian's witness, the Codex Fuldensis preface, the 484 Council of Carthage, and the chain of Latin Fathers who quote it as Scripture before the Vulgate.",
    estimatedMinutes: 20,
  },
  {
    slug: "mark-longer-ending",
    title: "The case for Mark 16:9-20",
    subtitle:
      "The Longer Ending stood as Scripture in the Greek manuscript tradition, the Lectionaries, and the Fathers.",
    group: "textual",
    summary:
      "External support across 99% of the Greek manuscripts, the Old Latin and Syriac versions, and Irenaeus, Tatian, Justin, and Hippolytus, set against the narrow case from Vaticanus, Sinaiticus, and Eusebius. A defense of the Longer Ending on patristic and manuscript grounds.",
    estimatedMinutes: 22,
  },
  // Brought over from the Discord dogma-exegesis and liturgics forums on
  // 2026-07-26. Every quotation in these six was checked against its cited
  // source with scripts/audit-florilegium.mjs before landing; two that could
  // not be matched were removed rather than shipped. The drafting record and
  // the clergy review notes stay in docs/editorial/dogma-queue/.
  {
    slug: "justin-martyr-subordinationism",
    title: "St Justin Martyr and the charge of subordinationism",
    subtitle: "Order and origin in God are not inequality of nature.",
    group: "trinity",
    summary:
      "St Justin writes more than a century and a half before Nicaea, in words the Church had not yet fixed. He calls the Son another God and Lord subject to the Maker of all things, and gives him the second place. He also worships him, calls him God, and denies that the Father's essence is divided in begetting him. Everything turns on the difference between order and causal origin, what the Greek Fathers call taxis, and inferiority of nature.",
    estimatedMinutes: 20,
  },
  {
    slug: "penal-substitution",
    title: "Penal substitution and the Life-Giving Cross",
    subtitle:
      "The Cross heals and it also pays; what the Fathers refuse is a God who must be bought before he can love.",
    group: "soteriology",
    summary:
      "Did Christ die to satisfy a judge, or to heal a disease? The Fathers refuse the choice. They keep the debt, the ransom, and the curse borne, and they insist the payment works by union with our nature rather than by a verdict pronounced over it. Ignatius, Irenaeus, Athanasius, Cyril of Jerusalem, Gregory the Theologian, and John Chrysostom, with the question Gregory asks out loud at Pascha: to whom was the Blood offered?",
    estimatedMinutes: 15,
  },
  {
    slug: "council-of-florence",
    title: "Why the Orthodox Church does not receive the Council of Florence",
    subtitle:
      "A synod becomes a Council when the whole Church recognises her own faith in it.",
    group: "ecclesiology",
    summary:
      "The Council of Ferrara-Florence (1438-1439) published a decree of union that the Orthodox Church has never received. A council is not made a Council by its convocation, its attendance, or its signatures, but by the Church recognising in it the faith she already holds. Vincent of Lerins, Athanasius, Jerome, Gregory the Great, and the precedent of Ariminum supply the rule by which the Church judged it.",
    estimatedMinutes: 30,
  },
  {
    slug: "theodore-the-studite-and-rome",
    title: "St Theodore the Studite and the See of Rome",
    subtitle:
      "The appeals of a confessor in exile to the first of the thrones, made inside the order of five, not above it.",
    group: "ecclesiology",
    summary:
      "St Theodore the Studite wrote to the Bishop of Rome in the highest language a Byzantine could use, and those letters are quoted today as a proof of papal supremacy. Read whole, they are the appeals of a persecuted confessor to the one apostolic throne still free to act, sent alongside letters to Alexandria, Antioch and Jerusalem, and aimed at a synod.",
    estimatedMinutes: 13,
  },
  {
    slug: "the-divine-liturgy",
    title: "The Divine Liturgy of St John Chrysostom",
    subtitle:
      "The Prothesis, the Liturgy of the Catechumens, and the Liturgy of the Faithful, walked in order.",
    group: "liturgics",
    summary:
      "A walk through the Divine Liturgy in the order it is served, explaining what each action is for: the cutting of the Lamb and the gathering of the whole Church on the paten, the antiphons and the reading of the Word, the dismissal of the catechumens, the Great Entrance, the Anaphora and the calling down of the Spirit, and communion.",
    estimatedMinutes: 26,
  },
  {
    slug: "vestments",
    title: "Vestments and the garments of the Kingdom",
    subtitle:
      "Nothing the priest wears is his own, and the prayers he says while putting it on say exactly that.",
    group: "liturgics",
    summary:
      "The clergy do not dress for the Liturgy, they are vested, and every garment carries a name, a scriptural root, and a prayer said over it. From the holy apparel commanded in Exodus 28 through Clement of Rome, Polycrates of Ephesus, the Apostolic Constitutions and the canons of Laodicea and Trullo, to the sticharion, epitrachelion, zone, epimanikia, epigonation and phelonion as they are actually prayed.",
    estimatedMinutes: 22,
  },
];

export function getTopicMeta(slug: string): TheologyTopicMeta | undefined {
  return THEOLOGY_TOPICS.find((t) => t.slug === slug);
}

export function topicsByGroup(g: TheologyGroup): TheologyTopicMeta[] {
  return THEOLOGY_TOPICS.filter((t) => t.group === g);
}

export function topicParams(): { topic: string }[] {
  return THEOLOGY_TOPICS.filter((t) => !t.planned).map((t) => ({
    topic: t.slug,
  }));
}
