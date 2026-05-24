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

/** A document that belongs to the Council but is not yet shipped. Surfaces on
 * the council profile as a faint note beneath the readable documents, so the
 * reader knows what is in the corpus and what is still being sourced. */
export type CouncilPendingDocument = {
 title: string;
 /** One-sentence explanation of what the document is + why it is not yet
 * shipped (most commonly: PD source not yet wired). */
 note: string;
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
 /** Documents belonging to this council that are not yet shipped, surfaced as
 * a faint note beneath `documents` on the profile page. */
 pendingDocuments?: CouncilPendingDocument[];
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
 "The first council of the whole Church, called by St. Constantine in 325 to settle the Arian controversy and to fix the date of Pascha. It gave the Church the homoousios, the confession that the Son is consubstantial with the Father, and the first half of the Creed we still recite.",
 defined: [
 "The consubstantiality (ὁμοούσιος, homoousios) of the Son with the Father: that the Son is of the same essence as the Father, not a creature, not made, not of a different substance. The same word is rendered consubstantial in the liturgical English used today and of one essence in the older liturgical tradition.",
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
 "Constantine, newly the sole emperor of a still-young Christian Roman world, summoned a council of the bishops of the whole inhabited earth, the first to be called οἰκουμενική, ecumenical, to be held at Nicaea in Bithynia in the year 325. Eusebius's Vita Constantini gives the count of about two hundred and fifty bishops who actually arrived; the Church's later memory fixed the symbolic number at three hundred and eighteen, the count of Abraham's trained servants in Genesis 14:14, read by the Fathers as a type of the Faith carrying the Church into a new freedom. They came from Spain to Mesopotamia, from Egypt to the Goths beyond the Danube. Many of them bore the marks of the recent persecutions on their bodies.",
 "The young deacon Athanasius accompanied Alexander of Alexandria to the council and was its most penetrating theological voice. The wonderworker St. Nicholas of Myra was there. St. Spyridon of Trimythous, the shepherd-bishop of Cyprus, was there, and the tradition remembers his demonstration of the Holy Trinity to the assembled Fathers: he took a brick into his hand and, with a sign of the Cross, drew from it fire upward, water downward, and clay remaining in his palm, three natures held in one substance. St. Hosius of Cordova, the elder of the West and the emperor's confidant, signs first in the subscriptions, with Eustathius of Antioch giving the opening address to the Council in the Eastern tradition. The Fathers debated for weeks, looking for a single word that the Arians could not equivocate around, and at length settled on ὁμοούσιος, consubstantial, to confess that the Son shares the very being of the Father: not a similar being, not a created being, but the same.",
 "The Creed they wrote was the first half of the Creed every Orthodox Christian recites today; the second half, on the Holy Spirit, would be filled out at the Second Council, at Constantinople in 381. The twenty Canons they enacted set the constitutional framework for the Church's discipline that the Eastern Orthodox tradition still observes. And the rule they set for the date of Pascha is the rule the Church keeps to this day, the Julian-reckoned rule, kept by the Russian, Serbian, Athonite, and Jerusalem traditions, and the New (Revised Julian) rule kept by Constantinople and most of the Greek-speaking world, both alike calculated against the original Nicene principle.",
 "Arius did not subscribe to the Creed. He, with Secundus of Ptolemais and Theonas of Marmarica, who refused with him, were deposed and exiled. The Arian struggle was far from over, it would consume the Eastern Church for another fifty years and bring Athanasius into and out of exile five times, but at Nicaea the Church had spoken the word with which she would not yield: ὁμοούσιος.",
 ],
 principalFathers: [
 {
 slug: "athanasius-the-great",
 name: "St. Athanasius the Great",
 role: "Then a young deacon, accompanying his bishop Alexander of Alexandria; the most penetrating theological voice for the homoousios at the council, and the one who would defend its teaching through fifty years of exile and struggle.",
 },
 {
 slug: "alexander-of-alexandria",
 name: "St. Alexander of Alexandria",
 role: "Patriarch of Alexandria, Arius's own bishop, who had already deposed him; leader of the anti-Arian party at the council.",
 },
 {
 slug: "hosius-of-cordova",
 name: "St. Hosius (Ossius) of Cordova",
 role: "Bishop of Cordova in Spain, elder statesman of the Western Church and the emperor's theological confidant; signs first in the surviving subscription lists, and is widely held in the Western tradition to have presided. In the Eastern tradition the opening address to the Council is given to Eustathius of Antioch.",
 },
 {
 slug: "eustathius-of-antioch",
 name: "St. Eustathius of Antioch",
 role: "Patriarch of Antioch; in the Eastern tradition the one who delivered the opening oration to the Council. A staunch anti-Arian; later deposed by an Arianizing synod at Antioch around 330 and exiled.",
 },
 {
 slug: "nicholas-the-wonderworker",
 name: "St. Nicholas of Myra",
 role: "The wonderworker bishop of Myra in Lycia; tradition holds he was among the Fathers at Nicaea and was famously moved by zeal against Arius.",
 },
 {
 slug: "spyridon-of-trimythous",
 name: "St. Spyridon of Trimythous",
 role: "The shepherd-bishop of Trimythous in Cyprus, simple in his learning and ready in his defense of the Faith. Tradition gives him the demonstration of the Holy Trinity at the Council: he took a brick into his hand and, with the sign of the Cross, drew from it fire upward, water downward, and clay remaining in his palm.",
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
 {
 slug: "the-twenty-canons",
 title: "The Twenty Canons",
 subtitle: "The disciplinary canons of the First Ecumenical Council, 325",
 blurb:
 "All twenty disciplinary canons of the Council in full, each followed where extant by the Ancient Epitome (the short Greek-tradition synaxarial summary of the canon's force). Covers episcopal ordination, the discipline for the lapsed, the reception of returning heretics and schismatics (Cathari, Paulianists, Meletians), the precedence of the ancient sees of Alexandria, Rome, Antioch, and Jerusalem, and the rule of standing for prayer on the Lord's Day and at Pentecost.",
 topics: ["Canons", "Discipline", "Episcopate", "Pascha", "Penitential", "Lord's Day"],
 },
 ],
 },
 {
 slug: "first-constantinople",
 ordinal: 2,
 name: "The Second Ecumenical Council",
 byname: "First Council of Constantinople",
 year: 381,
 location: "Constantinople (modern İstanbul, Türkiye)",
 presidingEmperor: "St. Theodosius the Great",
 bishopsAttending: "150 Holy Fathers",
 shortBio:
 "The Second Council, called by St. Theodosius the Great in 381 to ratify Nicaea, to confess the divinity of the Holy Spirit against the Macedonian heresy, and to give the Church the Creed she still recites: the Niceno-Constantinopolitan Symbol of Faith.",
 defined: [
 "The full divinity of the Holy Spirit, against the Pneumatomachi (the \"Spirit-fighters,\" also called Macedonians after Macedonius, a former bishop of Constantinople): the Holy Spirit is the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified.",
 "The Niceno-Constantinopolitan Creed: a completion of the Nicene Symbol with the full article on the Holy Spirit, the article on the Church (one, holy, Catholic and Apostolic), the one Baptism for the remission of sins, and the resurrection of the dead. This is the Creed every Orthodox Christian recites at the Divine Liturgy.",
 "The completeness of Christ's human nature against the teaching of Apollinaris: Christ took to Himself a full human nature, body and rational soul, not merely a human body animated by the divine Word in place of a human mind.",
 "Seven disciplinary canons (the precise count of seven is the standard Eastern Orthodox reception; the Latin canonical tradition counts four, considering Canons V-VII to be later additions).",
 "Re-affirmation of the Nicene Faith in full: \"This is the faith which ought to be sufficient for you, for us, for all who wrest not the word of the true faith.\"",
 ],
 condemned: [
 "Macedonianism / Pneumatomachianism: the teaching that the Holy Spirit is a creature, the highest of the angelic powers but not God. Named after Macedonius, the deposed bishop of Constantinople under whom the doctrine had its principal patron, though the position outlived him.",
 "Apollinarianism: the teaching of Apollinaris of Laodicea, an old defender of Nicaea, that Christ took only a human body and that the divine Word took the place of the human rational soul in Him. The Council condemned the formula as a denial of Christ's full humanity.",
 "Sabellianism: the modalist confusion of the three hypostases of the Trinity into one Person under three names. The Synodical Letter formally re-rejects it.",
 "Eunomianism: the radical Arianism of Eunomius, which held the Father to be in essence ungenerate and the Son to be unlike the Father; condemned by name in the Synodical Letter.",
 ],
 life: [
 "Fifty-six years after Nicaea, the Arian struggle the First Council had hoped to end had instead intensified. Successive emperors of Arianizing convictions, Constantius and Valens chief among them, had pressured the Eastern Church into a long succession of compromise formulae. St. Athanasius had been driven into and out of exile five times. The Cappadocians, Basil, Gregory the Theologian, Gregory of Nyssa, had carried the Nicene cause through long pastoral and theological labor. By the late 370s a new question had also opened: the divinity of the Holy Spirit. The Pneumatomachi (literally, the Spirit-fighters), or Macedonians as they were also called, taught that the Spirit was a creature, the highest of the angelic powers but not God.",
 "When Theodosius the Great, the first emperor since Constantine to confess the Nicene Faith without reservation, came to the throne in 379, he summoned a council of the bishops of his half of the empire to be held at Constantinople in the spring of 381. About one hundred and fifty Holy Fathers came, from Egypt, Syria, Asia Minor, Greece, and Thrace, with thirty-six Pneumatomachi who came at first and withdrew before voting. The Council was first presided over by the elder Meletius of Antioch, who died during its sessions and was given a magnificent funeral. The presidency passed for a brief time to St. Gregory the Theologian, who had been called by the Eastern bishops to the see of Constantinople and who delivered the great Theological Orations defending the consubstantial Trinity. When the Egyptian bishops disputed the canonicity of Gregory's translation to Constantinople, he withdrew rather than be a cause of division, and the presidency passed to Nectarius, an unbaptized senator until the day before his election, who was baptized, ordained, and consecrated to the throne of Constantinople in the same day.",
 "The Cappadocian theology was the air the Council breathed. St. Gregory of Nyssa, the youngest of the three Cappadocians and brother of St. Basil who had died two years before, was present. St. Cyril of Jerusalem, whose Catechetical Lectures had formed two generations of catechumens in the Faith, was vindicated by the Council against earlier slanders. St. Diodore of Tarsus and St. Meletius of Antioch were the elders of the Antiochene tradition. The Council's work was not so much to invent as to confess: to take the Nicene Creed, which the Cappadocians had been preaching for a generation, and to receive it in its mature form.",
 "The Creed they issued is the Creed every Orthodox Christian recites today at the Divine Liturgy. To the Nicene Symbol they added the full article on the Holy Spirit (\"the Lord, the Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified\"), the closing articles on the Church, baptism, the resurrection, and the age to come, and the title Lord and Giver of Life that has shaped Orthodox pneumatology ever since. The Filioque clause that the West would later add to the article on the Spirit is not in the original Creed of 381 and has never been part of the Creed as the Orthodox Church receives and recites it.",
 "Seven canons were enacted on the discipline of the Church. Canon I reaffirms the Nicene Faith and anathematizes the recent heresies by name. Canon II divides the Eastern Church into civil dioceses for the purpose of inter-episcopal jurisdiction (each Patriarch in his own diocese, no bishop interfering in another's). Canon III gives the See of Constantinople honor of place after Rome, \"because Constantinople is New Rome\", a canon that the Roman See would later contest. Canons IV-VII handle the reception of various heretical and schismatic groups returning to the Church, with the famous distinction between those received by re-baptism (Eunomians, who baptize with a single immersion; Sabellians; and the followers of Montanus) and those received by chrismation alone (Arians, Macedonians, Sabbatians, Novatians, Apollinarians).",
 "The Council closed with two letters. One, the Synodical Letter, was sent the following year (382) to Pope Damasus and the Western bishops convening at Rome, summarizing the Faith confessed at Constantinople and naming the heresies condemned. The other, the Letter to Theodosius, requested imperial ratification of the Council's decrees and appended the canons. Damasus, then aged, received the Synodical Letter with caution and did not formally accept the Council as ecumenical in his lifetime; the Roman reception came later, under Hormisdas at the Sixth Ecumenical Council in 681, when Constantinople I was numbered as the second among the seven. By the Eastern reckoning the Council was ecumenical from its first sessions: in its Creed, the whole Orthodox East had spoken with one voice the faith Athanasius and the Cappadocians had carried.",
 ],
 principalFathers: [
 {
 slug: "gregory-theologian",
 name: "St. Gregory the Theologian",
 role: "Then briefly archbishop of Constantinople; presided over part of the Council after the death of Meletius. His Five Theological Orations, preached in Constantinople the preceding year, are the dogmatic foundation the Council ratified. He withdrew from the throne and from the Council to spare the assembly any pretext for division.",
 },
 {
 slug: "gregory-of-nyssa",
 name: "St. Gregory of Nyssa",
 role: "The youngest of the great Cappadocians; brother of St. Basil who had died two years before; present at the Council as the principal living voice of Cappadocian Trinitarian theology. His Great Catechism, written near this time, is the systematic complement to the Council's Creed.",
 },
 {
 slug: "meletius-of-antioch",
 name: "St. Meletius of Antioch",
 role: "Patriarch of Antioch and presider over the opening of the Council; died during its sessions and was buried with great honor in Constantinople. A staunch Nicene through the long Arian struggle.",
 },
 {
 slug: "cyril-of-jerusalem",
 name: "St. Cyril of Jerusalem",
 role: "Bishop of Jerusalem; author of the Catechetical Lectures that had formed two generations of catechumens in the Nicene Faith. Vindicated by the Council against earlier slanders.",
 },
 {
 slug: "nectarius-of-constantinople",
 name: "St. Nectarius of Constantinople",
 role: "An unbaptized senator on the eve of the Council; elected to the throne of Constantinople after the withdrawal of Gregory the Theologian; baptized, ordained, and consecrated in the same day. Presided over the latter part of the Council and the final issue of its decrees.",
 },
 {
 slug: "diodore-of-tarsus",
 name: "St. Diodore of Tarsus",
 role: "Bishop of Tarsus, elder of the Antiochene exegetical tradition; teacher of St. John Chrysostom; one of the Council's leading theological voices on the side of Meletius.",
 },
 ],
 principalOpposed: [
 {
 name: "The Pneumatomachi (Macedonians)",
 teaching: "Took their name from Macedonius, deposed bishop of Constantinople in 360, though the position outlived him; taught that the Holy Spirit is a creature, the highest of the angelic powers but not God. Thirty-six Macedonian bishops attended the Council at first and withdrew before subscribing to the new Creed.",
 },
 {
 name: "Apollinaris of Laodicea",
 teaching: "Bishop of Laodicea in Syria; in his old age, hard for Nicaea against the Arians, he reasoned that the union of the divine Word with a complete human nature was unintelligible and concluded that the Word took the place of the human rational soul in Christ. The Council answered: what was not assumed was not healed, and so Christ's humanity must be full, body and rational soul both.",
 },
 {
 name: "Eunomius of Cyzicus",
 teaching: "The leading later Arian; held that the Father's essence is precisely ungenerate, and that the Son, being generate, must be of a different (unlike) essence. The Cappadocians, especially St. Gregory of Nyssa, devoted entire treatises to refuting him; the Council condemned the position by name.",
 },
 ],
 documents: [
 {
 slug: "the-niceno-constantinopolitan-creed",
 title: "The Niceno-Constantinopolitan Creed",
 subtitle: "The Holy Creed which the 150 Fathers set forth, ratified by the Council in 381",
 blurb:
 "The Creed every Orthodox Christian recites at the Divine Liturgy: the Nicene Faith completed with the full article on the Holy Spirit, the Church, baptism, the resurrection, and the age to come. With the related baptismal Creed of fourth-century Salamis preserved by St. Epiphanius's Ancoratus.",
 topics: ["Creed", "Trinity", "Holy Spirit", "Pneumatology", "Ecclesiology"],
 },
 {
 slug: "the-synodical-letter",
 title: "The Synodical Letter to the Western Bishops",
 subtitle: "Sent to Pope Damasus and the Western synod at Rome, 382",
 blurb:
 "The Council's summary of the Faith confessed at Constantinople, written the year after the Council itself to the Western bishops gathered at Rome under Pope Damasus. Names the heresies condemned (Sabellius, the Eunomians, the Arians, the Pneumatomachi), confirms the three new Eastern patriarchs (Nectarius of Constantinople, Flavian of Antioch, Cyril of Jerusalem), and confesses the consubstantial Trinity in three perfect hypostases.",
 topics: ["Encyclical", "Trinity", "Patriarchate", "Sabellianism", "Pneumatology"],
 },
 {
 slug: "the-letter-to-theodosius",
 title: "The Letter to the Emperor Theodosius",
 subtitle: "The Council's request to the emperor for imperial ratification",
 blurb:
 "The short letter the Fathers sent to St. Theodosius the Great accompanying the Canons, asking for imperial ratification of the Council's decrees, with thanks for the emperor's defense of the true Faith.",
 topics: ["Letter", "Symphonia", "Canons", "Theodosius"],
 },
 {
 slug: "the-seven-canons",
 title: "The Seven Canons",
 subtitle: "The disciplinary canons of the Second Ecumenical Council, 381-382",
 blurb:
 "All seven canons of the Council in full, each followed where extant by the Ancient Epitome. Covers the affirmation of Nicaea against the named heresies, the diocesan jurisdiction rule, the precedence of Constantinople (New Rome) after Rome, the deposition of Maximus the Cynic, the reception of the Tome of the West, the procedure for accusations against bishops, and the reception of returning heretics by category (re-baptism for Eunomians and Sabellians; chrismation for Arians, Macedonians, and Apollinarians).",
 topics: ["Canons", "Discipline", "Patriarchate", "Heresy", "Reception", "New Rome"],
 },
 ],
 },
];

export function getCouncil(slug: string): Council | null {
 return COUNCILS.find((c) => c.slug === slug) ?? null;
}

export function getCouncilByOrdinal(ordinal: number): Council | null {
 return COUNCILS.find((c) => c.ordinal === ordinal) ?? null;
}
