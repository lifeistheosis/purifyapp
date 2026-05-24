// The seven Ecumenical Councils of the Orthodox Church, metadata + documents
// index. Confessional posture is Eastern Orthodox: the Definitions of the
// seven councils are received as the dogmatic teaching of the Church.
//
// Document bodies live alongside the registry, one JSON per document, at
// data/councils/{slug}/{document-slug}.json. New documents can be added
// by appending to the `documents[]` array of the relevant council and
// dropping the matching JSON file. The file shape mirrors the saints
// schema (sections with title + paragraphs + optional notes / framing).
//
// On the Oriental Orthodox question (see /about "On contested questions"):
// Chalcedon and the post-Chalcedonian non-Chalcedonian separation are named
// historically without modern polemic. The reader is directed to their
// priest and to the published EO ↔ OO dialogue documents for further
// direction. Purify does not adjudicate whether the Christological
// difference is verbal or substantive.

export type CouncilDocumentRef = {
 /** Filename slug for data/councils/{council-slug}/{doc-slug}.json. */
 slug: string;
 /** Display title, e.g. "The Symbol of the Faith". */
 title: string;
 subtitle?: string;
 /** Short one-line description for the council profile listing. */
 blurb: string;
 /** Subject tags for filtering / display. */
 topics: string[];
};

export type CouncilFather = {
 /** Slug of a saint in the SAINTS registry, when one exists. */
 slug?: string;
 /** Display name as shown on the council page. */
 name: string;
 /** One-line summary of his role at the council. */
 role: string;
};

export type CouncilOpposition = {
 /** Display name of the heresy or its principal teacher. */
 name: string;
 /** Plain-English one-sentence summary of what they taught. */
 teaching: string;
};

export type Council = {
 slug: string;
 ordinal: 1 | 2 | 3 | 4 | 5 | 6 | 7;
 /** Long form, e.g. "The First Ecumenical Council". */
 name: string;
 /** Short form, e.g. "First Council of Nicaea". */
 byname: string;
 year: number;
 location: string;
 /** "St. Constantine the Great", "St. Justinian the Great", etc. */
 presidingEmperor: string;
 /** "318 Holy Fathers", traditional count + descriptor when known. */
 bishopsAttending?: string;
 /** One- or two-sentence summary shown on the index card + profile hero. */
 shortBio: string;
 /** Bullet points of what the council defined. */
 defined: string[];
 /** Bullet points of what (and whom) the council condemned. */
 condemned: string[];
 /** Multi-paragraph historical narrative for the council profile body. */
 life: string[];
 /** The Holy Fathers principally associated with the council. */
 principalFathers?: CouncilFather[];
 /** The principal opposing parties named honestly. */
 principalOpposed?: CouncilOpposition[];
 /** Documents shipped for this council (each lives in data/councils/{slug}/). */
 documents: CouncilDocumentRef[];
 /** Optional path to an icon image at /public/councils/icons/{slug}.jpg. */
 iconUrl?: string;
};

