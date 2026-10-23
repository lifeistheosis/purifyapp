// The heresies the councils name (1.8).
//
// The owner, 2026-10-19: "adding all the formally condemned heresies", and on
// the list: "So the heresy list. I agree. Do that." The list is every error a
// council the whole Orthodox Church receives condemned BY NAME, and each one
// carries the council's own words against it (`condemnation`), copied from a
// public-domain text the app already hosts:
//
//   - the canons, letters and decrees of the Seven Councils in data/councils/,
//     from Percival, NPNF II vol. 14, The Seven Ecumenical Councils (1900);
//   - the tome of 1351 against Barlaam and Akindynos, as data/history/
//     hesychast-councils.json quotes it (Migne PG 151, tr. Vasiliev, 1929).
//
// lib/heresies/__tests__/conciliar.test.ts holds every quoted line to its
// document, letter for letter (spacing aside), so nothing here can drift from
// the text it cites.
//
// The Quinisext (692) joined in 1.8 with its canons (data/councils/third-
// constantinople/the-canons-of-trullo.json): its canon XCV names the
// Valentinians, Marcionites and Manichaeans.
//
// NOT YET IN: errors condemned by name only in councils whose text the app
// does not carry in a public-domain English: the council of 879 to 880 (the
// Filioque) and Constantinople 1872 (phyletism). They are added as their
// texts are found and hosted, never from memory.
//
// The definitions and responses below are ours, written as canonically as
// possible, each resting on the council texts and the Fathers it links, with
// no quotation of five words or more inside them. They ship under the owner's
// standing note of 2026-10-16 (docs/editorial-standards.md, Clergy item 8,
// and item 18 for this file) and carry `review` so a future reviewer finds
// them all.

import type { Heresy } from "./heresies";

/** Where a council's own words stand: a hosted council document's section. */
export type Condemnation =
  | { kind: "council"; council: string; document: string; section: number; label: string; words: string }
  | { kind: "history"; event: string; label: string; source: string; words: string };

export const HERESY_REVIEW = { status: "awaiting-clergy-review", drafted: "2026-10-21" } as const;

/** The Council in Trullo (692), whose canons the app holds with the Sixth Council's documents. */
const TRULLO = { name: "The Council in Trullo", year: "692", href: "/councils/third-constantinople/the-canons-of-trullo" };

/** Its canon XCV names the Gnostic and Manichaean heresies together. */
const TRULLO_XCV: Condemnation = {
  kind: "council",
  council: "third-constantinople",
  document: "the-canons-of-trullo",
  section: 96,
  label: "Canon XCV of the Council in Trullo",
  words:
    "And the Manichæans, and Valentinians and Marcionites and all of similar heresies must give certificates and anathematize each his own heresy",
};

