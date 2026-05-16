// Eastern Orthodox saints, metadata + works index.
// Biographical facts are widely attested in standard hagiographic sources
// (Lives of the Saints, NPNF prefatory volumes, Synaxaria).
// Writings ship with public-domain English translations from NPNF (1885-1900)
// and other PD sources; full corpora can be extended via data/saints/{slug}/{work}.json.

export type Work = {
  slug: string;
  title: string;
  subtitle?: string;
  year?: string;
  blurb: string;
  /**
   * Subject topics for the filter UI on each saint profile.
   * Examples: "Love", "Trinity", "Prayer", "Incarnation",
   * "Essence and Energies", "Pride", "Repentance".
   */
  topics: string[];
};

export type Saint = {
  slug: string;
  name: string;
  epithet: string;
  born?: string;
  reposed?: string;
  feastDays: string[];
  see?: string;
  shortBio: string;
  life: string[];
  works: Work[];
  /**
   * Optional path to a real icon image, e.g. "/saints/icons/john-chrysostom.png".
   * If absent, the SaintIcon component renders a styled placeholder
   * (halo + initials on a wood-and-gold panel).
   */
  iconUrl?: string;
};

export const SAINTS: Saint[] = [
  {
    slug: "athanasius-the-great",
    iconUrl: "/saints/icons/athanasius-the-great.jpg",
    name: "St. Athanasius the Great",
    epithet: "Patriarch of Alexandria · Pillar of Orthodoxy",
    born: "c. 296 (Alexandria)",
    reposed: "May 2, 373",
    feastDays: ["January 18", "May 2"],
    see: "Alexandria",
    shortBio:
      "The fearless defender of the Council of Nicaea against the Arian heresy, exiled five times for his confession that the Son is consubstantial with the Father.",
    life: [
      "Born in Alexandria around 296, Athanasius was raised in a Christian household and educated in the classical curriculum of his city. As a young deacon he accompanied his bishop, Alexander, to the First Ecumenical Council at Nicaea in 325, where he was already known for the lucidity of his theology against Arius.",
      "On Alexander's repose in 328, Athanasius, barely thirty, was elevated to the patriarchal throne of Alexandria. He would hold it for forty-five years, but spend seventeen of them in exile.",
      "Five times he was driven from his see by emperors who sought peace with the Arian party: to Trier, to Rome, to the desert of the Egyptian monks (where he wrote the Life of Antony), to the catacombs and house-roofs of his own city. Each time he returned, and each time he taught the same thing: that if the Son is not what the Father is, no man is saved.",
      "He outlived nearly every emperor who exiled him. His De Incarnatione, written in his youth, is still read as the clearest brief statement of why God became man. He reposed in peace in Alexandria on May 2, 373, having seen the faith of Nicaea publicly confirmed once more before his death.",
    ],
    works: [
      {
        slug: "on-the-incarnation",
        title: "On the Incarnation",
        subtitle: "De Incarnatione Verbi Dei",
        year: "c. 318",
        blurb:
          "Why God became man, and what He accomplished by doing so. The classic Orthodox treatise on the Person and work of Christ.",
        topics: ["Incarnation", "Trinity", "Salvation", "Christology", "Theology"],
      },
    ],
  },
  {
    slug: "john-chrysostom",
    iconUrl: "/saints/icons/john-chrysostom.jpg",
    name: "St. John Chrysostom",
    epithet: "Archbishop of Constantinople · Golden-Mouth",
    born: "c. 349 (Antioch)",
    reposed: "September 14, 407",
    feastDays: ["November 13", "January 27", "January 30"],
    see: "Constantinople",
    shortBio:
      "The greatest preacher of the Church, who spoke without notes for hours and whom the people called Chrysostom, 'Golden-Mouth', for the sweetness and force of his words.",
    life: [
      "Born in Antioch around 349 to a noble family, John was reared by his widowed mother Anthusa, who refused remarriage in order to give her son a Christian upbringing. He studied rhetoric under the famous pagan teacher Libanius, who is said to have wished John would succeed him 'if the Christians had not stolen him.'",
      "After his mother's repose he withdrew to the mountains outside Antioch to practice asceticism, spending two of those years in a cave learning the Scriptures by heart. The harshness of the regime broke his health, and he returned to the city, was ordained deacon, then presbyter, and for twelve years preached the homilies that fill fifteen volumes of his collected works.",
      "In 397 he was seized, almost kidnapped, and brought to Constantinople to be made archbishop of the capital. He gave away the silver of the patriarchate, fed the poor, and from the pulpit rebuked the luxury of the court. The empress Eudoxia, whose vanity he had publicly named, twice procured his exile.",
      "The second exile killed him. Sent on foot through the Armenian highlands in the winter of 407, he died at Comana in Pontus on September 14, his last words: 'Glory to God for all things.'",
    ],
    works: [
      {
        slug: "paschal-homily",
        title: "The Paschal Homily",
        subtitle: "Read in every Orthodox church on Pascha night",
        year: "Late 4th c.",
        blurb:
          "The brief sermon, read every Pascha, that calls all to the table of the Resurrection regardless of the hour they came to labor.",
        topics: ["Pascha", "Resurrection", "Love", "Joy", "Mercy"],
      },
      {
        slug: "on-the-priesthood",
        title: "On the Priesthood",
        subtitle: "Six dialogues",
        year: "c. 386",
        blurb:
          "The weight of the priesthood, the manner of those who would bear it, and why the young Chrysostom fled ordination.",
        topics: ["Priesthood", "Humility", "Pride", "Eucharist", "Vocation"],
      },
    ],
  },
  {
    slug: "basil-the-great",
    iconUrl: "/saints/icons/basil-the-great.jpg",
    name: "St. Basil the Great",
    epithet: "Archbishop of Caesarea · Father of Monasticism",
    born: "c. 330 (Caesarea in Cappadocia)",
    reposed: "January 1, 379",
    feastDays: ["January 1", "January 30"],
    see: "Caesarea in Cappadocia",
    shortBio:
      "The Cappadocian father who gave the Eastern Church its monastic rule, its eucharistic liturgy, and the decisive defense of the divinity of the Holy Spirit.",
    life: [
      "Basil came of a family that gave five saints to the Church: his grandmother Macrina the Elder, his parents Basil and Emmelia, his sister Macrina the Younger, and his brothers Gregory of Nyssa and Peter of Sebaste. He studied at Constantinople and Athens, where he formed a lifelong friendship with Gregory the Theologian.",
      "Returning to Cappadocia he was baptized and withdrew to a hermitage on the river Iris with his sister and brother. There he wrote, with Gregory, the Philokalia of Origen and his own Longer and Shorter Rules, the foundation of all later Eastern monasticism.",
      "Made bishop of Caesarea in 370, he confronted both the Arian emperor Valens and a famine that gripped his city. He sold the family estates to build a hospital, almshouse, and school complex outside the walls, the Basileiad, one of the first such institutions in history.",
      "His treatise On the Holy Spirit is the patristic charter for the Spirit's divinity. The Divine Liturgy that bears his name is still served in Orthodox churches on the Sundays of Great Lent, on his own feast, and on the eves of Nativity and Theophany. He reposed at forty-nine, worn out by ascetic labor and a chronic illness.",
    ],
    works: [
      {
        slug: "hexaemeron",
        title: "The Hexaemeron",
        subtitle: "Nine homilies on the six days of creation",
        year: "c. 378",
        blurb:
          "The classic Orthodox reading of Genesis 1, creation as the word and wisdom of God, delivered orally to a Lenten congregation.",
        topics: ["Creation", "Scripture", "Cosmos", "Wisdom"],
      },
    ],
  },
  {
    slug: "gregory-theologian",
    iconUrl: "/saints/icons/gregory-theologian.jpg",
    name: "St. Gregory the Theologian",
    epithet: "Archbishop of Constantinople · The Theologian",
    born: "c. 329 (Arianzus in Cappadocia)",
    reposed: "January 25, 390",
    feastDays: ["January 25", "January 30"],
    see: "Constantinople",
    shortBio:
      "One of only three saints surnamed 'the Theologian' in the Orthodox Church, for the depth and exactness of his speech concerning the Holy Trinity.",
    life: [
      "Son of the bishop of Nazianzus, Gregory was given to God by his mother Nonna at his birth. He studied at Caesarea, Alexandria, and Athens, where his friendship with Basil the Great deepened into what he later called 'one soul in two bodies.'",
      "He desired the silence of philosophy and the monastic life, but was repeatedly drawn into the labor of the Church: first as priest in his father's parish, then briefly as bishop of the dusty crossroads of Sasima, then, against his will, to Constantinople in 379 to lead the small remnant of the orthodox flock in a city held by Arians.",
      "From a private chapel called the Anastasis, 'Resurrection', he preached the Five Theological Orations that gave him his surname. Within two years he had so recalled the city to the Nicene faith that he opened the Second Ecumenical Council of 381 as archbishop of Constantinople.",
      "He resigned the see almost immediately, longing for the rest he had never had. He returned to Cappadocia, withdrew to his family estate at Arianzus, and spent his last years writing poetry and ascetical letters until his repose on January 25, 390.",
    ],
    works: [
      {
        slug: "first-theological-oration",
        title: "The First Theological Oration",
        subtitle: "A Preliminary Discourse Against the Eunomians",
        year: "380",
        blurb:
          "Who may speak of God, when, and to whom, Gregory's preface to the four orations that follow.",
        topics: ["Theology", "Trinity", "Knowledge of God", "Asceticism"],
      },
    ],
  },
  {
    slug: "john-of-damascus",
    iconUrl: "/saints/icons/john-of-damascus.jpg",
    name: "St. John of Damascus",
    epithet: "Hymnographer · Defender of the Holy Icons",
    born: "c. 675 (Damascus)",
    reposed: "December 4, 749",
    feastDays: ["December 4"],
    see: "Lavra of St. Sabbas, Palestine",
    shortBio:
      "The last great Father of the East, who under Muslim rule defended the veneration of holy icons against the iconoclast emperors and gave the Church its definitive systematic theology.",
    life: [
      "John was born into the Mansur family, Christian Arabs who served as chief financial officers of the Umayyad Caliphate at Damascus. He inherited the post from his father and held it under the caliph Abd al-Malik before resigning all worldly office to enter the Lavra of St. Sabbas in the Judean desert.",
      "When the Byzantine emperor Leo III issued the edicts of iconoclasm in 726 and 730, John, safely beyond Leo's reach in the caliphate, wrote three Apologies in defense of the holy images. He argued that since the invisible God had become visible flesh in Christ, the matter of the image was now itself sanctified.",
      "Tradition holds that the iconoclast emperor procured a forged letter in John's hand and sent it to the caliph, who ordered John's right hand cut off. John prayed before an icon of the Theotokos; in the morning the hand was restored. The Theotokos icon called 'Tricheirousa', 'of the Three Hands', still stands at Hilandar Monastery on Mount Athos in memory of the miracle.",
      "He spent the rest of his life at St. Sabbas writing hymns, the Paschal Canon among them, and his Fountain of Knowledge, whose third part, the Exact Exposition of the Orthodox Faith, became the East's standard summa.",
    ],
    works: [
      {
        slug: "exact-exposition-of-the-orthodox-faith",
        title: "An Exact Exposition of the Orthodox Faith",
        subtitle: "Book I, opening chapters",
        year: "c. 740",
        blurb:
          "The Eastern Church's classic systematic theology, what is known of God, what is unknowable, and why.",
        topics: ["Theology", "Trinity", "Knowledge of God", "Essence and Energies"],
      },
    ],
  },
  {
    slug: "seraphim-of-sarov",
    iconUrl: "/saints/icons/seraphim-of-sarov.jpg",
    name: "St. Seraphim of Sarov",
    epithet: "Wonderworker · Acquirer of the Holy Spirit",
    born: "July 19, 1759 (Kursk)",
    reposed: "January 2, 1833",
    feastDays: ["January 2", "July 19"],
    see: "Sarov Hermitage, Russia",
    shortBio:
      "The Russian wonderworker who lived a thousand nights on a stone in the Sarov forest and taught that the whole aim of the Christian life is the acquisition of the Holy Spirit.",
    life: [
      "Prokhor Moshnin was born in Kursk to a pious merchant family. A childhood fall from a bell tower left him miraculously unharmed; an apparition of the Theotokos in his youth confirmed his calling to monasticism. At nineteen he entered the Sarov hermitage and was tonsured Seraphim, 'fiery one.'",
      "For sixteen years he lived as a hermit in a hut six miles from the monastery, growing his own food, reading the Scriptures from cover to cover each week, and standing on a granite rock in prayer for a thousand consecutive nights. Wild bears came to his hand for bread; a band of robbers beat him nearly to death and left him crooked-backed for the rest of his life.",
      "After fifteen years of total enclosure and silence he was commanded by the Theotokos to open his door to the world. Tens of thousands came, peasants, generals, governors, the dying, the demon-troubled, and he greeted each one with the Paschal salutation: 'Christ is risen, my joy!'",
      "His Conversation with the layman Nicholas Motovilov, recorded in the winter of 1831, is the most famous Russian Orthodox spiritual text of the nineteenth century. He foretold his own repose, and on January 2, 1833 he was found dead on his knees before his beloved icon, the candle still burning beside him.",
    ],
    works: [
      {
        slug: "spiritual-instructions",
        title: "Spiritual Instructions",
        subtitle: "Selected sayings",
        year: "Recorded 1815-1833",
        blurb:
          "Brief instructions on prayer, silence, the Jesus Prayer, and the acquisition of the Holy Spirit, gathered from his oral teaching.",
        topics: ["Prayer", "Holy Spirit", "Jesus Prayer", "Joy", "Repentance"],
      },
    ],
  },
];