export const COUNCILS: Council[] = [
 {
 slug: "first-nicaea",
 ordinal: 1,
 name: "The First Ecumenical Council",
 byname: "First Council of Nicaea",
 year: 325,
 location: "Nicaea in Bithynia (modern İznik, Türkiye)",
 presidingEmperor: "St. Constantine the Great",
 bishopsAttending: "318 Holy Fathers",
 shortBio:
 "The first council of the whole Church, called by St. Constantine in 325 to settle the Arian controversy and to fix the date of Pascha. It gave the Church the homoousios, the confession that the Son is of one essence with the Father, and the first half of the Creed we still recite.",
 defined: [
 "The consubstantiality (ὁμοούσιος / homoousios) of the Son with the Father, that the Son is of the same essence as the Father, not a creature, not made, not of a different substance.",
 "That the Son is begotten of the Father before all ages, true God of true God, begotten not made.",
 "A common rule for the date of Pascha, fixed for the whole Church on the first Sunday after the first full moon following the spring equinox, independent of the Jewish reckoning.",
 ],
 condemned: [
 "Arianism: the teaching of Arius, presbyter of Alexandria, that the Son was a creature, the highest of created beings, but not eternal, \"there was when he was not.\"",
 "The associated formulae of the Arian party: that the Son was \"out of nothing,\" was \"of a different substance\" from the Father, or was subject to change or alteration.",
 ],
 life: [
 "By the early fourth century the Church had emerged from the great persecution of Diocletian into the new freedom of the Edict of Milan (313). The peace under Constantine, however, found the Church torn by an internal question that had been quietly maturing for a generation: what is the relation of the Son to the Father? Was He a creature, however exalted, or was He truly God?",
 "The presbyter Arius of Alexandria gave the question its sharpest answer: the Son was created, the first and highest creature, the one through whom all other things were made, but a creature nonetheless. \"There was when He was not.\" His bishop Alexander deposed him; Arius's friends in Asia Minor took up his cause; and within a few years the Eastern half of the Empire was divided into Arian and anti-Arian parties, with each side anathematizing the other.",
 "Constantine, newly the sole emperor of a still-young Christian Roman world, summoned a council of the bishops of the whole inhabited earth, the first to be called οἰκουμενική, ecumenical, to be held at Nicaea in Bithynia in the year 325. Tradition holds that three hundred and eighteen Holy Fathers came, from Spain to Mesopotamia, from Egypt to the Goths beyond the Danube. Many of them bore the marks of the recent persecutions on their bodies.",
 "The young deacon Athanasius accompanied Alexander of Alexandria to the council and was its most penetrating theological voice. The wonderworker St. Nicholas of Myra was there. St. Spyridon of Trimythous, the shepherd-bishop of Cyprus, was there. St. Hosius of Cordova, the elder of the West, presided as the emperor's adviser. The Fathers debated for weeks, looking for a single word that the Arians could not equivocate around, and at length settled on ὁμοούσιος, \"of one essence\", to confess that the Son shares the very being of the Father, not a similar being, not a created being, but the same.",
 "The Creed they wrote was the first half of the Creed every Orthodox Christian recites today; the second half, on the Holy Spirit, would be filled out at the Second Council, at Constantinople in 381. The twenty Canons they enacted set the constitutional framework for the Church's discipline that the Eastern Orthodox tradition still observes. And the rule they set for the date of Pascha is the rule the Church keeps to this day, the Julian-reckoned rule, kept by the Russian, Serbian, Athonite, and Jerusalem traditions, and the New (Revised Julian) rule kept by Constantinople and most of the Greek-speaking world, both alike calculated against the original Nicene principle.",
 "Arius did not subscribe to the Creed. He and two bishops who refused with him were deposed and exiled. The Arian struggle was far from over, it would consume the Eastern Church for another fifty years and bring Athanasius into and out of exile five times, but at Nicaea the Church had spoken the word with which she would not yield: ὁμοούσιος.",
 ],
 principalFathers: [
 {
 slug: "athanasius-the-great",
 name: "St. Athanasius the Great",
 role: "Then a young deacon, accompanying his bishop Alexander of Alexandria; the most penetrating theological voice for the homoousios at the council, and the one who would defend its teaching through fifty years of exile and struggle.",
 },
 {
 name: "St. Alexander of Alexandria",
 role: "Patriarch of Alexandria, Arius's own bishop, who had already deposed him; leader of the anti-Arian party at the council.",
 },
 {
 name: "St. Hosius (Ossius) of Cordova",
 role: "Bishop of Cordova in Spain, elder statesman of the Western Church, the emperor's theological adviser; presided over the council's sessions.",
 },
 {
 name: "St. Nicholas of Myra",
 role: "The wonderworker bishop of Myra in Lycia; tradition holds he was among the Fathers at Nicaea and was famously moved by zeal against Arius.",
 },
 {
 name: "St. Spyridon of Trimythous",
 role: "The shepherd-bishop of Trimythous in Cyprus, simple in his learning and ready in his defense of the Faith; tradition holds he was at Nicaea and gave a celebrated demonstration of the Holy Trinity to the assembled Fathers.",
 },
 ],
 principalOpposed: [
 {
 name: "Arius of Alexandria",
 teaching: "Presbyter of Alexandria; taught that the Son was a creature, the first and highest of all that the Father had made, but not eternal, \"there was when He was not\", and not of the same essence as the Father.",
 },
 {
 name: "Eusebius of Nicomedia",
 teaching: "Bishop of Nicomedia, the chief political patron of the Arian party; signed the Nicene Creed under imperial pressure but worked for decades after the council to undo what it had defined.",
 },
 ],
 documents: [
 {
 slug: "the-symbol-of-the-faith",
 title: "The Symbol of the Faith",
 subtitle: "The original Nicene Creed, ratified by the Council in 325",
 blurb:
 "The first half of the Creed every Orthodox Christian still recites at the Divine Liturgy; the article on the Holy Spirit was filled out at the Second Council in 381.",
 topics: ["Trinity", "Christology", "Creed", "Homoousios"],
 },
 {
 slug: "the-synodal-letter",
 title: "The Synodal Letter to the Church of Alexandria",
 subtitle: "The Council's encyclical announcing its decisions",
 blurb:
 "The letter the Fathers wrote to the Church of Alexandria reporting the deposition of Arius, the settlement of the Paschalion, and the resolution of the Meletian schism in Egypt.",
 topics: ["Encyclical", "Arianism", "Pascha", "Meletian Schism"],
 },
 // The Twenty Canons of Nicaea will land in a follow-up content drop
 // once a clean PD source is wired up (Wikisource hosts the index but
 // not the per-canon text; the Schaff & Wace edition is on CCEL but
 // CCEL is currently unreachable from this sandbox).
 ],
 },
];

export function getCouncil(slug: string): Council | null {
 return COUNCILS.find((c) => c.slug === slug) ?? null;
}

export function getCouncilByOrdinal(ordinal: number): Council | null {
 return COUNCILS.find((c) => c.ordinal === ordinal) ?? null;
}
