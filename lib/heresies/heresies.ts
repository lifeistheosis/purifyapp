// The heresies archive (v8.5). A companion to the Topics index and the
// Councils registry: where Topics confess what the Fathers taught and the
// Councils define what the Church received, this layer profiles the chief
// errors the Ecumenical Councils condemned.
//
// Like Topics, this is a *thin index*. The `definition` and `response` of
// each heresy are editorial in-house prose, written for an enquirer in plain
// English, exactly like the council `condemned` bullets and the topic
// definitions. No heretical text is hosted. Every *quotation* is a verbatim
// deep-link (via `refutedBy`) into a patristic work that already lives in
// data/saints/{slug}/{work}.json, reusing the same TopicCitation shape and
// the same "drop unresolvable, never fake" discipline as the Topics page.
//
// Cross-references are by slug and are verified at build time:
//   - condemnedBy → a council slug in lib/councils/councils.ts
//   - relatedTopic → a topic slug in data/topics/
//   - relatedHeresies → a heresy slug in this file
//   - refutedBy → a (saintSlug, workSlug, sectionN) that resolves to a real
//     section of a hosted work.
//
// The first batch is the seven conciliar heresies, one per Ecumenical
// Council. Refutation coverage is uneven and honest: where the corpus
// already holds a Father's verbatim answer to the error, it is cited; where
// it does not (Macedonianism, Origenism, Monothelitism, Iconoclasm), the
// profile ships with its definition, its condemning council, and its
// orthodox mirror, and the "Refuted by the Fathers" column is simply absent.
// A later patch can add citations as the relevant works are confirmed hosted.

import type { TopicCitation } from "@/lib/topics/topics";

export type Heresy = {
  /** URL slug, e.g. "arianism". */
  slug: string;
  /** Display name, e.g. "Arianism". */
  name: string;
  /** Alternate names, shown as a subtitle when present. */
  alsoCalled?: string[];
  /** Century descriptor, shown in the hero and used for archive grouping. */
  era: string;
  /** The heresiarch or principal teacher, e.g. "Arius, presbyter of Alexandria". */
  heresiarch: string;
  /** One-line summary for the archive card. */
  shortBio: string;
  /**
   * Plain-English account of the error, written for an enquirer. Editorial
   * in-house prose, descriptive and non-polemical, like the council
   * `condemned` bullets.
   */
  definition: string;
  /**
   * The Church's answer to the error, editorial in-house prose (the analogue
   * of a topic's `tradition`). Points the reader to the orthodox confession.
   */
  response: string;
  /** Council slugs that condemned it → /councils/{slug}. Must exist in COUNCILS. */
  condemnedBy: string[];
  /** The orthodox mirror → /topics/{slug}. Must exist in data/topics/. */
  relatedTopic?: string;
  /** Other heresy slugs in this registry, for "see also". */
  relatedHeresies?: string[];
  /**
   * Verbatim deep-links into hosted patristic works that refute the error.
   * Reuses the TopicCitation shape; stance is always "refutes" here. May be
   * empty when the corpus does not yet hold a verbatim refutation.
   */
  refutedBy: TopicCitation[];
  curatedBy?: string;
  curatedOn?: string;
};