export function getSaint(slug: string): Saint | null {
  return SAINTS.find((s) => s.slug === slug) ?? null;
}

export function getWork(
  saintSlug: string,
  workSlug: string,
): { saint: Saint; work: Work } | null {
  const saint = getSaint(saintSlug);
  if (!saint) return null;
  const work = saint.works.find((w) => w.slug === workSlug);
  if (!work) return null;
  return { saint, work };
}

/**
 * Derives the century of the saint's death (or birth as fallback).
 * Returns e.g. 4 for the 4th century, 19 for the 19th century.
 */
export function centuryFor(saint: Saint): number | null {
  const dateStr = saint.reposed || saint.born || "";
  // Years are 3-4 digits in our corpus; skip day numbers like "2".
  const matches = dateStr.match(/\b\d{3,4}\b/g);
  if (!matches || matches.length === 0) return null;
  // Use the last (rightmost) 3-4 digit number — that's the year in dates like "May 2, 373".
  const year = parseInt(matches[matches.length - 1], 10);
  return Math.ceil(year / 100);
}

export function centuryLabel(c: number): string {
  const j = c % 10, k = c % 100;
  const ord =
    k >= 11 && k <= 13 ? "th" :
    j === 1 ? "st" :
    j === 2 ? "nd" :
    j === 3 ? "rd" : "th";
  return `${c}${ord} c.`;
}