/** The council's own words against each error, the strongest first. */
export const CONDEMNATIONS: Record<string, Condemnation[]> = {
  arianism: [
    {
      kind: "council",
      council: "first-nicaea",
      document: "the-synodal-letter",
      section: 3,
      label: "The Synodal Letter of Nicaea",
      words:
        "it was unanimously decreed that he and his impious opinion should be anathematized, together with the blasphemous words and speculations in which he indulged, blaspheming the Son of God, and saying that he is from things that are not, and that before he was begotten he was not, and that there was a time when he was not",
    },
  ],
  macedonianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 2,
      label: "Canon I of Constantinople",
      words: "And every heresy shall be anathematized, particularly that of the Eunomians or [Anomoeans, the Arians or] Eudoxians, and that of the Semi-Arians or Pneumatomachi",
    },
  ],
  nestorianism: [
    {
      kind: "council",
      council: "ephesus",
      document: "the-sentence-against-nestorius",
      section: 1,
      label: "The Sentence of Ephesus against Nestorius",
      words:
        "that our Lord Jesus Christ, whom he has blasphemed, decrees by the holy Synod that Nestorius be excluded from the episcopal dignity, and from all priestly communion.",
    },
    {
      kind: "council",
      council: "ephesus",
      document: "the-eight-canons",
      section: 5,
      label: "Canon IV of Ephesus",
      words:
        "If any of the clergy should fall away, and publicly or privately presume to maintain the doctrines of Nestorius or Celestius, it is declared just by the holy Synod that these also should be deposed.",
    },
  ],
  eutychianism: [
    {
      kind: "council",
      council: "chalcedon",
      document: "the-definition-of-faith",
      section: 1,
      label: "The Definition of Chalcedon",
      words: "it resists those who imagine a mixture or confusion of the two natures of Christ",
    },
    {
      kind: "council",
      council: "second-constantinople",
      document: "the-capitula",
      section: 5,
      label: "Anathema IV of Constantinople II",
      words:
        "the partisans of Apollinaris and Eutyches have affirmed that these natures are confounded inter se, and have asserted a union produced by the mixture of both",
    },
  ],
  origenism: [
    {
      kind: "council",
      council: "second-constantinople",
      document: "the-capitula",
      section: 12,
      label: "Anathema XI of Constantinople II",
      words:
        "If anyone does not anathematize Arius, Eunomius, Macedonius, Apollinaris, Nestorius, Eutyches and Origen, as well as their impious writings",
    },
    {
      kind: "council",
      council: "second-constantinople",
      document: "the-fifteen-anathemas-against-origen",
      section: 2,
      label: "The first of the Fifteen Anathemas against Origen",
      words:
        "If anyone asserts the fabulous pre-existence of souls, and shall assert the monstrous restoration which follows from it: let him be anathema.",
    },
  ],
  monothelitism: [
    {
      kind: "council",
      council: "third-constantinople",
      document: "the-definition-of-faith",
      section: 2,
      label: "The Definition of Faith of Constantinople III",
      words:
        "has actively employed them in raising up for the whole Church the stumbling-blocks of one will and one operation in the two natures of Christ our true God, one of the Holy Trinity",
    },
  ],
  iconoclasm: [
    {
      kind: "council",
      council: "second-nicaea",
      document: "the-decree-on-the-holy-icons",
      section: 2,
      label: "The Decree of Nicaea II",
      words:
        "if they be Bishops or Clerics, we command that they be deposed; if religious or laics, that they be cut off from communion.",
    },
  ],
  paulianism: [
    {
      kind: "council",
      council: "first-nicaea",
      document: "the-twenty-canons",
      section: 20,
      label: "Canon XIX of Nicaea",
      words:
        "Concerning the Paulianists who have flown for refuge to the Catholic Church, it has been decreed that they must by all means be rebaptized",
    },
  ],
  montanism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 8,
      label: "Canon VII of Constantinople",
      words:
        "But Eunomians, who are baptized with only one immersion, and Montanists, who are here called Phrygians, and Sabellians, who teach the identity of Father and Son",
    },
  ],
  novatianism: [
    {
      kind: "council",
      council: "first-nicaea",
      document: "the-twenty-canons",
      section: 9,
      label: "Canon VIII of Nicaea",
      words:
        "in particular that they will communicate with persons who have been twice married, and with those who having lapsed in persecution have had a period [of penance] laid upon them",
    },
  ],
  quartodecimanism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 8,
      label: "Canon VII of Constantinople",
      words: "Arians, and Macedonians, and Sabbatians, and Novatians, who call themselves Cathari or Aristeri, and Quarto-decimans or Tetradites, and Apollinarians",
    },
  ],
  sabellianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 8,
      label: "Canon VII of Constantinople",
      words: "and Sabellians, who teach the identity of Father and Son",
    },
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-synodical-letter",
      section: 5,
      label: "The Synodical Letter of 382",
      words: "Thus there is no room for the heresy of Sabellius by the confusion of the hypostases, i.e. the destruction of the personalities",
    },
  ],
  eunomianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 2,
      label: "Canon I of Constantinople",
      words: "And every heresy shall be anathematized, particularly that of the Eunomians or [Anomoeans, the Arians or] Eudoxians",
    },
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-synodical-letter",
      section: 5,
      label: "The Synodical Letter of 382",
      words: "thus the blasphemy of the Eunomians, of the Arians, and of the Pneumatomachi is nullified, which divides the substance, the nature, and the godhead",
    },
  ],
  marcellianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 2,
      label: "Canon I of Constantinople",
      words: "and that of the Sabellians, and that of the Marcellians, and that of the Photinians",
    },
  ],
  photinianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 2,
      label: "Canon I of Constantinople",
      words: "and that of the Marcellians, and that of the Photinians, and that of the Apollinarians.",
    },
  ],
  apollinarianism: [
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-seven-canons",
      section: 2,
      label: "Canon I of Constantinople",
      words: "and that of the Photinians, and that of the Apollinarians.",
    },
    {
      kind: "council",
      council: "first-constantinople",
      document: "the-synodical-letter",
      section: 5,
      label: "The Synodical Letter of 382",
      words: "holding the tradition that the dispensation of the flesh is neither soulless nor mindless nor imperfect",
    },
  ],
  pelagianism: [
    {
      kind: "council",
      council: "ephesus",
      document: "the-eight-canons",
      section: 2,
      label: "Canon I of Ephesus",
      words:
        "or, if he has adopted, or shall hereafter adopt, the doctrines of Celestius, he has no power in any way to do anything in opposition to the bishops of the province, since he is already cast forth from all ecclesiastical communion",
    },
  ],
  barlaamism: [
    {
      kind: "history",
      event: "hesychast-councils",
      label: "The Tome of 1351",
      source: "The Synodal Tome of 1351 (Migne, PG 151, cols. 718-719), tr. A. A. Vasiliev (1929)",
      words:
        "he has been cut off from intercourse with Christians as much for his numerous faults as for the fact that he called the light of the Transfiguration of the Lord, which appeared to His blessed disciples, who ascended the mountain with Him, created and describable and differing in nothing from the light perceived by the sense.",
    },
  ],
  valentinianism: [TRULLO_XCV],
  marcionism: [TRULLO_XCV],
  manichaeism: [TRULLO_XCV],
};

