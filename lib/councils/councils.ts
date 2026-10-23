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
 /** Set when the document is read elsewhere in the app rather than from
 * data/councils (the Tome of St. Leo, among St. Leo's works in the reading
 * room). The profile links there, and no council document page is made. */
 href?: string;
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
 /** Slug of a heresy profile in lib/heresies/heresies.ts, when one exists.
  * When set, the council profile links the opposing party to /heresies/{slug}. */
 slug?: string;
 /** Display name of the heresy or its principal teacher. */
 name: string;
 /** Plain-English one-sentence summary of what they taught. */
 teaching: string;
};

export type Council = {
 slug: string;
 /**
  * "ecumenical" (the seven councils received by the whole Church) or "local"
  * (a regional synod). Absent is treated as ecumenical, so the seven
  * original entries need no change.
  *
  * "local" no longer implies "pre-Ecumenical": the Synod of Jerusalem met in
  * 1672, nearly nine centuries after the seventh council.
  */
 kind?: "ecumenical" | "local";
 /**
  * How the Church received this council's decisions, for councils where that
  * is not simply "received in full".
  *
  * A local council being listed here is not a claim that the Church adopted
  * everything it decided. Carthage 256 is the standing example: it is
  * honoured, and St. Cyprian is a hieromartyr and a Father, but his rigorist
  * rule on rebaptism was not the rule the Church settled on. Without a field
  * for it that qualification lives only in prose, where a reader skimming the
  * defined/condemned lists will miss it.
  */
 reception?: {
  /**
   * "full" for received without qualification, "qualified" where the Church
   * kept the witness but not the whole discipline, "not-received" for a
   * council the Orthodox Church does not receive as authoritative.
   */
  status: "full" | "qualified" | "not-received";
  /** One or two sentences, shown on the council profile beside the status. */
  note: string;
 };
 /** The council's place in the seven. Omitted for local councils. */
 ordinal?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
 /** Long form, e.g. "The First Ecumenical Council". */
 name: string;
 /** Short form, e.g. "First Council of Nicaea". */
 byname: string;
 year: number;
 location: string;
 /**
  * "St. Constantine the Great", "St. Justinian the Great", etc. Omitted for
  * local councils, which were convened by bishops rather than an emperor.
  */
 presidingEmperor?: string;
 /** Who summoned or presided, for local councils with no presiding emperor. */
 convenedBy?: string;
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
 /** Set on a council whose account here is ours and awaits a priest's review
 * (from 1.8, the local councils whose canons were added); the profile says so. */
 review?: { status: "awaiting-clergy-review"; since: string };
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
 slug: "arianism",
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
 "The Cappadocian theology was the air the Council breathed. St. Gregory of Nyssa, the youngest of the three Cappadocians and brother of St. Basil who had died two years before, was present. St. Cyril of Jerusalem, whose Catechetical Lectures had formed two generations of catechumens in the Faith, was vindicated by the Council against earlier slanders. St. Meletius of Antioch was the elder of the Antiochene tradition, and presided over the Council until his death during its sessions. The Council's work was not so much to invent as to confess: to take the Nicene Creed, which the Cappadocians had been preaching for a generation, and to receive it in its mature form.",
 "The Creed they issued is the Creed every Orthodox Christian recites today at the Divine Liturgy. To the Nicene Symbol they added the full article on the Holy Spirit (\"the Lord and Giver-of-Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified\"), the closing articles on the Church, baptism, the resurrection, and the age to come, and the title Lord and Giver of Life that has shaped Orthodox pneumatology ever since. The Filioque clause that the West would later add to the article on the Spirit is not in the original Creed of 381 and has never been part of the Creed as the Orthodox Church receives and recites it.",
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
 ],
 principalOpposed: [
 {
 slug: "macedonianism",
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
 {
 slug: "ephesus",
 ordinal: 3,
 name: "The Third Ecumenical Council",
 byname: "The Council of Ephesus",
 year: 431,
 location: "Ephesus in Asia Minor (modern Selçuk, Türkiye)",
 presidingEmperor: "St. Theodosius II (with St. Valentinian III in the West)",
 bishopsAttending: "Approximately 200 Holy Fathers",
 shortBio:
 "The Third Council, called by St. Theodosius II in 431 to settle the controversy raised by the Patriarch Nestorius of Constantinople. It deposed Nestorius and confessed the doctrine he had refused: that the Word of God truly became flesh in the womb of the Virgin Mary, who is therefore rightly called Theotokos, the Mother of God.",
 defined: [
 "That the Virgin Mary is truly Theotokos (Θεοτόκος, God-bearer, Mother of God), because the one whom she bore is one Person, the Word made flesh, who is God from all eternity.",
 "That Christ is one Person in two natures, divine and human, united from the moment of His conception in the womb without confusion: the union is hypostatic, not merely a moral conjunction.",
 "The Nicene Creed (in its 325 form, later completed at Constantinople 381) as the sole baptismal confession of the Faith; no other creed may be presented to candidates for baptism.",
 "The autocephaly of the Church of Cyprus against the encroachment of the See of Antioch (Canon VIII), the constitutional precedent for the autocephaly of other national Churches.",
 ],
 condemned: [
 "Nestorianism: the teaching of Nestorius, Patriarch of Constantinople, that there are in Christ two distinct persons (a divine and a human) in moral conjunction rather than hypostatic union, with the consequence that Mary is rightly called Christotokos (Mother of Christ) but not Theotokos (Mother of God).",
 "Pelagianism: the teaching of the British monk Pelagius that man can attain to salvation by his own natural powers without the necessity of grace, condemned at Ephesus in solidarity with the Council of Carthage of 418 and the prior Western condemnations.",
 "Celestianism: the related Pelagian teaching of Celestius.",
 ],
 life: [
 "By the 420s the long Trinitarian struggle of the fourth century had given way to a new question: how the union of the divine and the human in the one Christ is to be confessed. The Antiochene exegetical tradition, with its strong sense of the integrity of Christ's human nature, found in the Bishop of Mopsuestia, Theodore (the teacher of John Chrysostom's old fellow-disciple), a teacher who pressed the distinction between the two natures so far as to speak almost of two distinct persons united in one. His pupil Nestorius, made Patriarch of Constantinople in 428, took up the same idiom and preached publicly in his cathedral that Mary should not be called Theotokos (Mother of God), because no creature can have given birth to the divine nature; she should be called Christotokos (Mother of Christ) instead.",
 "The Patriarch of Alexandria, St. Cyril, answered. In a series of letters to Nestorius (the Second Letter and the Third Letter are the famous ones) he set out the case that the Theotokos was not a title of Mary's dignity but a title of Christ's identity: the one who was born of her was the eternal Word in His own person, made flesh in her womb without confusion of natures and without the introduction of a second person. To call her Theotokos was to confess that the man Jesus Christ was God; to refuse the title was to confess that the man Jesus Christ was someone other than God, joined to God by grace alone, in which case the work of salvation is no longer the work of God Himself.",
 "Pope Celestine of Rome, in synod at Rome in 430, formally condemned Nestorius and entrusted the execution of the sentence to Cyril. Cyril sent Nestorius a third letter appending Twelve Anathemas summarizing the case against him. The Emperor Theodosius II, while sympathetic to Nestorius personally, summoned an Ecumenical Council to settle the question.",
 "The Council opened on June 22, 431, in the Church of the Theotokos at Ephesus. About two hundred bishops were present. Cyril presided. The Council waited some weeks for the Antiochene contingent under John of Antioch, who supported Nestorius and was delayed on the road; when they did not arrive, the Council proceeded. It read Cyril's Second Letter to Nestorius and unanimously accepted it as conformable to the Nicene Faith; it read Nestorius's reply and unanimously condemned it; it deposed Nestorius from the throne of Constantinople. The crowds of Ephesus, who had loved the Theotokos for centuries as the patroness of their city, lit torches that night and accompanied the Fathers in procession crying, \"Praised be the Theotokos.\"",
 "John of Antioch arrived four days later with the Eastern bishops and held a counter-synod that deposed Cyril and Memnon of Ephesus. The papal legates from Rome then arrived and joined Cyril's Council, ratifying the deposition of Nestorius and the Theotokos confession. The Emperor, after months of confusion, accepted the Council's decision; Nestorius was exiled, eventually to the Egyptian desert, where he reposed around the year 450 still refusing the title.",
 "Two years later, in 433, Cyril and John of Antioch reconciled through the Formula of Reunion, a short Christological statement drafted at Antioch and accepted at Alexandria. It received the Theotokos and the hypostatic union, and Cyril for his part acknowledged that the language of \"two natures\" could be used of Christ in a sense compatible with His one person. The Formula is one of the foundations on which the Council of Chalcedon would build twenty years later.",
 ],
 principalFathers: [
 {
 slug: "cyril-of-alexandria",
 name: "St. Cyril of Alexandria",
 role: "Patriarch of Alexandria; presider of the Council; author of the Second and Third Letters to Nestorius and the Twelve Anathemas. The principal theological voice of the Council from its first session.",
 },
 {
 slug: "memnon-of-ephesus",
 name: "St. Memnon of Ephesus",
 role: "Bishop of Ephesus, host of the Council in the great Church of the Theotokos in his city; deposed by John of Antioch's counter-synod and restored.",
 },
 {
 slug: "juvenal-of-jerusalem",
 name: "St. Juvenal of Jerusalem",
 role: "Patriarch of Jerusalem; one of the senior bishops at the Council; ratified the Theotokos and the deposition of Nestorius.",
 },
 {
 slug: "celestine-of-rome",
 name: "St. Celestine of Rome",
 role: "Pope of Rome; condemned Nestorius at the Roman synod of 430 in advance of the Ecumenical Council, and entrusted the execution of the sentence to Cyril. Represented at Ephesus by his legates Arcadius, Projectus, and Philip.",
 },
 ],
 principalOpposed: [
 {
 slug: "nestorianism",
 name: "Nestorius, Patriarch of Constantinople",
 teaching: "Preached publicly that Mary is rightly called Christotokos (Mother of Christ) but not Theotokos (Mother of God), and taught that the union of the divine and human natures in Christ is a conjunction of two distinct persons in one prosopon of dignity, rather than a hypostatic union in the person of the Word. Deposed by the Council and exiled.",
 },
 {
 name: "Pelagius and Celestius",
 teaching: "British and Italian monks of the prior generation who taught that man can attain to righteousness by his own natural powers without the necessity of saving grace. Condemned at Ephesus in solidarity with the prior Western condemnations.",
 },
 ],
 documents: [
 {
 slug: "the-second-letter-of-cyril",
 title: "The Second Letter of St. Cyril to Nestorius",
 subtitle: "Read at the Council's first session, 431",
 blurb:
 "St. Cyril's letter of 430 to Nestorius on how the Word of God became man and why the holy Virgin is the Mother of God, read at the Council's first session and declared by the bishops, one after another, to agree with the Creed of Nicaea. With the Council's own record of that verdict.",
 topics: ["Letter", "Christology", "Theotokos", "Nestorianism", "Creed"],
 },
 {
 slug: "the-third-letter-of-cyril",
 title: "The Third Letter of St. Cyril to Nestorius, with the Twelve Anathematisms",
 subtitle: "From the synod of Alexandria, November 430",
 blurb:
 "St. Cyril's letter from the synod of Alexandria, with the Twelve Anathematisms Nestorius was asked to accept: one Christ, the Word united to flesh hypostatically, the holy Virgin the Mother of God, the Word who suffered in the flesh. Read at the Council's first session.",
 topics: ["Letter", "Anathemas", "Christology", "Theotokos", "Nestorianism"],
 },
 {
 slug: "the-sentence-against-nestorius",
 title: "The Sentence against Nestorius",
 subtitle: "The Council's decree at its first session, 22 June 431",
 blurb:
 "The Council's own sentence, given after Nestorius refused its summons: that he be removed from the episcopal dignity and from all priestly communion, by the canons and the letter of Pope Celestine.",
 topics: ["Sentence", "Nestorianism"],
 },
 {
 slug: "the-eight-canons",
 title: "The Eight Canons",
 subtitle: "The disciplinary canons of the Council, 431",
 blurb:
 "All eight canons of the Council of Ephesus in full, each followed where extant by the Ancient Epitome. Covers the reception of the Nestorian and Pelagian parties, the restoration of clergy unjustly deposed by Nestorius's faction, the integrity of the Nicene Creed as the sole baptismal confession (Canon VII), and the autocephaly of the Church of Cyprus against the encroachment of Antioch (Canon VIII).",
 topics: ["Canons", "Nestorianism", "Pelagianism", "Creed", "Autocephaly"],
 },
 {
 slug: "the-formula-of-reunion",
 title: "The Formula of Reunion",
 subtitle: "In St. Cyril's letter to John of Antioch, 433",
 blurb:
 "The confession on which St. Cyril and John of Antioch made peace in 433, two years after the Council, quoted in full in Cyril's letter “Let the heavens rejoice”: one Christ, perfect God and perfect man, a union of two natures, and the holy Virgin the Mother of God. Read again at Chalcedon.",
 topics: ["Letter", "Christology", "Reunion", "Theotokos"],
 },
 ],
 },
 {
 slug: "chalcedon",
 ordinal: 4,
 name: "The Fourth Ecumenical Council",
 byname: "The Council of Chalcedon",
 year: 451,
 location: "Chalcedon (modern Kadıköy, İstanbul, Türkiye), across the Bosphorus from Constantinople",
 presidingEmperor: "St. Marcian (with St. Pulcheria as Empress regnant in the East; Valentinian III in the West)",
 bishopsAttending: "Approximately 520 Holy Fathers (the largest of the Seven)",
 shortBio:
 "The Fourth Council, called by St. Marcian and St. Pulcheria in 451 to settle the Eutychian controversy. It confessed Christ as one Person in two natures, without confusion, change, division, or separation, the formula on which Eastern Orthodox Christology has rested ever since. The post-Chalcedonian Oriental Orthodox separation, named honestly below, is the most consequential rift in the early Church.",
 defined: [
 "The Christological formula in its mature form: that the one Lord Jesus Christ is to be acknowledged in two natures (ἐν δύο φύσεσιν), divine and human, without confusion (ἀσυγχύτως), without change (ἀτρέπτως), without division (ἀδιαιρέτως), and without separation (ἀχωρίστως); the distinction of natures by no means taken away by the union, but rather the properties of each preserved and concurring in one Person and one Hypostasis.",
 "The full reception of the Nicene Faith (325) and the Constantinopolitan completion (381) as inviolable, and the Cyrilline letters (the Second Letter to Nestorius, the Letter to John of Antioch) as the standard against which Christological language is to be measured.",
 "The Tome of Pope Leo I (449) as conformable to the Nicene and Cyrilline Faith and a normative statement of the two natures. (The Tome's reception was the practical occasion for the Council's own Definition.)",
 "Thirty disciplinary canons covering the clerical life: simoniacal ordination, ordination at large, the deaconess order, the marriage of readers and singers, jurisdiction of metropolitans, the procedure for clerical lawsuits, the protection of monasteries, and (in Canon XXVIII) the extension to the See of Constantinople of the prerogatives the First Council of Constantinople had given New Rome.",
 ],
 condemned: [
 "Eutychianism: the teaching of the elderly Archimandrite Eutyches of Constantinople that after the union there is only one nature in Christ (a divine nature, the human nature being absorbed). Eutyches was deposed in 448 by Patriarch Flavian of Constantinople and then restored at the so-called Robber Council of Ephesus in 449; Chalcedon condemned him definitively.",
 "The Robber Council of Ephesus (449): not an Ecumenical Council but a violent synod presided by Dioscorus of Alexandria, which restored Eutyches, deposed Flavian (who died of his injuries days later), and prevented the reading of the Tome of Leo. Chalcedon annulled all its acts.",
 "Dioscorus of Alexandria: deposed by the Council for his presidency of the Robber Council and for refusing repeated summons to answer for it. The Council's sentence was personal and procedural, not directly on his Christology; the wider Christological dispute with the non-Chalcedonian party began in earnest after his deposition.",
 ],
 life: [
 "Twenty years after the Council of Ephesus had settled the Nestorian question and twenty years after the Formula of Reunion had healed the breach between Cyril and the Antiochene party, a new Christological dispute opened in Constantinople. The Archimandrite Eutyches, the aged superior of a great monastery near the imperial city, was an outspoken anti-Nestorian who taught publicly that in Christ, after the union, there is only one nature: the divine nature, which has absorbed the human. The Patriarch of Constantinople, St. Flavian, summoned a local synod in 448, examined the doctrine, and deposed Eutyches.",
 "Eutyches appealed to the Emperor Theodosius II and to his powerful patron Dioscorus, the Patriarch of Alexandria and successor to Cyril. Theodosius summoned a council to meet at Ephesus in August 449 to re-examine the case. Dioscorus presided. The Council restored Eutyches, deposed Flavian (who was beaten so badly that he died on the road into exile a few days later), and prevented the reading of the Tome of Pope Leo, the dogmatic letter Leo had sent to Flavian setting out the Christology of the West. The papal legates protested and withdrew. Pope Leo, hearing what had happened, named the council the Latrocinium, the Robber Council, and refused to recognize its acts.",
 "Theodosius II died in 450 in a fall from his horse. His sister St. Pulcheria, the most theologically educated of the imperial family, took the throne and married the senior general Marcian, who became co-emperor. Pulcheria and Marcian summoned a new Ecumenical Council to undo the work of the Robber Council and settle the question once and for all. It convened at Chalcedon, across the Bosphorus from Constantinople, in October of 451. About five hundred and twenty bishops attended, the largest gathering of the Ecumenical era. The papal legates presided in the Pope's name, with the imperial commissioners managing the procedure on behalf of the emperor.",
 "The Council annulled the acts of the Robber Council, restored the memory of Flavian, deposed Dioscorus of Alexandria for his presidency at the Robber Council and his refusal to answer the summons, condemned Eutyches by name, and at its Fifth Session (October 22) issued the Definition of Faith: that the one Lord Jesus Christ is to be acknowledged in two natures, without confusion, without change, without division, without separation. The four alpha-privatives have been the negative grammar of Eastern Orthodox Christology ever since.",
 "The Council also enacted thirty disciplinary canons. The famous Canon XXVIII confirmed and extended to the See of Constantinople the prerogatives the First Council of Constantinople had given to New Rome, against the formal protest of the Roman legates. The Pope did not receive Canon XXVIII (the Roman Church's reasons are noted in the editorial commentary that accompanies the canon's source text); the Eastern Orthodox Church received it as the canonical foundation of the Patriarchate of Constantinople and the order of the five (later four) ancient sees.",
 "On the post-Chalcedonian separation: the Council's deposition of Dioscorus and its Definition of Faith were not received by the Egyptian and Syrian churches that held to the strict Cyrilline formula \"one incarnate nature of God the Word.\" These churches gathered into what is today called the Oriental Orthodox communion (Coptic, Syriac, Armenian, Ethiopian, Eritrean, Malankara), historically distinct from the Eastern Orthodox communion that received Chalcedon. The Christological difference between the two communions has been the subject of formal theological dialogue since the 1960s. The Eastern Orthodox Church has not formally received the Oriental Orthodox confession as identical to her own; the question is genuinely contested within the Eastern Orthodox jurisdictions themselves. Purify, in keeping with the doctrinal stance set out on /about, does not adjudicate the question: it names the historical separation honestly, serves the Definition and the Tome as the Council itself issued them, and directs the reader to their own bishop and to the published dialogue documents for further direction.",
 ],
 principalFathers: [
 {
 slug: "leo-the-great",
 name: "St. Pope Leo I (the Great)",
 role: "Pope of Rome; not present at the Council in person but present through his Tome, the dogmatic letter on Christology he had sent to Flavian in 449. When the Tome was finally read at the Council's Second Session, the assembled Fathers cried, \"Peter has spoken through Leo.\"",
 },
 {
 slug: "anatolius-of-constantinople",
 name: "St. Anatolius of Constantinople",
 role: "Patriarch of Constantinople; one of the four presiders alongside the papal legates. Carried the work of the Council on the Eastern side.",
 },
 {
 slug: "juvenal-of-jerusalem",
 name: "St. Juvenal of Jerusalem",
 role: "Patriarch of Jerusalem; secured at this Council the elevation of Jerusalem from a metropolitanate of Caesarea Palaestina to one of the five great sees (the Pentarchy).",
 },
 {
 slug: "marcian-the-emperor",
 name: "St. Marcian the Emperor",
 role: "Eastern Emperor; with St. Pulcheria summoned the Council, attended in person at the Sixth Session, ratified the Definition of Faith, and gave the Council the imperial weight by which its decrees became civil as well as ecclesial law throughout the Eastern half of the empire.",
 },
 {
 slug: "pulcheria-the-empress",
 name: "St. Pulcheria the Empress",
 role: "Eastern Empress; sister of Theodosius II and wife of Marcian, the most theologically learned of the imperial family. With Marcian she summoned the Council and ratified its Definition of Faith.",
 },
 ],
 principalOpposed: [
 {
 slug: "eutychianism",
 name: "Eutyches of Constantinople",
 teaching: "Aged Archimandrite of a great monastery near Constantinople; taught that in Christ, after the union, there is only one nature, the divine nature having absorbed the human. The Council deposed him by name and condemned the formula.",
 },
 {
 name: "Dioscorus of Alexandria",
 teaching: "Patriarch of Alexandria and successor to Cyril; presided over the Robber Council of Ephesus in 449. Deposed at Chalcedon for his presidency at the Robber Council and for refusing the summons to answer for it. His Christology proper was the strict Cyrilline formula \"one incarnate nature of the divine Word\"; the wider non-Chalcedonian (\"miaphysite\") movement received him as a confessor.",
 },
 ],
 documents: [
 {
 slug: "the-tome-of-leo",
 title: "The Tome of St. Leo",
 subtitle: "St. Leo's letter to St. Flavian, 449, in the reading room",
 blurb:
 "The dogmatic letter of Pope St. Leo to St. Flavian of Constantinople, read at the Council's second session. It opens in the reading room among St. Leo's works, in the translation of the Nicene and Post-Nicene Fathers, Series II, Vol. 12.",
 topics: ["Letter", "Christology", "Two Natures", "Eutychianism"],
 href: "/saints/leo-the-great/the-tome-of-leo",
 },
 {
 slug: "the-definition-of-faith",
 title: "The Definition of Faith",
 subtitle: "The Definition of the Council on the one Christ in two natures, 451",
 blurb:
 "The Council's Definition in full. It receives the Creeds of Nicaea and Constantinople, the synodical letters of St. Cyril and the Tome of St. Leo, and confesses one and the same Christ in two natures, without confusion, without change, without division, without separation.",
 topics: ["Definition", "Christology", "Two Natures", "Eutychianism", "Nestorianism"],
 },
 {
 slug: "the-thirty-canons",
 title: "The Thirty Canons",
 subtitle: "The disciplinary canons of the Council, 451",
 blurb:
 "All thirty disciplinary canons of the Council of Chalcedon in full, each followed where extant by the Ancient Epitome. Covers simoniacal ordination, ordination at large, the deaconess order, monastic life, jurisdiction of metropolitans, clerical lawsuits, and (in Canon XXVIII) the extension to the See of Constantinople of the prerogatives given to New Rome at the First Council of Constantinople. Canon XXVIII has been received by the Eastern Orthodox Church and has not been received by the Roman Catholic Church.",
 topics: ["Canons", "Discipline", "Patriarchate", "Monasticism", "Diaconesses", "New Rome"],
 },
 ],
 },
 {
 slug: "second-constantinople",
 ordinal: 5,
 name: "The Fifth Ecumenical Council",
 byname: "Second Council of Constantinople",
 year: 553,
 location: "Constantinople (modern İstanbul, Türkiye)",
 presidingEmperor: "St. Justinian the Great",
 bishopsAttending: "Approximately 165 Holy Fathers",
 shortBio:
 "The Fifth Council, called by St. Justinian in 553 to settle the long controversy over the Three Chapters and to seal the reading of Chalcedon in the precise Cyrilline key. It confessed that one of the Holy Trinity suffered in the flesh, anathematized the Three Chapters, and condemned the errors of Origen.",
 defined: [
 "The Cyrilline (neo-Chalcedonian) reading of Chalcedon: that the union of the Word with the flesh is hypostatic and synthetic, not a relative conjunction of two persons, so that the natures are confessed without division and without confusion in the one hypostasis of the Word.",
 "The Theopaschite confession, that one of the Holy Trinity, God the Word, was crucified in the flesh and is true God and Lord of Glory (the tenth anathema), reconciling the orthodox formula \"One of the Trinity suffered in the flesh\" with the Faith of Chalcedon.",
 "That the holy Virgin is in the strict and true sense Theotokos and ever-virgin (ἀειπάρθενος), against every relative or qualified use of the title.",
 ],
 condemned: [
 "The Three Chapters: the person and the writings of Theodore of Mopsuestia (the teacher whose Christology lay behind Nestorianism); the writings of Theodoret of Cyrus against St. Cyril and the First Council of Ephesus; and the Letter said to have been written by Ibas to Maris the Persian. The Council condemned the errors while distinguishing the cases of Theodoret and Ibas, who had been received at Chalcedon, from that of Theodore.",
 "Origenism: the speculative errors associated with Origen, Didymus, and Evagrius (the pre-existence of souls, the eventual restoration of all things), named with the prior heretics in the eleventh anathema and condemned in the wider synodal acts.",
 "Arius, Eunomius, Macedonius, Apollinaris, Nestorius, and Eutyches, renewed by name as already condemned by the four prior councils.",
 ],
 life: [
 "A century after Chalcedon the Eastern Church was still not at peace. The Definition of 451, that Christ is acknowledged in two natures, had been received by the imperial Church, but a large body of the faithful in Egypt and Syria held to the strict formula of St. Cyril, \"one incarnate nature of God the Word,\" and read the two-natures language of Chalcedon as a concession to Nestorianism. The separation hardened into the non-Chalcedonian communion. The Emperor St. Justinian, the most theologically engaged of all the Christian emperors, devoted much of his long reign to the reconciliation of these churches without surrendering the Faith of Chalcedon.",
 "His instrument was the demonstration that Chalcedon, rightly read, taught nothing other than Cyril. To make the point he turned against three bodies of writing that the non-Chalcedonians cited as evidence that Chalcedon had sheltered Nestorianism: the works of Theodore of Mopsuestia, whose Christology had been the seed of the Nestorian error; the polemics of Theodoret of Cyrus against Cyril; and the Letter ascribed to Ibas of Edessa, which praised the Antiochene party and reproached Cyril. These three together were called the Three Chapters. Justinian condemned them by edict around 544 and pressed the bishops of the whole Church to subscribe.",
 "The condemnation met resistance, above all in the West, where it was feared that to condemn writings of men who had died in the peace of the Church, and two of whom (Theodoret and Ibas) had been personally received at Chalcedon, was to reopen and dishonour the Fourth Council. Pope Vigilius of Rome, brought to Constantinople, vacillated for years: he condemned the Chapters, then withdrew the condemnation under Western pressure, then withheld his assent from the Council itself. Justinian summoned the Ecumenical Council to settle the matter conciliarly.",
 "The Council opened in the great church at Constantinople in May of 553 under the presidency of the Patriarch Eutychius, with about one hundred and sixty-five bishops, overwhelmingly Eastern. It examined the writings of Theodore and found in them the blasphemies set out at length in its twelfth anathema; it condemned the writings of Theodoret against Cyril and the Letter to Maris, while carefully distinguishing the persons of Theodoret and Ibas, received at Chalcedon upon their anathematizing of Nestorius, from the condemned writings. It issued fourteen anathematisms (the Capitula) confessing the Trinitarian and Christological Faith in the precise key Justinian had sought and condemning the Three Chapters by name.",
 "Pope Vigilius, who had refused to attend, at first published a Constitutum withholding his assent; the Council removed his name from the diptychs while keeping communion with the Roman see. Some months later Vigilius reversed himself, accepting the Council and its condemnation of the Three Chapters; his successor Pelagius defended it in the West. The Council's reception there was slow and painful, occasioning a temporary schism of the churches of northern Italy, but in time the whole Church received it as the Fifth of the Seven.",
 "The Council is also remembered for its condemnation of Origenism. The speculative system associated with Origen and developed by Evagrius, the pre-existence of souls and the apokatastasis or final restoration of all rational creatures including the demons, had spread among the monks of Palestine. A series of fifteen anathemas against the Origenists is associated with the synod, and the name of Origen stands in the eleventh of the conciliar Capitula among the heretics the Council anathematized. With Chalcedon thus secured in its Cyrilline reading and the errors of Origen condemned, the Council closed the Christological labour of the sixth century, though the reconciliation of the non-Chalcedonian churches that Justinian sought was not achieved and remains the work of dialogue to this day.",
 ],
 principalFathers: [
 {
 slug: "justinian-the-great",
 name: "St. Justinian the Great",
 role: "Emperor; summoned the Council, and through his theological edicts and his treatise against the Three Chapters framed its work. Author of the hymn \"Only-begotten Son and Word of God,\" which confesses the Theopaschite faith the Council sealed.",
 },
 {
 slug: "eutychius-of-constantinople",
 name: "St. Eutychius of Constantinople",
 role: "Patriarch of Constantinople; presided over the Council. Later exiled and restored, he is commemorated as a confessor.",
 },
 {
 slug: "cyril-of-alexandria",
 name: "St. Cyril of Alexandria",
 role: "Though reposed in 444, his Christology was the standard against which the Council measured Chalcedon. His Twelve Chapters and his letters against Nestorius are named as the rule of right faith, and the Council's whole work is the vindication of his reading of the union.",
 },
 ],
 principalOpposed: [
 {
 name: "The Three Chapters and their defenders",
 teaching: "The person and writings of Theodore of Mopsuestia, the anti-Cyrilline writings of Theodoret of Cyrus, and the Letter ascribed to Ibas of Edessa, together with those who defended them as having been vindicated at Chalcedon. The Council condemned the writings while distinguishing the persons received at Chalcedon.",
 },
 {
 slug: "origenism",
 name: "Origen, Didymus, and Evagrius",
 teaching: "The Origenist speculation of the pre-existence of souls and the final restoration of all rational beings, spread among the Palestinian monks. Condemned by the Council with the prior heretics.",
 },
 {
 name: "Pope Vigilius (in his resistance)",
 teaching: "Pope of Rome, brought to Constantinople; vacillated for years over the condemnation of the Three Chapters and withheld assent from the Council in his first Constitutum. He afterward accepted the Council and its decrees, and his successor Pelagius defended it.",
 },
 ],
 documents: [
 {
 slug: "the-sentence-of-the-synod",
 title: "The Sentence of the Synod",
 subtitle: "The Council's judgment on the Three Chapters, 553",
 blurb:
 "The Council's judgment of June 553 in full: how it examined the person and writings of Theodore of Mopsuestia, Theodoret's writings against St. Cyril and the letter ascribed to Ibas, why Pope Vigilius did not judge with it, and its reception of the four councils before it.",
 topics: ["Sentence", "Three Chapters", "Christology", "Nestorianism"],
 },
 {
 slug: "the-capitula",
 title: "The Capitula (The Fourteen Anathemas)",
 subtitle: "The dogmatic anathematisms of the Council, 553",
 blurb:
 "All fourteen anathematisms of the Fifth Council in full. The first ten confess the Trinitarian and Christological Faith in the precise Cyrilline key, including the Theopaschite confession that one of the Holy Trinity was crucified in the flesh. The eleventh lists the condemned heretics and adds Origen; the last three condemn the Three Chapters by name, the person and writings of Theodore of Mopsuestia, the writings of Theodoret against Cyril, and the Letter ascribed to Ibas to Maris the Persian.",
 topics: ["Anathemas", "Christology", "Three Chapters", "Theopaschism", "Origenism", "Theotokos"],
 },
 {
 slug: "the-fifteen-anathemas-against-origen",
 title: "The Fifteen Anathemas against Origen",
 subtitle: "Handed down with the Council, 553",
 blurb:
 "Fifteen anathemas against the teaching drawn from Origen in sixth-century Palestine: souls existing before their bodies, the restoration of all things, a Christ who is one created mind among the rest. Handed down with the Council; whether the Council itself passed them is disputed.",
 topics: ["Anathemas", "Origenism", "Apokatastasis"],
 },
 ],
 },
 {
 slug: "third-constantinople",
 ordinal: 6,
 name: "The Sixth Ecumenical Council",
 byname: "Third Council of Constantinople",
 year: 681,
 location: "Constantinople (modern İstanbul, Türkiye), in the domed hall (Trullus) of the imperial palace",
 presidingEmperor: "Constantine IV (Pogonatus)",
 bishopsAttending: "Approximately 170 Holy Fathers",
 shortBio:
 "The Sixth Council, called by Constantine IV in 680 to settle the controversy over the will and operation of Christ. It confessed two natural wills and two natural operations in the one Christ, the human will freely submitting to the divine, and condemned Monothelitism with its authors by name. It vindicated the confession for which St. Maximus the Confessor had suffered.",
 defined: [
 "That in the one Lord Jesus Christ there are two natural wills and two natural operations (energies), indivisibly, inconvertibly, inseparably, and inconfusedly, according to the reality of each of His two natures.",
 "That the two wills are not contrary the one to the other; rather the human will follows, and is subject to, His divine and omnipotent will, not as resisting and reluctant but as deified, the proper will of the flesh of God the Word.",
 "The full reception of the five prior councils and of the Letter of Pope St. Agatho and his Roman synod of 125 bishops, received as consonant with Chalcedon, the Tome of St. Leo, and the letters of St. Cyril.",
 ],
 condemned: [
 "Monothelitism and Monoenergism: the teaching that in Christ there is but one will and one operation, devised in the seventh century as a formula to reconcile the non-Chalcedonians and shown by the Council to destroy the perfection of His humanity.",
 "The authors of the heresy by name: Theodore of Pharan; Sergius, Pyrrhus, Paul, and Peter, Archbishops of Constantinople; Cyrus of Alexandria; and Macarius of Antioch with his disciple Stephen.",
 "Honorius, who was Pope of the elder Rome, named in the Council's Definition among those through whom the author of evil had worked, for his support of the doctrine of one will in his correspondence with Sergius.",
 ],
 life: [
 "The Christological labour did not end with the reconciling formula of two natures. In the early seventh century, with Egypt and Syria still divided from the imperial Church over Chalcedon and the Empire pressed hard by Persia and then by the Arab conquests, the Patriarch Sergius of Constantinople and the Emperor Heraclius sought a formula that might draw the non-Chalcedonians back into communion. They proposed that, whatever was said of His two natures, in Christ there is but one operation, and then one will. To confess a single energy and a single will, it was hoped, would satisfy those who feared that two natures meant two acting subjects.",
 "The formula was at first widely accepted, and Cyrus of Alexandria used it to bring a body of the Egyptian church into union. But a monk of Palestine, St. Sophronius, soon to be Patriarch of Jerusalem, saw at once that it imperilled the Faith: a Christ with only a divine will and operation is a Christ whose humanity does not truly will or act, and therefore does not truly save. If He has no human will, then the human will, the seat of our fall, is not assumed and not healed.",
 "The defence of the two wills fell above all to St. Maximus, called the Confessor, the greatest theologian of the age. Against Monothelitism he set out that will and operation follow upon nature, not upon person: as Christ has two natures whole and entire, so He has a divine will and a human will, and the salvation of man consists precisely in this, that in Gethsemane the human will of Christ, free and unconstrained, submitted itself to the will of the Father, healing in itself the rebellion of Adam. Pope St. Martin I held a great synod at the Lateran in 649 that condemned Monothelitism. For their confession Martin and Maximus were seized by the imperial power, tried, and cruelly punished: Martin died in exile, and Maximus, his tongue cut out and his right hand cut off so that he could neither speak nor write the Faith, died in 662. The Council that vindicated them met nineteen years after his repose.",
 "The Emperor Constantine IV, seeking peace in the Church after the Monothelite policy had failed to reunite the lost provinces now under Arab rule, summoned the Ecumenical Council. It opened in November of 680 in the domed hall (Trullus) of the imperial palace at Constantinople, with about one hundred and seventy bishops, and sat through eighteen sessions into September of 681. Pope St. Agatho sent a dogmatic Letter, the fruit of a Roman synod of 125 bishops, setting out the two wills and two operations as the Faith of the Apostolic see; when it was read, the Council received it as Agatho's confession of the unchanging Faith.",
 "The Council examined the patristic witness and the record of the controversy and issued its Definition: in the one Christ there are two natural wills and two natural operations, undivided and unconfused, the human will not abolished by its union with the divine but preserved and deified, following the divine will freely and without reluctance. The four alpha-privatives of Chalcedon were thus extended from the natures to the wills and the energies, completing the Church's confession of the wholeness of Christ's humanity.",
 "The Council condemned Monothelitism and anathematized its authors by name, Theodore of Pharan, the Patriarchs Sergius, Pyrrhus, Paul, and Peter of Constantinople, Cyrus of Alexandria, and Macarius of Antioch, and, in its Definition, Honorius who had been Pope of Rome, for the support he had lent the doctrine of one will in his letters to Sergius. Purify names the condemnation of Honorius exactly as the Council named it: the Sixth Council, with the assent of the legates of Agatho's successor, placed him among the condemned. The doctrine for which St. Maximus had been mutilated and exiled was now the confession of the whole Church.",
 ],
 principalFathers: [
 {
 slug: "maximus-the-confessor",
 name: "St. Maximus the Confessor",
 role: "Not present, having reposed in 662, mutilated and exiled for the Faith; but the Council was the vindication of his theology. He, more than any other, articulated that will and operation follow nature, and that the free submission of Christ's human will is the healing of Adam's fall.",
 },
 {
 slug: "agatho-of-rome",
 name: "St. Agatho of Rome",
 role: "Pope of Rome; his dogmatic Letter, with the synodal letter of his Roman council of 125 bishops, was the charter the Council received as the confession of the Apostolic see. The Council acclaimed it as the voice of Peter.",
 },
 {
 slug: "sophronius-of-jerusalem",
 name: "St. Sophronius of Jerusalem",
 role: "Patriarch of Jerusalem; the first to raise the alarm against the formula of one operation and one will, and the early standard-bearer of the two-wills confession the Council defined.",
 },
 {
 slug: "martin-the-confessor",
 name: "St. Martin the Confessor",
 role: "Pope of Rome; convened the Lateran Synod of 649 that condemned Monothelitism, for which he was seized by the imperial power and died in exile. His synod prepared the doctrinal ground for the Council.",
 },
 ],
 principalOpposed: [
 {
 slug: "monothelitism",
 name: "Monothelitism (Sergius, Cyrus, and the Patriarchs)",
 teaching: "The doctrine of one will and one operation in Christ, devised by Patriarch Sergius of Constantinople and Cyrus of Alexandria under the Emperor Heraclius as a formula to reconcile the non-Chalcedonians. Condemned by the Council with its authors Theodore of Pharan, Sergius, Pyrrhus, Paul, and Peter of Constantinople, Cyrus, and Macarius of Antioch named by name.",
 },
 {
 name: "Pope Honorius of Rome",
 teaching: "Pope of Rome (d. 638); in his correspondence with Sergius he lent support to the formula of one will. The Sixth Council named him in its Definition among those through whom the author of evil had worked, and anathematized him with the other authors of the heresy.",
 },
 ],
 documents: [
 {
 slug: "the-letter-of-agatho",
 title: "The Letter of St. Agatho to the Emperor, with the Letter of His Roman Synod",
 subtitle: "Read at the Council's fourth session, 680",
 blurb:
 "Pope St. Agatho's letter to Constantine IV on the two natural wills and the two natural operations of Christ, with the letter of his synod of 125 bishops at Rome, read at the Council's fourth session in November 680. The Council's Definition says it received the letter.",
 topics: ["Letter", "Christology", "Two Wills", "Monothelitism", "Rome"],
 },
 {
 slug: "the-definition-of-faith",
 title: "The Definition of Faith",
 subtitle: "The horos of the Council on the two wills and two operations, 681",
 blurb:
 "The dogmatic Definition of the Sixth Council in full, from its Eighteenth Session. It receives the five prior councils and the Letter of Pope St. Agatho, names and condemns the authors of Monothelitism including Honorius of Rome, and defines that in the one Christ there are two natural wills and two natural operations, the human will freely subject to the divine and not suppressed but deified.",
 topics: ["Definition", "Christology", "Two Wills", "Monothelitism", "Dyothelitism"],
 },
 {
 slug: "the-prosphoneticus",
 title: "The Prosphoneticus to the Emperor",
 subtitle: "The Council's address to Constantine IV, 681",
 blurb:
 "The Council's closing address to the Emperor Constantine IV: how the heresy of one will arose and was condemned, its confession of two natural wills and two natural operations, and its request that he set his seal on what was defined. In the extracts of the 1900 edition.",
 topics: ["Address", "Two Wills", "Monothelitism"],
 },
 {
 slug: "the-canons-of-trullo",
 title: "The Canons of the Council in Trullo",
 subtitle: "The 102 canons of the Quinisext Council, 692",
 blurb:
 "The canons the Fifth and Sixth Councils had not made, given in 692 by the bishops gathered in the same domed hall of the palace, the Trullo: the faith of the six councils confirmed, the canons of the Apostles, the councils and the Fathers received, and the discipline of clergy, monks and the faithful set out. The Greeks quoted them from the first as canons of the Sixth Council. Each with its Ancient Epitome.",
 topics: ["Canons", "Quinisext", "Discipline", "Monasticism", "Marriage", "Icons"],
 },
 ],
 },
 {
 slug: "second-nicaea",
 ordinal: 7,
 name: "The Seventh Ecumenical Council",
 byname: "Second Council of Nicaea",
 year: 787,
 location: "Nicaea in Bithynia (modern İznik, Türkiye)",
 presidingEmperor: "St. Constantine VI and St. Irene (Empress regent)",
 bishopsAttending: "Approximately 350 Holy Fathers",
 shortBio:
 "The Seventh and last of the Councils, called by St. Irene and St. Constantine VI in 787 to restore the holy icons after the first Iconoclast persecution. It defined the veneration (proskynesis) of the holy images, distinguished from the worship (latreia) due to God alone, on the ground that the honour paid to the image passes to its prototype. It vindicated the icon-theology of St. John of Damascus.",
 defined: [
 "That the venerable and holy images, like the figure of the precious and life-giving Cross, are to be set up in the churches, on the sacred vessels and vestments, on walls and in houses and by the wayside, the image of Christ, of the Theotokos, of the angels, and of all the saints.",
 "That to these images is due salutation and honourable reverence (ἀσπασμὸν καὶ τιμητικὴν προσκύνησιν), not the true worship of faith (latreia, λατρείαν) which belongs to the divine nature alone, this reverence being shown also by incense and lights according to ancient pious custom.",
 "That the honour paid to the image passes to its prototype, and he who venerates the image venerates in it the person represented, so that the making and honouring of icons is a confession that the Word of God truly became flesh and was seen.",
 ],
 condemned: [
 "Iconoclasm: the heresy of the breakers of icons, the \"traducers of the Christians,\" who styled the holy images by the same name as the idols of the heathen and stripped them from the churches.",
 "The iconoclast council of Hieria (754): the assembly under the Emperor Constantine V that had claimed the authority of an Ecumenical Council to condemn the icons. The Seventh Council refuted and annulled it as a false synod that had gathered without the consent of the other patriarchates.",
 "The leaders of the iconoclast party, whose writings against the holy images the Council ordered delivered up and locked away (Canon IX).",
 ],
 life: [
 "In the year 726 the Emperor Leo III, the Isaurian, began to move against the holy icons, and around 730 he ordered their removal and destruction. The reasons were tangled: a genuine if misguided zeal against what was thought to be idolatry, the reproach of Jews and Muslims that the Christians worshipped images, and the will of a soldier-emperor to discipline the Church. So began the first Iconoclast period, which under Leo and still more under his son Constantine V (called by his enemies Copronymus) became a fierce persecution. Icons were whitewashed and burned; the monks, who were the icons' chief defenders, were beaten, exiled, and in some cases killed.",
 "The theological defence of the icons was given its classic form, outside the reach of the iconoclast emperors, by St. John of Damascus, a monk of the monastery of St. Sabbas near Jerusalem under Muslim rule. In his Three Treatises on the Divine Images he set out the case the Council would receive: the second commandment forbids the image of the invisible and unknowable God, but in Christ the invisible God has become visible, has taken flesh and been seen, and therefore may be depicted. To deny the icon of Christ is to deny the reality of His incarnation. And the honour given to an icon is not the worship due to God; it is a relative veneration that passes to the person represented, as the honour given to the emperor's image is given to the emperor.",
 "In 754 Constantine V convened a great assembly of bishops at Hieria, across the water from Constantinople, which condemned the icons and claimed for itself the title of the Seventh Ecumenical Council. But it had been gathered by the imperial will alone; none of the other four patriarchs, nor the Pope of Rome, took part or consented. The defenders of the icons never received it, and the Seventh Council would later refute it point by point and deny it the name of an Ecumenical Synod.",
 "Constantine V died in 775. His son Leo IV was more moderate, and when Leo died in 780 the regency passed to his widow, the Empress St. Irene, who ruled for their young son Constantine VI. Irene was resolved to restore the icons. With the Patriarch St. Tarasius, freshly raised to the see of Constantinople, and in concert with Pope Adrian I and the Eastern patriarchs, she summoned an Ecumenical Council. A first attempt to convene it at Constantinople in 786 was broken up by iconoclast soldiers of the guard; the troops were dispersed, and the Council met the following year in safety at Nicaea, the city of the First Council, in September of 787.",
 "About three hundred and fifty bishops attended, with the legates of Pope Adrian and representatives of the Eastern patriarchates. Tarasius presided. The Council heard the scriptural and patristic witness to the images, examined and refuted the acts of the false council of Hieria, and received the penitent iconoclast bishops who renounced their error. At its seventh session it issued the Decree: that the holy icons are to be set up and given honourable reverence and veneration, but not the worship that belongs to God alone, for the honour passes to the prototype. The Fathers cried out their assent and pronounced anathema on those who would call the icons idols or deny them veneration.",
 "The Council also enacted twenty-two disciplinary canons, among the best of the conciliar age, restoring the order of the Church after the long persecution. But the peace it won was not final. A second Iconoclast period opened under Leo V in 815 and lasted until 843, when the Empress St. Theodora and the Patriarch St. Methodius restored the icons for good. That final victory is commemorated every year on the first Sunday of Great Lent as the Triumph of Orthodoxy, the feast of the whole Faith of the Seven Councils, of which the Decree of Nicaea II is the seal.",
 ],
 principalFathers: [
 {
 slug: "john-of-damascus",
 name: "St. John of Damascus",
 role: "Not present, having reposed around 749, but the Council was the vindication of his theology. His Three Treatises on the Divine Images gave the defence of the icons its classic form: that the invisible God, made visible in the flesh, may be depicted, and that the honour of the image passes to its prototype.",
 },
 {
 slug: "tarasius-of-constantinople",
 name: "St. Tarasius of Constantinople",
 role: "Patriarch of Constantinople; presided over the Council, received the penitent iconoclast bishops, and steered the restoration of the icons in concert with the Empress and the other patriarchates.",
 },
 {
 slug: "irene-the-empress",
 name: "St. Irene the Empress",
 role: "Empress, regent for her son Constantine VI; summoned the Council and was the imperial author of the restoration of the icons after the first Iconoclast persecution.",
 },
 {
 slug: "adrian-of-rome",
 name: "St. Adrian I of Rome",
 role: "Pope of Rome; sent his legates and his letters in support of the veneration of images, lending the consent of the Apostolic see that the false council of Hieria had lacked.",
 },
 ],
 principalOpposed: [
 {
 slug: "iconoclasm",
 name: "Iconoclasm and the council of Hieria (754)",
 teaching: "The heresy of the breakers of icons, raised under the Emperors Leo III and Constantine V, which condemned the veneration of images as idolatry and stripped them from the churches. Its council at Hieria claimed to be the Seventh Ecumenical Council; the Seventh Council refuted and annulled it as a false synod gathered without the other patriarchates.",
 },
 {
 name: "Constantine V (Copronymus)",
 teaching: "Emperor and the fiercest of the iconoclast persecutors; convened the council of Hieria and waged a sustained persecution of the icons and their monastic defenders. His acts were overturned by the Council.",
 },
 ],
 documents: [
 {
 slug: "the-decree-on-the-holy-icons",
 title: "The Decree on the Holy Icons",
 subtitle: "The Definition of the Council on the veneration of the images, 787",
 blurb:
 "The dogmatic Decree of the Seventh Council in full. After receiving the six prior councils and anathematizing the heresies they condemned, it defines that the holy images are to be set up and given honourable reverence and veneration (proskynesis), distinguished from the worship (latreia) due to God alone, because the honour paid to the image passes to its prototype. The closing acclamations of the Fathers are appended.",
 topics: ["Decree", "Icons", "Veneration", "Iconoclasm", "Incarnation"],
 },
 {
 slug: "the-twenty-two-canons",
 title: "The Twenty-Two Canons",
 subtitle: "The disciplinary canons of the Council, 787",
 blurb:
 "All twenty-two canons of the Seventh Council in full, each followed by the Ancient Epitome. Harnack judged them the best canons of any Ecumenical Synod. They bind the bishops to the whole prior canonical tradition and to the knowledge of Scripture, forbid the choice of bishops by secular princes and the buying and selling of ordination, order the consecration of churches with relics and the locking up of iconoclast writings, and regulate the monastic life.",
 topics: ["Canons", "Discipline", "Episcopate", "Monasticism", "Simony"],
 },
 ],
 },
 {
 slug: "antioch-268",
 kind: "local",
 name: "The Synods of Antioch against Paul of Samosata",
 byname: "Council of Antioch (268)",
 year: 268,
 location: "Antioch on the Orontes (modern Antakya, Türkiye)",
 convenedBy:
 "The bishops of the East, in a succession of synods through the 260s, with the final session led by the presbyter Malchion",
 bishopsAttending: "The bishops of Syria, Cappadocia, Cilicia, Palestine, and Arabia",
 shortBio:
 "A pre-Nicene synod of the bishops of the East, the last of several, that deposed Paul of Samosata, Bishop of Antioch, for teaching that the Son was not a distinct divine Person but an impersonal power of the Father, and that Christ was a man on whom that power rested. It is remembered both for condemning this early error about the Person of the Son and for its caution over the word homoousios, which the Fathers of Nicaea would later have to receive in its right sense.",
 defined: [
 "That the Son and Word of God is a true and distinct divine Person, eternally of the Father, and not merely an impersonal power, attribute, or activity of the one God.",
 "That in Jesus Christ this eternal Son was Himself incarnate, so that Christ is God come in the flesh, and not a mere man whom a divine power visited and exalted from below.",
 ],
 condemned: [
 "The teaching of Paul of Samosata, a form of what later writers called Monarchianism or adoptionism: that the Logos was an impersonal power of the Father without distinct subsistence, and that Jesus was a man, born of Mary, upon whom that power came to rest and who was advanced by grace, the denial of the Son's personal pre-existence.",
 "Paul's use of the word homoousios (of one essence) in a sense that collapsed the distinction of the Persons. The synod's wariness of the word in his mouth is why the Fathers later had to receive it carefully at Nicaea in 325, where it was confessed in its orthodox sense.",
 ],
 life: [
 "Paul of Samosata became Bishop of Antioch around the year 260, holding at the same time a high civil office under Zenobia, the queen of Palmyra who then ruled the Roman East. Contemporaries describe a man of worldly grandeur and ambition, and the synodal letter that survives reproaches both his manner of life and his doctrine. But it was his teaching on Christ that gathered the bishops of the East against him.",
 "Paul taught, in substance, that there is one God in one Person, and that the Word and the Wisdom of God are not a distinct Person but God's own reason and power, as a word is in the man who speaks it. The Son, on this account, had no personal existence before He was born of Mary. Jesus was a man, anointed and indwelt by the impersonal divine power from His baptism, and so advanced and exalted, but a man from below rather than God come down. The Church recognised in this a denial of the very thing the Gospel confesses: that the Word who was in the beginning with God, and was God, Himself became flesh.",
 "Several synods met at Antioch through the 260s to examine him. He was a practised and slippery debater, and more than once he satisfied his judges by ambiguous answers and kept his see. St. Gregory the Wonderworker of Neocaesarea and his brother Athenodorus were among the bishops in the earlier sessions; the aged Firmilian of Caesarea in Cappadocia, one of the most honoured bishops of the East, was twice called to Antioch and died at Tarsus on his way to the last of them.",
 "At the final synod, about the year 268, the presbyter Malchion, a learned man who had led the Greek school at Antioch, was set to dispute with Paul in the presence of the assembled bishops, and stenographers took down the exchange. Under this examination Paul's teaching was at last laid bare beyond his power to disguise it. The synod deposed and excommunicated him, elected Domnus in his place, and wrote a synodal letter to Dionysius of Rome, to Maximus of Alexandria, and to the whole Church, setting out what had been decided.",
 "Paul, protected by Zenobia, refused to give up the church building, and held it until the year 272, when the emperor Aurelian, having defeated Palmyra, was asked to settle the matter and ruled that the building should belong to those with whom the bishops of Italy and of Rome were in communion, a striking early appeal to communion with the wider Church as the test of the true bishop. The synod's most lasting lesson reached forward two generations: its distrust of homoousios as Paul had used it meant that when the word was needed at Nicaea against Arius, the Church had first to make plain the sense in which it confessed the Son to be of one essence with the Father.",
 ],
 principalFathers: [
 {
 name: "St. Gregory the Wonderworker",
 role: "Bishop of Neocaesarea, the great missionary and wonderworker of Pontus, who with his brother Athenodorus took part in the earlier synods against Paul.",
 },
 {
 name: "Firmilian of Caesarea",
 role: "Bishop of Caesarea in Cappadocia, among the most honoured hierarchs of the East; twice summoned to Antioch in the matter, he died at Tarsus on the way to the final synod.",
 },
 {
 name: "Malchion",
 role: "A learned presbyter of Antioch and head of its Greek school, chosen to dispute with Paul at the last synod; the stenographic record of his examination exposed Paul's teaching.",
 },
 ],
 principalOpposed: [
 {
 name: "Paul of Samosata",
 teaching:
 "Bishop of Antioch; taught that the Word was an impersonal power of the one God rather than a distinct divine Person, and that Christ was a man indwelt and exalted by that power, denying the personal pre-existence of the Son.",
 },
 ],
 documents: [],
 pendingDocuments: [
 {
 title: "The Synodal Letter against Paul of Samosata",
 note: "The letter of the bishops setting out Paul's errors and his deposition, preserved in fragments by Eusebius (Ecclesiastical History VII.30). A public-domain English text exists in the Nicene and Post-Nicene Fathers (Schaff and Wace); it will be wired in once prepared.",
 },
 {
 title: "Fragments of the Disputation of Malchion with Paul",
 note: "The surviving fragments of the stenographic record of Malchion's examination of Paul. Public-domain English exists in the Ante-Nicene Fathers (Schaff); not yet shipped.",
 },
 ],
 },
 {
 slug: "carthage-256",
 kind: "local",
 name: "The Councils of Carthage on the Baptism of Heretics",
 byname: "Council of Carthage (256)",
 year: 256,
 location: "Carthage in Roman Africa (near modern Tunis, Tunisia)",
 convenedBy: "St. Cyprian, Bishop of Carthage",
 bishopsAttending: "Eighty-seven bishops of Africa, Numidia, and Mauretania",
 reception: {
 status: "qualified",
 note: "Honoured as the witness of a hieromartyr to the unity of the Church, but its rule that all who come from heresy or schism must be baptised was not the rule the Church settled on. The later canonical tradition, in the canons of St. Basil the Great and of the councils, receives many converts by chrismation or by confession of faith according to economy.",
 },
 shortBio:
 "Two synods of the African Church under St. Cyprian of Carthage, the second gathering eighty-seven bishops who each gave sentence that baptism conferred outside the Church is no baptism, so that converts from heresy and schism must be baptised. Honoured for the witness of a great hieromartyr to the unity of the Church, its rigorist discipline was later moderated by the canonical tradition, which receives many converts by chrismation according to economy.",
 defined: [
 "That the Church is one, and that the saving grace of the Mysteries is given within her communion, so that schism and heresy cut a man off from the source of grace.",
 "That, in the judgement of these African bishops, baptism administered outside the Church by heretics or schismatics is therefore not true baptism, and those coming to the Church from such bodies are to be baptised, since they are held not to have been baptised before.",
 ],
 condemned: [
 "The practice, defended at Rome by Stephen, of receiving every heretic and schismatic who had been baptised in the name of the Trinity by the laying-on of hands alone, without baptism, which the African bishops judged to honour a baptism the Church had not given.",
 ],
 life: [
 "By the middle of the third century the Church in the West was troubled by the question of how to receive those who returned or converted from heretical and schismatic bodies, a question made urgent by the Novatianist schism. Had such people received true baptism outside the Church, to be completed on their return by repentance and the laying-on of hands? Or had they received nothing, so that they must now be baptised for the first time?",
 "St. Cyprian, Bishop of Carthage, the great pastor and teacher of the African Church, held with the African and many Eastern bishops that baptism belongs to the Church alone. There is no salvation outside the Church, he taught; the Spirit is given within her, and what the schismatic gives he does not himself possess. Two councils met at Carthage in the year 256 to settle the discipline of the African Church on this point.",
 "At the second of them, on the first of September, eighty-seven bishops gathered with their presbyters and deacons in the presence of the people, and each in turn gave his own sentence, beginning with the elder bishops and ending with Cyprian himself, who closed by saying that he judged no one and cut off no one from communion for differing, for every bishop must answer to God for his own flock. The assembled sentences are unanimous: those who come from heresy and schism are to be baptised, because the baptism they received outside was no baptism at all.",
 "The decision set the African Church against Stephen, Bishop of Rome, who held to the older Roman custom of receiving such converts by the laying-on of hands without rebaptism, and who pressed his practice on Africa and the East. The dispute was sharp, but it did not break communion; Cyprian was soon arrested in the persecution of Valerian and crowned a martyr in 258, and is honoured by the whole Church as a hieromartyr and a Father.",
 "The Church did not in the end make Cyprian's rigour her universal rule. The later canonical tradition, in the canons of St. Basil the Great and of the councils, distinguishes among those who come from outside and receives many of them not by baptism but by chrismation or by confession of faith, according to economy and the nearness of their former body to the Church, while baptising those whose baptism cannot be recognised. The Councils of Carthage of 256 stand as a powerful and honoured witness to the unity of the Church and the seriousness of the Mysteries; how a particular convert is to be received today is a question for the bishop and the priest, governed by the canons. See /about for Purify's posture on questions the Church regulates by economy.",
 ],
 principalFathers: [
 {
 name: "St. Cyprian of Carthage",
 role: "Bishop of Carthage, teacher of the unity of the Church and hieromartyr under Valerian in 258; convened and presided over both councils and gave the last sentence.",
 },
 ],
 documents: [],
 pendingDocuments: [
 {
 title: "The Judgements of the Eighty-Seven Bishops (Sententiae Episcoporum)",
 note: "The record of the sentence given by each bishop at the Seventh Council of Carthage, with Cyprian's opening and closing words. A public-domain English text exists in the Ante-Nicene Fathers (Schaff, Vol. 5); it will be wired in once prepared.",
 },
 {
 title: "On the Baptism of Heretics (Cyprian, Epistles 69-75)",
 note: "St. Cyprian's letters setting out the African position, including the correspondence with Firmilian and the dispute with Stephen of Rome. Public-domain English in the Ante-Nicene Fathers; not yet shipped.",
 },
 ],
 },
 {
 slug: "ancyra-314",
 kind: "local",
 name: "The Council of Ancyra",
 byname: "Council of Ancyra (314)",
 year: 314,
 location: "Ancyra in Galatia (modern Ankara, Türkiye)",
 convenedBy:
 "About a dozen bishops of Asia Minor and Syria; whether Vitalis of Antioch or Marcellus of Ancyra presided is uncertain",
 bishopsAttending: "About a dozen, from Asia Minor and Syria",
 reception: {
 status: "full",
 note: "Its canons are among those the Council in Trullo, in its second canon, set its seal to.",
 },
 shortBio:
 "A small synod held soon after the last great persecution ended, the first to set the Church's discipline for those who had sacrificed to the idols under it. Its twenty-five canons stand among the canons of the whole Church.",
 defined: [
 "How the lapsed are received back after the persecution: presbyters and deacons who sacrificed and then returned to the struggle keep their honour but do not serve at the altar, and lay people do penance by degrees according to how they fell, whether by force, with tears or with gladness.",
 "That a deacon who declared at his ordination that he must marry may marry and keep his ministry, but one who kept silence then and married afterwards must cease from it (canon X).",
 "Measured penances for grave sins: adultery, wilful and unwilful killing, and divination and sorcery.",
 ],
 condemned: [
 "Sacrifice to the idols, and the eating of what was offered to them, under the threat of persecution: a fall that the canons heal by penance.",
 "The destruction of a child conceived in the womb, for which the canon keeps a penance of ten years, shortening an older one that lasted until death (canon XXI).",
 ],
 life: [
 "When the persecution of the Emperor Maximin ended with his death in 313, the churches of the East were left with the question it had set them: how to receive back the many who had sacrificed to the idols to save their lives. Soon after, about a dozen bishops from across Asia Minor and Syria met at Ancyra, the chief city of Galatia, and answered it canon by canon.",
 "Their rule distinguishes as a physician does: those dragged to the altars by force, those who went up in mourning and ate with tears, those who feasted gladly, those who sacrificed twice or forced others to sacrifice. For each it sets a term among the degrees of penitents, the hearers, the prostrators and those who stand in prayer with the faithful, and it leaves the bishop free to shorten or lengthen it as he sees the penitent's life. The same synod ruled also on clergy who marry, on the Church's property and on the gravest sins.",
 "Though small in numbers, the council weighed heavily. Its canons stand in the Church's first collections immediately after those of Nicaea, and the Council in Trullo, in its second canon, set its seal to the canons of those who met at Ancyra.",
 ],
 documents: [
 {
 slug: "the-twenty-five-canons",
 title: "The Twenty-Five Canons",
 subtitle: "The canons of the Council, 314, with the Ancient Epitomes",
 blurb:
 "All twenty-five canons of the Council of Ancyra, each with its Ancient Epitome where the volume gives one: the reception of the lapsed after the persecution, the marriage of deacons, and the penances for grave sins.",
 topics: ["Canons", "Penance", "The Lapsed", "Discipline"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "neocaesarea-315",
 kind: "local",
 name: "The Council of Neocaesarea",
 byname: "Council of Neocaesarea (about 315)",
 year: 315,
 location: "Neocaesarea in Pontus (modern Niksar, Türkiye)",
 convenedBy: "The bishops of Pontus and its neighbours, among them the holy martyr Basil of Amasea",
 reception: {
 status: "full",
 note: "Its canons are among those the Council in Trullo, in its second canon, set its seal to.",
 },
 shortBio:
 "A synod of Pontus held a little after Ancyra and before Nicaea, whose fifteen canons order the life of the clergy and of penitents and keep the deacons of a city to seven.",
 defined: [
 "That a presbyter who marries is removed from his order, and one who commits fornication or adultery is cast out altogether and brought to penance (canon I).",
 "That no one is ordained presbyter before thirty years of age, for the Lord was baptized and began to teach in his thirtieth year (canon XI).",
 "That the deacons of a city, however great, are seven, after the Acts of the Apostles (canon XV).",
 ],
 condemned: [
 "The marriage of a woman to two brothers: she is put out of communion until death, and received to penance then only if she promises to break the marriage (canon II).",
 "Many marriages without penance, and a presbyter feasting at the wedding of those marrying a second time (canons III and VII).",
 ],
 life: [
 "Neocaesarea, the chief city of Pontus, was the see once held by St. Gregory the Wonderworker. A synod of bishops met there a few years after Ancyra and before the First Ecumenical Council, and the Greek commentators Zonaras and Balsamon name the holy martyr Basil, bishop of Amasea, among its Fathers.",
 "Its canons are short and practical. They forbid presbyters to marry after ordination, set the age for the presbyterate at thirty, rule on catechumens and on a woman with child who asks for baptism, keep the country presbyters from offering in the city church while the bishop or the presbyters of the city are present, and liken the country bishops, the chorepiscopi, to the Seventy. The last keeps the deacons of every city to the number the Apostles appointed.",
 "The old collections place its canons after those of Ancyra and before Gangra, and the Council in Trullo, in its second canon, set its seal to the canons of those who met at Neocaesarea.",
 ],
 documents: [
 {
 slug: "the-fifteen-canons",
 title: "The Fifteen Canons",
 subtitle: "The canons of the Council, about 315, with the Ancient Epitomes",
 blurb:
 "All fifteen canons of the Council of Neocaesarea, each with its Ancient Epitome: the clergy and marriage, penitents and catechumens, country presbyters and chorepiscopi, and the seven deacons of a city.",
 topics: ["Canons", "Clergy", "Marriage", "Penance", "Deacons"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "gangra",
 kind: "local",
 name: "The Council of Gangra",
 byname: "Council of Gangra (about 340)",
 year: 340,
 location: "Gangra in Paphlagonia (modern Çankırı, Türkiye)",
 convenedBy: "Thirteen bishops, the first of them named Eusebius, writing to their fellow bishops in Armenia",
 bishopsAttending: "Thirteen",
 reception: {
 status: "full",
 note: "Its canons are among those the Council in Trullo, in its second canon, set its seal to.",
 },
 shortBio:
 "A synod that judged the followers of Eustathius, who under colour of asceticism despised marriage, married priests and the Church's assemblies. Its twenty canons defend the married and the common life of the Church, and its epilogue honours the ascetic life lived in humility.",
 defined: [
 "That marriage, and the married who live in faith, are not to be despised, and that virginity is honoured for its own beauty and holiness, not chosen out of contempt for marriage (canons I, IX and X).",
 "That the faithful receive the Offering from a married presbyter, and that the house of God, the fasts of the Church and the gatherings in honour of the martyrs are kept (canons IV, V, XIX and XX).",
 "That the ascetic life is honoured when it is lived according to the Scriptures and without pride, as the synod's epilogue says.",
 ],
 condemned: [
 "The teaching of the followers of Eustathius, most likely the bishop of Sebaste: that the married cannot be saved, that the eating of meat is to be condemned, that slaves may leave their masters and wives their husbands under pretext of piety, and that the Church's assemblies may be forsaken for private ones.",
 ],
 life: [
 "Eustathius, whom the historians Socrates and Sozomen and a letter of St. Basil allow us to identify with the bishop of Sebaste in Armenia, was among the first teachers of the monastic life in Asia Minor, and his disciples carried his strictness further than the Church could bear. They condemned marriage and those who lived in it, refused the ministry of married priests, held meat unclean, drew slaves from their masters and wives from their husbands, wore a dress of their own, and held their own assemblies apart from the churches.",
 "A synod of thirteen bishops met at Gangra, the chief city of Paphlagonia, and wrote to their fellow bishops in Armenia, where Sebaste lay, setting out the errors and the twenty canons that condemn them. Its date is uncertain: it falls between Nicaea and the Second Ecumenical Council, and the old collections set its canons before those of Antioch.",
 "The synod did not condemn the ascetic life. Its epilogue says plainly that it honours virginity kept in humility, continence kept with reverence and the withdrawal from worldly business made with lowliness of mind, and condemns only the pride that makes asceticism a pretext for despising others. The Council in Trullo, in its second canon, set its seal to the canons of those who met at Gangra.",
 ],
 documents: [
 {
 slug: "the-synodical-letter-and-canons",
 title: "The Synodical Letter and the Twenty Canons",
 subtitle: "With the Ancient Epitomes and the epilogue",
 blurb:
 "The synod's letter to the bishops of Armenia, its twenty canons against the excesses of the followers of Eustathius, each with its Ancient Epitome, and the epilogue on the ascetic life lived in humility.",
 topics: ["Canons", "Marriage", "Asceticism", "Monasticism"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "antioch-341",
 kind: "local",
 name: "The Synod of Antioch at the Dedication",
 byname: "Council of Antioch (341)",
 year: 341,
 location: "Antioch on the Orontes (modern Antakya, Türkiye)",
 convenedBy:
 "Ninety-seven bishops of the East, gathered for the dedication of the Golden Church begun by Constantine and finished under Constantius",
 bishopsAttending: "Ninety-seven, all from the East",
 reception: {
 status: "qualified",
 note: "Its twenty-five canons on the order of the Church are received among the Church's canons, to which the Council in Trullo, in its second canon, set its seal; the creeds set forth there beside the Creed of Nicaea, and its part in the case against St. Athanasius, are not.",
 },
 shortBio:
 "A synod of the East held for the dedication of the Golden Church of Antioch in 341. Its creeds, set beside that of Nicaea, were not received, but its twenty-five canons on bishops, metropolitans and synods became part of the canons of the whole Church.",
 defined: [
 "That the bishops of each province act with their metropolitan and in synod, which meets twice a year, and that nothing of weight is done without the metropolitan (canons IX and XX).",
 "That a bishop does not ordain or act uninvited in another's province, nor pass from one see to another, nor name his own successor (canons XIII, XXI and XXIII).",
 "That the Church's goods are administered by the bishop with the presbyters and deacons, and kept distinct from his own property (canons XXIV and XXV).",
 ],
 condemned: [
 "Those who set aside the decree of Nicaea on the feast of Pascha (canon I), and presbyters or deacons who despise their own bishop and set up an altar apart (canon V).",
 ],
 life: [
 "In the summer of 341 the Golden Church of Antioch, begun by Constantine and finished under his son Constantius, was dedicated, and ninety-seven bishops of the East gathered for it. No bishop of the West took part, and Pope Julius was not represented.",
 "Many of the bishops were of the party of Eusebius of Nicomedia and hostile to St. Athanasius, and the synod set forth creeds of its own beside the Creed of Nicaea which the Church did not receive. Yet St. Hilary of Poitiers could call it a synod of saints, two of its canons were read at Chalcedon as canons of the holy Fathers, and its twenty-five canons became part of the canons of the whole Church. Percival, after Hefele, explains it so: the orthodox and the Eusebians, who had then professed the faith and disowned the heresies condemned at Nicaea, met together, and the Church afterwards weighed the canons by their own worth.",
 "The canons give the Church much of its order for bishops and provinces: the place of the metropolitan, synods twice a year, the limits of each bishop's authority, the care of the Church's goods. The Council in Trullo, in its second canon, set its seal to the canons of those who met at Antioch in Syria.",
 ],
 documents: [
 {
 slug: "the-synodal-letter-and-canons",
 title: "The Synodal Letter and the Twenty-Five Canons",
 subtitle: "With the Ancient Epitomes",
 blurb:
 "The synodal letter and all twenty-five canons of the synod, each with its Ancient Epitome: metropolitans and provincial synods, the limits of a bishop's authority, the clergy, and the Church's goods.",
 topics: ["Canons", "Bishops", "Metropolitans", "Synods", "Church Property"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "sardica",
 kind: "local",
 name: "The Council of Sardica",
 byname: "Council of Sardica (343)",
 year: 343,
 location: "Sardica (modern Sofia, Bulgaria)",
 convenedBy:
 "The Emperors Constantius and Constans, at the wish of Pope Julius, as a council of the whole Church; Hosius of Cordova presided",
 bishopsAttending: "Fewer than a hundred, most of them from the West, after the bishops of the East withdrew",
 reception: {
 status: "full",
 note: "Its canons are among those the Council in Trullo, in its second canon, set its seal to. Meant as a council of the whole Church, it did not become one: the bishops of the East withdrew from it.",
 },
 shortBio:
 "A council summoned for the whole Church in 343 or 344, from which the bishops of the East withdrew when the West would seat St. Athanasius. Those who remained, under Hosius of Cordova, upheld him and gave twenty canons on the conduct of bishops, which entered the canons of the Church.",
 defined: [
 "That a bishop may not move from a smaller city to a greater, nor seek a see by stirring up the people (canons I and II).",
 "That a bishop deposed by the bishops of his province may have his case heard again, the bishop of Rome, then Julius, judging whether it is to be reopened and naming the judges (canons III to V).",
 "That bishops do not crowd the emperor's court with petitions but help the oppressed, the widows and the orphans, sending their requests by a deacon, and do not stay away from their own churches beyond three Sundays (canons VII, VIII, XI and XII).",
 ],
 condemned: [
 "Bishops who pass from see to see out of ambition, and the seditions stirred up to keep them (canons I and II).",
 ],
 life: [
 "When the bishops of the East, of the party of Eusebius of Nicomedia, had deposed St. Athanasius of Alexandria, Pope Julius and the Emperors Constantius and Constans resolved to call a council of the whole Church, and it met at Sardica, on the border between the Eastern and the Western empire, in 343 or 344.",
 "It divided at the outset. The bishops of the West would have St. Athanasius take his seat; the bishops of the East would not sit with him, withdrew to Philippopolis, and there confirmed his deposition. Those who remained, fewer than a hundred and most of them Western, with Hosius of Cordova presiding, upheld him. So a council meant for the whole Church did not become an ecumenical one.",
 "Its canons, most of them proposed by Hosius and approved by all, deal with the conduct of bishops: their moving from see to see, their absences, their journeys to the court, and the hearing again of a bishop who says he was wrongly deposed. Three of them give that judgment to the bishop of Rome, and how far they reach beyond their own time has long been disputed between East and West. The Council in Trullo, in its second canon, set its seal to the canons of those who met at Sardica.",
 ],
 documents: [
 {
 slug: "the-twenty-canons",
 title: "The Twenty Canons",
 subtitle: "From the Greek and the Latin, with the Ancient Epitomes",
 blurb:
 "All twenty canons of the Council of Sardica in the 1900 translation of both their texts, the Greek given as the canon and the Latin beside it, with the Ancient Epitomes: bishops moving from see to see, the hearing again of a deposed bishop, petitions to the court, and absences from one's church.",
 topics: ["Canons", "Bishops", "Appeals", "Discipline"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "carthage-419",
 kind: "local",
 name: "The Council of Carthage and the Code of the African Church",
 byname: "Council of Carthage (419)",
 year: 419,
 location: "Carthage, in the basilica of Faustus (near modern Tunis, Tunisia)",
 convenedBy:
 "Aurelius, bishop of Carthage, with Valentine, primate of Numidia, and Faustinus, legate of the Roman Church",
 bishopsAttending: "Two hundred and seventeen, from all the provinces of Africa",
 reception: {
 status: "full",
 note: "Its code is among the canons the Council in Trullo, in its second canon, set its seal to, and that council read its canons on the continence of the clergy as abstaining at the times of their ministry (Trullo, canon XIII).",
 },
 shortBio:
 "The council of 217 bishops of Africa which in 419 read again the canons of the African councils of the generation before and gave them a new sanction: the Code of Canons of the African Church, with its canons against Pelagius on grace and its letters to Rome on appeals across the sea.",
 defined: [
 "The books read in church under the name of divine Scripture, listed one by one (canon XXIV).",
 "Against Pelagius and Celestius: that Adam was not made subject to death, that infants are baptized for the remission of sins, that the grace of God both forgives past sins and helps us not to sin, and that without it we can do no good thing (canons CIX to CXIII).",
 "That presbyters, deacons and the lower clergy who question their bishop's judgment are heard by the neighbouring bishops, and may appeal only to the councils of Africa or its primates, not across the sea (canons XXVIII and CXXV).",
 ],
 condemned: [
 "The teaching of Pelagius and Celestius on grace and on the sin of Adam (canons CIX to CXVI), which the Third Ecumenical Council at Ephesus also condemned.",
 ],
 life: [
 "Carthage was the head of the whole of Africa, and while Aurelius was its bishop the bishops of the African provinces met often, at Carthage, at Hippo and at Milevis, and made many canons. On 25 May 419 two hundred and seventeen of them met at Carthage, in the Secretarium of the basilica of Faustus, and read again the canons of those councils that were approved, giving them a new sanction. The collection is the Code of Canons of the African Church.",
 "The same council took up the case of Apiarius, a presbyter of Sicca whose ordination, excommunication and appeal to Rome had troubled the whole African Church. Faustinus, the legate of Pope Zosimus, brought a commonitorium setting out as canons of Nicaea the rules on appeals that are in fact the canons of Sardica. The Africans sent to Alexandria and Constantinople for the authentic canons of Nicaea, which St. Cyril of Alexandria and Atticus of Constantinople sent them, and the code ends with the letters they wrote to Popes Boniface and Celestine asking that appeals from Africa not be heard across the sea.",
 "Its canons against Pelagius and Celestius are the African Church's answer to their teaching on grace, the error the Council of Ephesus also condemned. The code entered the canons of the whole Church: the Council in Trullo, in its second canon, set its seal to the canons of those who met at Carthage.",
 ],
 documents: [
 {
 slug: "the-african-code",
 title: "The Code of Canons of the African Church",
 subtitle: "The canons of the 217 Fathers at Carthage, 419, with the Ancient Epitomes",
 blurb:
 "The whole code in the 1900 translation from the Latin: the ancient introduction and the opening of the council, then its 138 canons and letters, each with its Ancient Epitome where the volume gives one: the clergy and their discipline, the books of Scripture, the Donatists, the canons against Pelagius, and the letters to Rome on appeals.",
 topics: ["Canons", "Discipline", "Scripture", "Pelagianism", "Donatism", "Appeals"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "laodicea",
 kind: "local",
 name: "The Synod of Laodicea",
 byname: "Council of Laodicea (about 363)",
 year: 363,
 location: "Laodicea on the Lycus, in Phrygia Pacatiana (near modern Denizli, Türkiye)",
 convenedBy: "Bishops gathered from many regions of Asia",
 reception: {
 status: "full",
 note: "Its canons are among those the Council in Trullo, in its second canon, set its seal to. The list of the books of Scripture that stands as its sixtieth canon is of doubtful genuineness.",
 },
 shortBio:
 "A synod of Asia in the fourth century, perhaps about 363, whose sixty canons order the services, the clergy, the fast of Great Lent and the books read in church.",
 defined: [
 "The order of the services: psalms and lessons in turn, the prayers for the catechumens, the penitents and the faithful, and only the priesthood going to the altar to communicate there (canons XVII and XIX).",
 "The keeping of Great Lent: the Offering made only on Saturday and Sunday, and no festivals of the martyrs, weddings or birthday feasts within it (canons XLIX, LI and LII).",
 "That only the canonical books of the Old and New Testaments are read in church, not psalms of private composition (canon LIX).",
 ],
 condemned: [
 "Judaizing: resting on the Sabbath instead of honouring the Lord's Day, and receiving festal gifts or unleavened bread from Jews (canons XXIX, XXXVII and XXXVIII).",
 "Forsaking the Church to invoke angels, and the clergy's use of magic and amulets (canons XXXV and XXXVI).",
 ],
 life: [
 "Laodicea on the Lycus, in Phrygia Pacatiana, was one of the seven churches of the Revelation of St. John, not to be confused with Laodicea in Syria. The date of its synod is uncertain: the scholars Percival follows place it about 363, and the old collections set its canons after those of Antioch and before those of the Second Ecumenical Council.",
 "Its sixty canons are among the earliest witnesses to the order of the Church's worship: the psalms and the lessons, the prayers for the catechumens, the penitents and the faithful, the ranks of the clergy who serve, the fast of Great Lent. They forbid the faithful to keep the feasts of Jews and heretics with them, and they keep the reading in church to the canonical books.",
 "The list of the books of the Old and New Testaments that stands as its sixtieth canon is of doubtful genuineness, as Percival marks it. The Council in Trullo, in its second canon, set its seal to the canons of those who met at Laodicea in Phrygia.",
 ],
 documents: [
 {
 slug: "the-sixty-canons",
 title: "The Sixty Canons",
 subtitle: "With the Ancient Epitomes",
 blurb:
 "All sixty canons of the Synod of Laodicea, each with its Ancient Epitome where the volume gives one: the services and the clergy, Great Lent, dealings with Jews and heretics, and the books read in church.",
 topics: ["Canons", "Liturgy", "Great Lent", "Clergy", "Scripture"],
 },
 ],
 review: { status: "awaiting-clergy-review", since: "2026-10-23" },
 },
 {
 slug: "jerusalem-1672",
 kind: "local",
 name: "The Synod of Jerusalem",
 byname: "Synod of Jerusalem (1672)",
 year: 1672,
 location:
 "Jerusalem and Bethlehem, at the reconsecration of the Church of the Nativity",
 convenedBy: "Dositheos II, Patriarch of Jerusalem",
 bishopsAttending:
 "The Patriarch of Jerusalem with the metropolitans, archimandrites and priests gathered for the reconsecration",
 reception: {
 status: "full",
 note: "A local synod whose decrees were approved by the other patriarchates and by the Church of Russia, and which is received across the Orthodox Church as an authoritative statement of the faith against the Calvinist reading of it. Its scholastic vocabulary, borrowed from the Western debate it was answering, is discussed by Orthodox theologians without the substance of the decrees being in question.",
 },
 shortBio:
 "The synod that answered the Calvinist Confession published in the name of Cyril Lucaris. Gathered by Patriarch Dositheos at the reconsecration of the Church of the Nativity, it set out in eighteen decrees what the Orthodox Church actually holds on Scripture, grace, the Mysteries and the saints, and it remains the fullest confessional statement the Church made in the modern period.",
 defined: [
 "That Scripture is read within the Church and interpreted by her: the Church does not take her authority from the book, nor the book its authority from private judgement, and the two are not to be set against each other.",
 "That God predestines no one to perdition. He foreknows all, wills all men to be saved, and crowns those who freely cooperate with His grace.",
 "That a man is justified by faith working through love, not by a faith held apart from the life it produces.",
 "That the Mysteries are seven, and that they convey what they signify: baptism regenerates, and in the Eucharist the bread and the wine are changed into the Body and Blood of the Lord.",
 "That the honour given to the Theotokos and the saints, and to their icons and relics, is veneration and not the worship due to God alone, and that the saints are asked for their prayers.",
 "That the books the Church has always read in her assemblies, which the Reformed had begun to set aside as apocryphal, belong to Scripture.",
 ],
 condemned: [
 "The Confession printed at Geneva in 1629 under the name of Cyril Lucaris, Patriarch of Constantinople, holding unconditional election, the bondage of the will, and justification by faith alone; the synod judged it foreign to the Orthodox faith and denied that a patriarch of the Church had written it.",
 "The claim that Scripture alone, read privately, is the rule of faith apart from the Church that received and preserved it.",
 "The teaching that God decrees the damnation of any man irrespective of his own will and works.",
 ],
 life: [
 "In 1629 there appeared at Geneva a Confession of Faith, in Latin and soon after in Greek, published under the name of Cyril Lucaris, Patriarch of Constantinople. It was Calvinist throughout: unconditional election, the bondage of the will, justification by faith alone, two Mysteries rather than seven, and the rejection of the veneration of icons. Whether Lucaris wrote it, wrote part of it, or had it written for him has been argued ever since. What was not in doubt was the use being made of it, for Protestant Europe now had, or appeared to have, the signature of an Eastern patriarch on its side.",
 "The Orthodox East answered several times over the next forty years, at Constantinople in 1638, at Jassy in 1642, and most fully at Jerusalem in 1672. Dositheos II, Patriarch of Jerusalem, had gathered hierarchs and clergy for the reconsecration of the Church of the Nativity at Bethlehem, restored after long neglect. With them assembled he laid the Confession before the synod, and the synod set out the faith of the Church point against point.",
 "The acts fall into six chapters, and the confession Dositheos drew up runs to eighteen decrees with four questions appended. It is a deliberate answer rather than a free composition: each decree stands where one of the Genevan articles had stood. Where the Confession said that God predestines some to life and passes over the rest, the synod answered that God wills all men to be saved and that no one is predestined to perdition. Where it said faith alone, the synod answered faith working through love. Where it reduced the Mysteries to two, the synod named the seven.",
 "The synod also took up the books of the Old Testament that the Reformed had begun to print apart as apocrypha, and confessed that the Church reads them as Scripture, as she always had. It is the same judgement that puts Susanna and Bel and the Dragon in the Church's Daniel.",
 "Its language has been discussed since. Dositheos was answering Western arguments in Western terms, and some of his vocabulary, most often noted in the word he uses for the change in the Eucharist, is the vocabulary of the schools rather than of the Fathers. Orthodox theologians have said so plainly without setting aside what the decrees confess. The synod's authority rests not on its phrasing but on its having been received: the other patriarchates approved it, the Church of Russia approved it, and it has been cited as a standard of Orthodox teaching from that day to this.",
 ],
 principalFathers: [
 {
 name: "Dositheos II, Patriarch of Jerusalem",
 role: "Convened the synod, drew up the eighteen decrees, and afterwards published the acts; the principal Orthodox controversialist of his century.",
 },
 ],
 principalOpposed: [
 {
 name: "The Confession published under the name of Cyril Lucaris",
 teaching:
 "A Calvinist confession printed at Geneva in 1629 bearing the name of the Patriarch of Constantinople, teaching unconditional election, the bondage of the will, justification by faith alone, and the rejection of icons.",
 },
 ],
 documents: [],
 pendingDocuments: [
 {
 title: "The Confession of Dositheus (eighteen decrees, with the four questions)",
 note: "The confession itself. Public-domain English exists in J. N. W. B. Robertson, The Acts and Decrees of the Synod of Jerusalem (London, 1899), and in Schaff's Creeds of Christendom; the text will be wired in once a translation is prepared and its provenance recorded.",
 },
 {
 title: "The Acts of the Synod (the six chapters)",
 note: "The synodal acts preceding the confession, including the judgement on the Genevan Confession and on the question of its authorship. Public-domain English in Robertson (1899); not yet shipped.",
 },
 ],
 },
 {
 slug: "orange-529",
 kind: "local",
 name: "The Second Council of Orange",
 byname: "Council of Orange (529)",
 year: 529,
 location: "Arausio in Gaul (modern Orange, France)",
 convenedBy: "St. Caesarius, Bishop of Arles",
 bishopsAttending: "Fourteen bishops of southern Gaul",
 reception: {
 status: "not-received",
 note: "A Western provincial synod. The Orthodox Church does not receive it as authoritative and took no part in it: it was held in Gaul, in Latin, within a controversy about grace and free will that the Latin West conducted in Augustine's terms and the Greek East did not. It is listed here because it is constantly cited in Western discussion of grace, and a reader who meets it deserves to be told plainly where it stands.",
 },
 shortBio:
 "A council of fourteen bishops of southern Gaul, gathered by St. Caesarius of Arles, which settled the long Latin argument over whether the first movement toward God comes from man or from grace. It answered: from grace. Its twenty-five canons became the West's standing statement on the question, and were never the subject of Eastern conciliar action.",
 defined: [
 "That the beginning of faith is itself the gift of God, so that the first turning of a man toward God is not his own achievement to which grace is afterwards added.",
 "That grace goes before every good work, and that whatever good a man does, God has first worked in him the willing of it.",
 "That the whole man, mind and will alike, was wounded by the sin of Adam, and that no one is restored by his own strength.",
 "That baptism gives grace truly, and that all the baptised, with Christ's help, are able to do what belongs to salvation if they will faithfully labour.",
 ],
 condemned: [
 "The teaching later called Semipelagian, held in Gaul by monks of Marseilles and Lerins, that the beginning of faith may come from a man's own will with grace following to strengthen it.",
 "The proposition that any man is predestined by God to evil. The council's conclusion rejects this in as many words, and is to that extent narrower than what was later built upon it in the West.",
 ],
 life: [
 "The Latin West spent the century after Augustine's death arguing about what he had said. Augustine had answered Pelagius, who taught that a man could take the first step toward God unaided, by insisting that grace precedes and enables every good movement of the will. Monks in southern Gaul, at Marseilles and at Lerins, accepted his answer on nearly everything and stopped short at one point: they wished to say that the first stirring of faith, the initium fidei, might arise from the man himself, with grace meeting and completing it. Their position is called Semipelagianism, a name given to it long afterwards and by its opponents.",
 "St. Caesarius, Bishop of Arles, a monk of Lerins who had become the leading hierarch of Gaul, judged that the question needed settling. He asked Rome for help, and Pope Felix IV sent him a set of propositions drawn largely from Augustine and from Prosper of Aquitaine. In the summer of 529, at the dedication of a church at Orange, Caesarius put them to the fourteen bishops assembled with him. They approved twenty-five canons and added a conclusion in their own words. Boniface II confirmed the council two years later.",
 "The canons say, in many forms, one thing: that God is first. Not that man is passive, and not that anyone is predestined to be lost, which the conclusion denies explicitly, but that no one turns toward God whom God has not already turned.",
 "It has no standing in the East, and that is the honest part to say. The Greek Fathers had addressed the relation of grace and freedom in their own vocabulary, that of synergy, the working together of God and man, in which the whole initiative belongs to God and the whole response is genuinely the man's own. The Eastern Church was not represented at Orange, took no action upon it, and has never numbered it among the councils she receives. Its canons are cited constantly in Western theology, and in the Reformation debates most of all, which is why an Orthodox reader is likely to meet it and to want to know what it is.",
 "St. Caesarius of Arles is himself commemorated in the Orthodox calendar. That a Father is venerated does not make a provincial synod over which he presided a council of the whole Church, and the distinction is worth keeping clear.",
 ],
 principalFathers: [
 {
 name: "St. Caesarius of Arles",
 role: "Bishop of Arles and the leading hierarch of Gaul; sought the propositions from Rome, presided over the council, and wrote its concluding statement.",
 },
 ],
 principalOpposed: [
 {
 name: "The Semipelagian position of the Gallic monks",
 teaching:
 "That the first movement of faith may begin in a man's own will, with the grace of God following to strengthen and complete it, rather than preceding it.",
 },
 ],
 documents: [],
 pendingDocuments: [
 {
 title: "The Twenty-Five Canons, with the Conclusion",
 note: "The canons and the concluding statement. Wired in once a translation whose public-domain status can be recorded is prepared: the English versions in common circulation are mostly modern, and the editorial standard here is public domain and verbatim or nothing.",
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
