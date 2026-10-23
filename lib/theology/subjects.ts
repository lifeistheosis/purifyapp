/**
 * The faith, by subject: the map at the head of Theology (1.8).
 *
 * The owner, 2026-10-19, of Theology: "you should revamp the look, the depth,
 * and how it's organized. So actually all three. And I want photos included".
 * Theology had grown as four libraries side by side (Doctrine, Topics,
 * Heresies, Apologetics), so a reader asking about Christ had to look in
 * four places. The map turns it round: one row per subject of the faith, in
 * the order of the Creed, each with its icon and everything the app holds on
 * it, the question answered (Topics), the long study (Doctrine), the errors
 * the Church named (Heresies) and the councils that settled it.
 *
 * Only slugs live here; titles come from each registry when the page draws,
 * so a renamed study cannot leave a stale label behind.
 * lib/theology/__tests__/subjects.test.ts holds every slug to its registry
 * and every picture to a file on disk with its record.
 *
 * The one line under each subject is ours, plain and descriptive, and every
 * picture is an icon or a fresco (docs/licensing/SECTION_MEDIA.md, "Theology
 * subjects").
 */

export type TheologySubject = {
  id: string;
  title: string;
  /** One plain sentence: what the subject is. */
  line: string;
  picture: { src: string; alt: string; credit: string };
  /** data/topics slugs: the focused question, answered. */
  topics: string[];
  /** data/theology slugs: the long studies. */
  studies: string[];
  heresies: string[];
  councils: string[];
};

export const THEOLOGY_SUBJECTS: TheologySubject[] = [
  {
    id: "trinity",
    title: "The Holy Trinity",
    line: "One God, the Father, the Son and the Holy Spirit, one in essence and undivided.",
    picture: {
      src: "/theology/subjects/trinity.jpg",
      alt: "The Holy Trinity, the three angels at Abraham's table, by St Andrei Rublev",
      credit: "The Holy Trinity · St Andrei Rublev, about 1425 · Public domain",
    },
    topics: ["the-holy-trinity"],
    studies: ["filioque", "justin-martyr-subordinationism"],
    heresies: ["arianism", "eunomianism", "macedonianism", "sabellianism", "marcellianism", "manichaeism"],
    councils: ["first-nicaea", "first-constantinople"],
  },
  {
    id: "christ",
    title: "Christ, God made man",
    line: "The eternal Son, who became man for our salvation, one Person in two natures.",
    picture: {
      src: "/icons/prayer/christ-pantocrator.v2.jpg",
      alt: "Christ Pantocrator, the icon of Christ as Almighty, St Catherine's Monastery, Sinai",
      credit: "Christ Pantocrator · Sinai, 6th century · Public domain",
    },
    topics: ["the-incarnation"],
    studies: [],
    heresies: ["paulianism", "photinianism", "apollinarianism", "nestorianism", "eutychianism", "monothelitism"],
    councils: ["ephesus", "chalcedon", "second-constantinople", "third-constantinople"],
  },
  {
    id: "theotokos",
    title: "The Theotokos",
    line: "Mary, who gave birth to God in the flesh, ever-virgin and honoured above all creation.",
    picture: {
      src: "/icons/prayer/theotokos-of-vladimir.jpg",
      alt: "The Theotokos of Vladimir, the Mother of God holding Christ",
      credit: "The Theotokos of Vladimir · Constantinople, early 12th century · Public domain",
    },
    topics: ["the-theotokos"],
    studies: ["the-theotokos"],
    heresies: ["nestorianism"],
    councils: ["ephesus"],
  },
  {
    id: "church",
    title: "The Church and the Holy Spirit",
    line: "The one Church the Spirit gathers at Pentecost, kept in the faith of the Apostles.",
    picture: {
      src: "/icons/prayer/pentecost.jpg",
      alt: "The Descent of the Holy Spirit on the Apostles",
      credit: "Pentecost · Russian icon, 1420s · Public domain",
    },
    topics: [],
    studies: ["papacy", "theodore-the-studite-and-rome", "council-of-florence"],
    heresies: ["montanism", "novatianism", "quartodecimanism"],
    councils: [],
  },
  {
    id: "mysteries",
    title: "The Mysteries and worship",
    line: "The Eucharist and the Divine Liturgy, where the Church becomes what she is.",
    picture: {
      src: "/theology/subjects/mystical-supper.jpg",
      alt: "The Mystical Supper, Christ with the twelve at table",
      credit: "The Mystical Supper · Kirillo-Belozersky Monastery, 1497 · Public domain",
    },
    topics: ["the-eucharist"],
    studies: ["the-divine-liturgy", "vestments"],
    heresies: [],
    councils: [],
  },
  {
    id: "salvation",
    title: "Salvation and theosis",
    line: "God became man so that man might share in the life of God, by grace.",
    picture: {
      src: "/icons/prayer/anastasis.jpg",
      alt: "The Anastasis, Christ raising Adam and Eve from the tombs",
      credit: "The Anastasis · Russian icon, about 1500 · Public domain",
    },
    topics: ["theosis"],
    studies: ["theosis", "essence-energies", "original-sin", "penal-substitution"],
    heresies: ["pelagianism", "barlaamism", "valentinianism"],
    councils: [],
  },
  {
    id: "icons",
    title: "The holy icons",
    line: "Because the Word was seen in the flesh, he and his saints are honoured in their images.",
    picture: {
      src: "/theology/subjects/triumph-of-orthodoxy.jpg",
      alt: "The Triumph of Orthodoxy, the restoration of the icons in 843",
      credit: "The Triumph of Orthodoxy · about 1375 to 1425 · Public domain",
    },
    topics: [],
    studies: [],
    heresies: ["iconoclasm"],
    councils: ["second-nicaea"],
  },
  {
    id: "scripture",
    title: "Scripture and the Fathers",
    line: "The Bible as the Church received it, read with the Fathers who handed it down.",
    picture: {
      src: "/icons/prayer/three-hierarchs.v2.jpg",
      alt: "The Three Hierarchs, Saints Basil, Gregory the Theologian and John Chrysostom",
      credit: "The Three Hierarchs · Novgorod · Public domain",
    },
    topics: [],
    studies: ["comma-johanneum", "mark-longer-ending"],
    heresies: ["marcionism"],
    councils: [],
  },
  {
    id: "last-things",
    title: "The last things",
    line: "Christ will come again in glory to judge the living and the dead.",
    picture: {
      src: "/theology/subjects/last-judgment.jpg",
      alt: "The Last Judgment, Christ enthroned with the saints, the river of fire below",
      credit: "The Last Judgment · Russian icon, first half of the 16th century · Public domain",
    },
    topics: [],
    studies: [],
    heresies: ["origenism"],
    councils: ["second-constantinople"],
  },
];