/**
 * Councils outside the Seven, which have no page of their own in the
 * councils registry: their name and year, and where they are told of, the
 * history page (`history`) or the document that holds their canons (`href`).
 */
export const OTHER_COUNCILS: Record<string, { name: string; year: string; history?: string; href?: string }[]> = {
  barlaamism: [{ name: "The councils of Constantinople", year: "1341 to 1351", history: "hesychast-councils" }],
  valentinianism: [TRULLO],
  marcionism: [TRULLO],
  manichaeism: [TRULLO],
};

/** The errors added in 1.8, each named in a council's own words above. */
export const CONCILIAR_HERESIES: Heresy[] = [
  {
    slug: "valentinianism",
    name: "Valentinianism",
    alsoCalled: ["The Valentinians", "The Gnosis of Valentinus"],
    era: "2nd century",
    heresiarch: "Valentinus, teaching at Rome",
    shortBio: "A hidden fullness of aeons, a fallen Wisdom and a lesser maker of the world: Canon XCV of the Council in Trullo.",
    definition:
      "Valentinus, who taught at Rome in the middle of the second century, set out the most elaborate of the Gnostic systems. Above the world, he taught, is a fullness of divine beings, the aeons, issuing in pairs from an unknowable Father; the last of them, Wisdom, fell through her longing, and from her fall came matter and a lesser god who made the world without knowing the Father. Men are of three kinds, the spiritual, the soulish and the earthly, and the spiritual are saved by the knowledge revealed to them rather than by faith and works.",
    response:
      "The Church confesses one God, the Father Almighty, who made heaven and earth through his Word, with no other god above him or beside him. The Son of God truly became man and saved the whole man, body and soul, and the faith the Apostles handed down in the churches they founded is open to all and keeps no secret knowledge for a few. St Irenaeus of Lyons wrote his five books Against Heresies chiefly against the followers of Valentinus. The Council in Trullo, in its ninety-fifth canon, names the Valentinians among the heretics who must renounce their heresy to be received.",
    condemnedBy: [],
    relatedHeresies: ["marcionism", "manichaeism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-23",
  },
  {
    slug: "marcionism",
    name: "Marcionism",
    alsoCalled: ["The Marcionites"],
    era: "2nd century",
    heresiarch: "Marcion of Sinope, at Rome",
    shortBio: "Two gods, the just maker of the Law and the good Father of Jesus, and a Scripture cut to fit: Canon XCV of the Council in Trullo.",
    definition:
      "Marcion of Sinope, a shipowner of Pontus who came to Rome about the year 140, taught that the God of the Law and the Prophets, who made the world and judges it, is not the good God whom Jesus revealed as Father. Christ, he held, came from that unknown good God to free men from the maker of the world, and did not take real flesh from a woman. He set aside the Old Testament, kept as Scripture only a shortened Gospel of Luke and ten letters of St Paul cut of whatever spoke of the Creator, and gathered churches of his own that lasted for centuries.",
    response:
      "The Church confesses that the God who gave the Law and spoke by the Prophets is the Father of our Lord Jesus Christ, one and the same God, just and good, and that the Old Testament and the New are one Scripture of the one God. The Son truly took flesh of the Virgin, suffered in it and rose in it. St Irenaeus of Lyons answered Marcion in his books Against Heresies. The Council in Trullo, in its ninety-fifth canon, names the Marcionites among the heretics who must renounce their heresy to be received.",
    condemnedBy: [],
    relatedHeresies: ["valentinianism", "manichaeism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-23",
  },
  {
    slug: "montanism",
    name: "Montanism",
    alsoCalled: ["The Phrygians", "The New Prophecy"],
    era: "2nd century",
    heresiarch: "Montanus, in Phrygia",
    shortBio: "A new prophecy claiming to complete the revelation of Christ: the Phrygians of the canons.",
    definition:
      "In Phrygia in the second century Montanus and the women who prophesied with him claimed that the Holy Spirit spoke through them in ecstasy, adding to the faith new commands and stricter fasts as a revelation beyond what the Apostles had handed down. The movement spread widely and was called after its homeland, the Phrygians.",
    response:
      "The Church holds that the faith was delivered once to the Apostles and is kept, not added to, by the Spirit who guides the whole Church. A prophecy that sets itself above that deposit is not received. The Second Ecumenical Council counted the Montanists among those whose baptism was not the Church's, receiving them as those coming from outside the faith.",
    condemnedBy: ["first-constantinople"],
    relatedHeresies: ["novatianism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "quartodecimanism",
    name: "Quartodecimanism",
    alsoCalled: ["The Quarto-decimans", "Tetradites"],
    era: "2nd century",
    heresiarch: "A custom of some churches of Asia, later held apart from the Church",
    shortBio: "Keeping Pascha on the fourteenth day of the moon, apart from the whole Church: named in the canons of 381.",
    definition:
      "The Quarto-decimans, from the Latin for fourteenth, kept Pascha on the fourteenth day of the month of the Jewish Passover, on whatever day of the week it fell, rather than on the Sunday of the Resurrection with the rest of the Church. What began as the custom of some churches became, once the Church had agreed on one Pascha, a separation from the common feast.",
    response:
      "The question of the date of Pascha was among the causes for which the First Ecumenical Council met, and the Church came to keep the feast together on a Sunday. To hold apart from the whole Church on its greatest feast is to break its unity, and the Second Council received the Quarto-decimans by a written renunciation and chrismation, as those returning from heresy.",
    condemnedBy: ["first-constantinople"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "sabellianism",
    name: "Sabellianism",
    alsoCalled: ["Modalism"],
    era: "3rd century",
    heresiarch: "Sabellius",
    shortBio: "One God who appears in turn as Father, Son and Spirit: the error that confuses the Persons.",
    definition:
      "Sabellius taught that God is one Person who shows himself under three names: as Father in creation, as Son in the Incarnation, and as Spirit in sanctification. On this account the Father, the Son and the Holy Spirit are not three Persons but three faces or modes of the one, and it is the Father himself who was born and suffered.",
    response:
      "The Church confesses one God in three Persons, the Father, the Son and the Holy Spirit, one in essence and distinct in their hypostases. The Father begets, the Son is begotten, the Spirit proceeds from the Father: the Persons are never merged. The Fathers of 382 wrote that their faith leaves no room for the confusion of the hypostases, and St Basil showed from Scripture's own words that the Persons are distinct.",
    condemnedBy: ["first-constantinople"],
    relatedTopic: "the-holy-trinity",
    relatedHeresies: ["marcellianism", "arianism"],
    refutedBy: [
      {
        saintSlug: "basil-the-great",
        workSlug: "on-the-holy-spirit",
        sectionN: 25,
        stance: "refutes",
        gloss: "The words of Scripture that confute the mischief of Sabellius and set forth the distinction of the hypostases.",
      },
      {
        saintSlug: "john-chrysostom",
        workSlug: "homilies-on-hebrews",
        sectionN: 2,
        stance: "refutes",
        gloss: "On Hebrews 1:3: the Apostle leads us away from Sabellius on the one side and from Arius on the other.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "novatianism",
    name: "Novatianism",
    alsoCalled: ["The Cathari", "The pure"],
    era: "3rd century",
    heresiarch: "Novatian, presbyter of Rome",
    shortBio: "A church of the pure that refused the lapsed and the twice married: Canon VIII of Nicaea.",
    definition:
      "After the persecution of Decius, Novatian, a presbyter of Rome, refused to receive back those who had lapsed, however they repented, and set himself up as bishop against the bishop of Rome. His followers called themselves the Cathari, the pure, and held themselves apart from a Church they judged too merciful, refusing communion also to those who had married a second time.",
    response:
      "The Church holds that repentance is open to every sinner and that the bishop and his council may restore the fallen after penance measured to the fault. The First Ecumenical Council required the Cathari who returned to promise in writing that they would be in communion with the twice married and with the lapsed who had done penance. A Church of the pure alone is not the Church of Christ, who came to call sinners.",
    condemnedBy: ["first-nicaea", "first-constantinople"],
    relatedHeresies: ["montanism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "paulianism",
    name: "Paulianism",
    alsoCalled: ["The Paulianists", "The teaching of Paul of Samosata"],
    era: "3rd century",
    heresiarch: "Paul of Samosata, bishop of Antioch",
    shortBio: "That Jesus was a man in whom the Word dwelt, not God made man: Canon XIX of Nicaea.",
    definition:
      "Paul of Samosata, bishop of Antioch in the third century, taught that Jesus was a man, born of the Virgin, in whom the Word of God came to dwell, as in a prophet but more fully. The Word was for him not a Person who became flesh but a power of God at work in the man Jesus. He was deposed by the bishops gathered at Antioch, and his followers kept his name.",
    response:
      "The Church confesses that the Word, who was in the beginning with God and was God, himself became flesh: one and the same Son, God before the ages and man in these last days. St John Chrysostom, reading the opening of Hebrews, saw the Apostle strike both Paul of Samosata and Arius at once. The First Ecumenical Council judged the baptism of the Paulianists no baptism and ordered them baptized.",
    condemnedBy: ["first-nicaea"],
    relatedTopic: "the-incarnation",
    relatedHeresies: ["photinianism", "nestorianism"],
    refutedBy: [
      {
        saintSlug: "john-chrysostom",
        workSlug: "homilies-on-hebrews",
        sectionN: 3,
        stance: "refutes",
        gloss: "On Hebrews 1:6-8: in the beginning, not now but from the first, a blow at once to Paul of Samosata and to Arius.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "manichaeism",
    name: "Manichaeism",
    alsoCalled: ["The Manichaeans", "The religion of Mani"],
    era: "3rd century",
    heresiarch: "Mani, in Persia",
    shortBio: "Two eternal principles, light and darkness, and a world made of their mixture: Canon XCV of the Council in Trullo.",
    definition:
      "Mani, a Persian of the third century who called himself an apostle of Jesus Christ, taught that two eternal principles stand against each other, a kingdom of light and a kingdom of darkness, and that the visible world and the human body were made from their mingling, the soul a particle of light held captive in matter. Salvation was the freeing of that light. His followers were divided into the elect, who kept a strict rule, and the hearers who served them, and his teaching spread from Persia to Egypt, Rome and North Africa, where the young Augustine followed it for nine years.",
    response:
      "The Church confesses one God, the Father Almighty, who made all things, seen and unseen, and all that he made is good: evil is not a second god or a nature of its own but the turning of a free will away from God. The body is the work of God, which the Son of God took from the Virgin and raised from the dead. St Augustine, who had been one of the hearers for nine years, tells in his Confessions how he came to see that evil has no being of its own. The Council in Trullo, in its ninety-fifth canon, names the Manichaeans among the heretics who must renounce their heresy to be received.",
    condemnedBy: [],
    relatedHeresies: ["valentinianism", "marcionism"],
    refutedBy: [
      {
        saintSlug: "augustine-of-hippo",
        workSlug: "confessions",
        sectionN: 107,
        stance: "refutes",
        gloss: "Book VII: how he came to see that evil is no substance, and that all God made is good.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-23",
  },
  {
    slug: "eunomianism",
    name: "Eunomianism",
    alsoCalled: ["The Anomoeans", "Radical Arianism"],
    era: "4th century",
    heresiarch: "Eunomius, bishop of Cyzicus, with Aetius",
    shortBio: "That the Son is unlike the Father in essence: the sharpest form of the Arian error.",
    definition:
      "Eunomius, with his teacher Aetius, carried the teaching of Arius to its end: the Son is not only a creature but unlike the Father in his very essence, for to be unbegotten is the essence of God and the Son is begotten. From the Greek for unlike his party were called Anomoeans. They also changed the rite of baptism, baptizing with a single immersion.",
    response:
      "The Church confesses the Son of one essence with the Father, begotten of him before all ages and therefore true God from true God. The Fathers of 382 wrote that the blasphemy of the Eunomians, dividing the one Godhead into natures of different substance, is nullified by the faith of Nicaea. The Second Ecumenical Council received Eunomians only by baptism, their single immersion not being the baptism of the Church.",
    condemnedBy: ["first-constantinople"],
    relatedTopic: "the-holy-trinity",
    relatedHeresies: ["arianism", "macedonianism"],
    refutedBy: [
      {
        saintSlug: "cyril-of-alexandria",
        workSlug: "commentary-on-john",
        sectionN: 17,
        stance: "refutes",
        gloss: "On John 3:35: the misconceit of Eunomius' party, answered from the Gospel.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "marcellianism",
    name: "Marcellianism",
    alsoCalled: ["The Marcellians"],
    era: "4th century",
    heresiarch: "Marcellus, bishop of Ancyra",
    shortBio: "In fighting Arius, a Word with no Person of his own: named in Canon I of Constantinople.",
    definition:
      "Marcellus of Ancyra stood against the Arians at Nicaea, but in guarding the oneness of God he taught that the Word is in God as his reason, put forth for creation and for the Incarnation, and not an eternal Person beside the Father. On this account the Son's distinct reign belongs to the work of salvation and will at the end be taken back into God.",
    response:
      "The Church confesses the Son a Person from all eternity, begotten of the Father before the ages, and of his kingdom there shall be no end, as the Creed of 381 says. St John Chrysostom, expounding Hebrews, warned against the disease of Marcellus and Photinus beside that of Sabellius, for each in its way confuses the Persons the Apostle distinguishes.",
    condemnedBy: ["first-constantinople"],
    relatedTopic: "the-holy-trinity",
    relatedHeresies: ["sabellianism", "photinianism"],
    refutedBy: [
      {
        saintSlug: "john-chrysostom",
        workSlug: "homilies-on-hebrews",
        sectionN: 2,
        stance: "refutes",
        gloss: "On Hebrews 1:3: the brightness of his glory, against the disease of Marcellus and Photinus.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "photinianism",
    name: "Photinianism",
    alsoCalled: ["The Photinians"],
    era: "4th century",
    heresiarch: "Photinus, bishop of Sirmium",
    shortBio: "Christ a man and no more, Son of God only from Mary: named in Canon I of Constantinople.",
    definition:
      "Photinus of Sirmium, a disciple of Marcellus, taught that Jesus Christ was a man and no more, who began to be when he was born of Mary, and was called Son of God for the excellence of his life and the Word dwelling in him. There was for him no Son before the ages, only the Word of God that the man Jesus received.",
    response:
      "The Church confesses that the one born of the Virgin is the eternal Son himself, God who became man without ceasing to be God. St Augustine tells in his Confessions how he once thought of Christ only as a man of excellent wisdom, and how he learned the difference between that error and the Catholic faith.",
    condemnedBy: ["first-constantinople"],
    relatedTopic: "the-incarnation",
    relatedHeresies: ["marcellianism", "paulianism"],
    refutedBy: [
      {
        saintSlug: "augustine-of-hippo",
        workSlug: "confessions",
        sectionN: 107,
        stance: "refutes",
        gloss: "Book VII: Christ thought of as a man of excellent wisdom only, and the Word made flesh learned afterwards.",
      },
      {
        saintSlug: "john-chrysostom",
        workSlug: "homilies-on-hebrews",
        sectionN: 2,
        stance: "refutes",
        gloss: "On Hebrews 1:3: against the disease of Marcellus and Photinus.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "apollinarianism",
    name: "Apollinarianism",
    alsoCalled: ["The Apollinarians"],
    era: "4th century",
    heresiarch: "Apollinaris, bishop of Laodicea",
    shortBio: "A Christ with a human body but no human mind: answered by the Second Council.",
    definition:
      "Apollinaris of Laodicea, a defender of Nicaea against the Arians, taught that in Christ the divine Word took the place of the human mind. Christ had a human body and the life that moves it, but not a rational human soul, for Apollinaris could not see how a full man and full God could be one.",
    response:
      "The Church confesses that the Word took the whole of our nature, body, soul and mind, for what he did not take he did not heal. The Fathers of 382 held the dispensation of the flesh to be neither soulless nor mindless nor imperfect, and St Augustine records how Alypius, once he saw that this was the error of the Apollinarians, turned from it to the Catholic faith.",
    condemnedBy: ["first-constantinople", "second-constantinople"],
    relatedTopic: "the-incarnation",
    relatedHeresies: ["eutychianism", "monothelitism"],
    refutedBy: [
      {
        saintSlug: "augustine-of-hippo",
        workSlug: "confessions",
        sectionN: 107,
        stance: "refutes",
        gloss: "Book VII: Alypius learns that a Christ without a human soul is the error of the Apollinarian heretics.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "pelagianism",
    name: "Pelagianism",
    alsoCalled: ["The teaching of Celestius"],
    era: "5th century",
    heresiarch: "Pelagius, and his disciple Celestius",
    shortBio: "Salvation by human will without the grace of God: Canons I and IV of Ephesus.",
    definition:
      "Pelagius, a monk in Rome, and his disciple Celestius taught that a man can keep the commandments of God and live without sin by the strength of his own free will, so that grace is a help and an example from outside rather than the power of God working within. On this account a man may be saved by his own effort.",
    response:
      "The Church confesses that without Christ we can do nothing, and that salvation is the work of God's grace, to which our freedom answers and with which it works. The Third Ecumenical Council at Ephesus deposed any bishop or cleric who held the doctrines of Celestius, setting them beside those of Nestorius.",
    condemnedBy: ["ephesus"],
    relatedTopic: "theosis",
    relatedHeresies: ["nestorianism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
  {
    slug: "barlaamism",
    name: "The error of Barlaam and Akindynos",
    alsoCalled: ["Anti-hesychasm"],
    era: "14th century",
    heresiarch: "Barlaam of Calabria, and Gregory Akindynos",
    shortBio: "That the light of Tabor was created, and God's grace no true sharing in God: the councils of 1341 to 1351.",
    definition:
      "Barlaam, a monk and scholar from Calabria, mocked the prayer of the hesychast monks of Athos and held that the light which shone from Christ at the Transfiguration was a created light, no different from the light of the senses. Gregory Akindynos, after him, denied that God's uncreated energies are distinct from his essence, so that the saints' union with God could be no real sharing in God himself.",
    response:
      "The Church, with St Gregory Palamas, confesses that the light of Tabor is the uncreated glory of God, that God is beyond all participation in his essence and truly shared in his grace and energies, and that this distinction leaves God's simplicity whole. The councils of Constantinople from 1341 to 1351 condemned Barlaam and Akindynos, and their condemnation is read each year on the first Sunday of Great Lent.",
    condemnedBy: [],
    relatedTopic: "theosis",
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-10-21",
  },
];

/** The archive's order: by the century each error arose, then by name. */
export const CENTURY_ORDER: Record<string, number> = {
  "2nd century": 2,
  "3rd century": 3,
  "4th century": 4,
  "5th century": 5,
  "6th century": 6,
  "7th century": 7,
  "8th century": 8,
  "8th–9th century": 8,
  "14th century": 14,
};