export const HERESIES: Heresy[] = [
  {
    slug: "arianism",
    name: "Arianism",
    alsoCalled: ["The Arian heresy"],
    era: "4th century",
    heresiarch: "Arius, presbyter of Alexandria",
    shortBio:
      "That the Son is the highest of creatures, not true God: the error that called the First Council of Nicaea.",
    definition:
      "Arianism is the teaching that the Son of God is a creature. Arius, a presbyter of Alexandria in the early fourth century, reasoned that if the Father alone is unbegotten and without beginning, then the Son, who is begotten, must have had a beginning: \"there was when he was not.\" On this account the Son is the first and highest of all created things, the one through whom God made the rest, but a creature nonetheless, of a different essence from the Father, capable of change, and God only by title and not by nature.",
    response:
      "The Church answered at Nicaea in 325 with a single word the Arians could not evade: the Son is homoousios, of one essence with the Father, true God of true God, begotten not made. To make the Son a creature, the Fathers saw, is to make our salvation the work of a creature and to leave us unredeemed by God himself. The orthodox confession of the Holy Trinity rests on this: the Son shares the very being of the Father, not a being merely like it.",
    condemnedBy: ["first-nicaea"],
    relatedTopic: "the-holy-trinity",
    relatedHeresies: ["macedonianism"],
    refutedBy: [
      {
        saintSlug: "athanasius-the-great",
        workSlug: "four-discourses-against-the-arians",
        sectionN: 1,
        stance: "refutes",
        gloss: "Discourse I: there was no time when the Son was not; the Word is eternal with the Father.",
      },
      {
        saintSlug: "athanasius-the-great",
        workSlug: "on-the-nicene-definition",
        sectionN: 1,
        stance: "refutes",
        gloss: "The defence of the word 'of one essence' (homoousios) against the Arian objections.",
      },
      {
        saintSlug: "athanasius-the-great",
        workSlug: "on-the-councils",
        sectionN: 2,
        stance: "refutes",
        gloss: "The Arian opinions traced and answered from the heretics' own words.",
      },
      {
        saintSlug: "alexander-of-alexandria",
        workSlug: "encyclical-against-arius",
        sectionN: 3,
        stance: "refutes",
        gloss: "Arius's own bishop sets out the teaching of the Church on the eternal, true-God Son.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "macedonianism",
    name: "Macedonianism",
    alsoCalled: ["Pneumatomachianism", "The Spirit-fighters"],
    era: "4th century",
    heresiarch: "Named after Macedonius, deposed bishop of Constantinople",
    shortBio:
      "That the Holy Spirit is a creature, not God: the error answered by the Second Ecumenical Council.",
    definition:
      "Macedonianism extends the logic of Arianism from the Son to the Holy Spirit. Its adherents, called Pneumatomachi (the \"Spirit-fighters\") and named after Macedonius, a deposed bishop of Constantinople, allowed that the Son might be divine but held that the Holy Spirit is a creature: the highest of the ministering powers, but not God, not to be worshipped and glorified with the Father and the Son.",
    response:
      "The Second Ecumenical Council at Constantinople in 381 completed the Creed's confession of the Spirit as \"the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified.\" The Cappadocian Fathers had already shown that a Spirit who sanctifies and deifies cannot himself be a creature; the Spirit who makes us partakers of God must be God. The doctrine of the Holy Trinity is whole only when all three Persons are confessed as one in essence.",
    condemnedBy: ["first-constantinople"],
    relatedTopic: "the-holy-trinity",
    relatedHeresies: ["arianism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "nestorianism",
    name: "Nestorianism",
    era: "5th century",
    heresiarch: "Nestorius, Patriarch of Constantinople",
    shortBio:
      "That Christ is two persons loosely joined, so Mary bore only the man: the error condemned at Ephesus.",
    definition:
      "Nestorianism so divides the divine and human in Christ that it ends in two persons rather than one. Nestorius, made Patriarch of Constantinople in 428, preached that Mary should not be called Theotokos (God-bearer) but only Christotokos (Christ-bearer), since a creature cannot give birth to the divine nature. Behind the title lay the deeper error: that the Word and the man Jesus were joined in a conjunction of honour and grace, not united in one person, so that it was the man, and not God the Word made flesh, who was born, suffered, and died.",
    response:
      "The Third Ecumenical Council at Ephesus in 431, led by St. Cyril of Alexandria, deposed Nestorius and confessed that the one born of the Virgin is one and the same Son, the eternal Word made flesh without confusion and without division. Because the child she bore is God in person, Mary is truly Theotokos, a title that guards not her dignity first but her Son's identity. To divide Christ into two is to lose the one Saviour who is God and man at once.",
    condemnedBy: ["ephesus"],
    relatedTopic: "the-theotokos",
    relatedHeresies: ["eutychianism"],
    refutedBy: [
      {
        saintSlug: "cyril-of-alexandria",
        workSlug: "three-epistles-to-nestorius",
        sectionN: 1,
        stance: "refutes",
        gloss: "The Second Letter to Nestorius: the one Christ may not be divided into two sons.",
      },
      {
        saintSlug: "cyril-of-alexandria",
        workSlug: "three-epistles-to-nestorius",
        sectionN: 5,
        stance: "refutes",
        gloss: "The Twelfth Anathema, against any who refuse to confess that the Word suffered in the flesh.",
      },
      {
        saintSlug: "cyril-of-alexandria",
        workSlug: "five-tomes-against-nestorius",
        sectionN: 2,
        stance: "refutes",
        gloss: "Book I: against the division of Christ into two sons, the root error of Nestorianism.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "eutychianism",
    name: "Eutychianism",
    alsoCalled: ["Monophysitism (in the strict, Eutychian sense)"],
    era: "5th century",
    heresiarch: "Eutyches, archimandrite of Constantinople",
    shortBio:
      "That Christ's humanity was swallowed up into one divine nature: the error condemned at Chalcedon.",
    definition:
      "Eutychianism is the opposite excess to Nestorianism. Where Nestorius divided Christ into two persons, the aged archimandrite Eutyches of Constantinople so merged the natures that only one was left: after the union, he taught, there is but one nature in Christ, the human nature having been absorbed into the divine \"like a drop of honey in the sea.\" The result is a Christ who is not truly and fully man.",
    response:
      "The Fourth Ecumenical Council at Chalcedon in 451 confessed the one Lord Jesus Christ in two natures, divine and human, \"without confusion, without change, without division, without separation,\" the properties of each nature preserved and concurring in one Person. The Tome of Pope St. Leo, read to the Council, set out the case: if Christ's humanity is not real and whole, then it is not our humanity that he has healed. (Purify names the post-Chalcedonian Oriental Orthodox separation honestly and does not adjudicate it; see the Chalcedon profile.)",
    condemnedBy: ["chalcedon"],
    relatedTopic: "the-incarnation",
    relatedHeresies: ["nestorianism", "monothelitism"],
    refutedBy: [
      {
        saintSlug: "leo-the-great",
        workSlug: "the-tome-of-leo",
        sectionN: 2,
        stance: "refutes",
        gloss: "Eutyches driven into his error by presumption and ignorance of Scripture.",
      },
      {
        saintSlug: "leo-the-great",
        workSlug: "the-tome-of-leo",
        sectionN: 7,
        stance: "refutes",
        gloss: "The wrong and mischievous concession of Eutyches, and the terms on which Christ's flesh is real.",
      },
    ],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "origenism",
    name: "Origenism",
    alsoCalled: ["The Three Chapters controversy"],
    era: "6th century",
    heresiarch: "Speculations ascribed to Origen and developed by Evagrius",
    shortBio:
      "The pre-existence of souls and the final restoration of all: the speculation condemned at the Second Council of Constantinople.",
    definition:
      "Origenism is the name given to a body of speculative teaching that spread among the Palestinian monks in the sixth century, drawn from the more daring conjectures of Origen and systematized by Evagrius: that souls pre-existed their bodies and fell into them, that the material world is a consequence of that fall, and that in the end all rational beings, even the demons, will be restored to their first blessedness (the apokatastasis). At the same Council the \"Three Chapters\" (certain writings tainted with Nestorianism) were also condemned.",
    response:
      "The Fifth Ecumenical Council at Constantinople in 553, under St. Justinian, condemned the Origenist speculations and named Origen among the heretics, sealing Chalcedon in its Cyrilline reading. The Church holds the soul created with the body, the resurrection of the very flesh, and a judgement that is final, guarding both the goodness of God's material creation and the seriousness of human freedom against a system that made the world an accident of a pre-cosmic fall.",
    condemnedBy: ["second-constantinople"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "monothelitism",
    name: "Monothelitism",
    alsoCalled: ["Monoenergism"],
    era: "7th century",
    heresiarch: "Patriarch Sergius of Constantinople and Cyrus of Alexandria",
    shortBio:
      "That Christ has only one will: the error answered by the Sixth Ecumenical Council and by St. Maximus the Confessor.",
    definition:
      "Monothelitism teaches that in Christ there is only one will (and, in its companion Monoenergism, one operation). Devised in the seventh century by Patriarch Sergius of Constantinople and Cyrus of Alexandria as a formula to win back the non-Chalcedonians, it granted the two natures of Chalcedon but held that they act through a single, divine will. The cost is hidden but fatal: a Christ with no human will has not assumed the very faculty in which Adam fell, and so has not healed it.",
    response:
      "The Sixth Ecumenical Council at Constantinople in 681 confessed two natural wills and two natural operations in the one Christ, the human will not abolished but freely submitting to the divine, as in Gethsemane, \"not my will, but thine, be done.\" The confession was won at great cost by St. Maximus the Confessor, who taught that will follows nature: as Christ is fully God and fully man, so he wills as God and as man, and our salvation is the free obedience of his human will.",
    condemnedBy: ["third-constantinople"],
    relatedTopic: "the-incarnation",
    relatedHeresies: ["eutychianism"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
  {
    slug: "iconoclasm",
    name: "Iconoclasm",
    alsoCalled: ["The breaking of icons"],
    era: "8th–9th century",
    heresiarch: "The iconoclast emperors, beginning with Leo III the Isaurian",
    shortBio:
      "That the holy images are idols and must be destroyed: the error overturned by the Seventh Ecumenical Council.",
    definition:
      "Iconoclasm is the rejection and destruction of the holy icons as idolatry. Beginning under the Emperor Leo III around 730 and pressed fiercely by his son Constantine V, the iconoclasts styled the images of Christ and the saints by the same name as the idols of the heathen, stripped them from the churches, and persecuted the monks who defended them. Behind the charge of idolatry lay a deeper confusion about the Incarnation: a refusal to admit that the invisible God, having truly taken visible flesh, may be depicted.",
    response:
      "The Seventh Ecumenical Council at Nicaea in 787 restored the icons, defining that they are to be given honourable veneration (proskynesis), distinguished from the worship (latreia) due to God alone, because \"the honour paid to the image passes to its prototype.\" St. John of Damascus had given the answer its classic form: because the Word became flesh and was seen, to deny his image is to deny his Incarnation. The final restoration of the icons in 843 is kept every year as the Triumph of Orthodoxy.",
    condemnedBy: ["second-nicaea"],
    refutedBy: [],
    curatedBy: "Editorial",
    curatedOn: "2026-06-03",
  },
];

export function getHeresy(slug: string): Heresy | null {
  return HERESIES.find((h) => h.slug === slug) ?? null;
}
