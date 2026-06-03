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
 slug: "the-eight-canons",
 title: "The Eight Canons",
 subtitle: "The disciplinary canons of the Council, 431",
 blurb:
 "All eight canons of the Council of Ephesus in full, each followed where extant by the Ancient Epitome. Covers the reception of the Nestorian and Pelagian parties, the restoration of clergy unjustly deposed by Nestorius's faction, the integrity of the Nicene Creed as the sole baptismal confession (Canon VII), and the autocephaly of the Church of Cyprus against the encroachment of Antioch (Canon VIII).",
 topics: ["Canons", "Nestorianism", "Pelagianism", "Creed", "Autocephaly"],
 },
 ],
 pendingDocuments: [
 {
 title: "Cyril's Second Letter to Nestorius (received by the Council)",
 note: "The Letter the Council formally read and unanimously accepted as conformable to the Nicene Faith, the dogmatic charter of the Council. Pending a clean public-domain source.",
 },
 {
 title: "Cyril's Third Letter to Nestorius, with the Twelve Anathemas",
 note: "Cyril's sharper second polemic, with the famous Twelve Anathemas summarizing the case against Nestorianism. Technically Cyril's own work but received in the Ephesine corpus. Pending a clean PD source.",
 },
 {
 title: "The Formula of Reunion (433)",
 note: "The Christological statement drafted at Antioch and accepted at Alexandria two years after the Council, by which Cyril and John of Antioch were reconciled. One of the foundations on which Chalcedon would build. Pending a clean PD source.",
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
 "On the post-Chalcedonian separation: the Council's deposition of Dioscorus and its Definition of Faith were not received by the Egyptian and Syrian churches that held to the strict Cyrilline formula \"one incarnate nature of the divine Word.\" These churches gathered into what is today called the Oriental Orthodox communion (Coptic, Syriac, Armenian, Ethiopian, Eritrean, Malankara), historically distinct from the Eastern Orthodox communion that received Chalcedon. The Christological difference between the two communions has been the subject of formal theological dialogue since the 1960s. The Eastern Orthodox Church has not formally received the Oriental Orthodox confession as identical to her own; the question is genuinely contested within the Eastern Orthodox jurisdictions themselves. Purify, in keeping with the doctrinal stance set out on /about, does not adjudicate the question: it names the historical separation honestly, serves the Definition and the Tome as the Council itself issued them, and directs the reader to their own bishop and to the published dialogue documents for further direction.",
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
 slug: "the-thirty-canons",
 title: "The Thirty Canons",
 subtitle: "The disciplinary canons of the Council, 451",
 blurb:
 "All thirty disciplinary canons of the Council of Chalcedon in full, each followed where extant by the Ancient Epitome. Covers simoniacal ordination, ordination at large, the deaconess order, monastic life, jurisdiction of metropolitans, clerical lawsuits, and (in Canon XXVIII) the extension to the See of Constantinople of the prerogatives given to New Rome at the First Council of Constantinople. Canon XXVIII has been received by the Eastern Orthodox Church and has not been received by the Roman Catholic Church.",
 topics: ["Canons", "Discipline", "Patriarchate", "Monasticism", "Diaconesses", "New Rome"],
 },
 ],
 pendingDocuments: [
 {
 title: "The Definition of Faith (the Chalcedonian Definition)",
 note: "The dogmatic charter of the Council and the formula on which Eastern Orthodox Christology has rested ever since: Christ acknowledged in two natures, without confusion, without change, without division, without separation. Pending a clean public-domain source.",
 },
 {
 title: "The Tome of Pope Leo I (449)",
 note: "The dogmatic letter Pope Leo sent to St. Flavian of Constantinople in 449, received at the Council's Second Session in 451 to the acclamation, \"Peter has spoken through Leo.\" Pending a clean PD source.",
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
 "A century after Chalcedon the Eastern Church was still not at peace. The Definition of 451, that Christ is acknowledged in two natures, had been received by the imperial Church, but a large body of the faithful in Egypt and Syria held to the strict formula of St. Cyril, \"one incarnate nature of the divine Word,\" and read the two-natures language of Chalcedon as a concession to Nestorianism. The separation hardened into the non-Chalcedonian communion. The Emperor St. Justinian, the most theologically engaged of all the Christian emperors, devoted much of his long reign to the reconciliation of these churches without surrendering the Faith of Chalcedon.",
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
 slug: "the-capitula",
 title: "The Capitula (The Fourteen Anathemas)",
 subtitle: "The dogmatic anathematisms of the Council, 553",
 blurb:
 "All fourteen anathematisms of the Fifth Council in full. The first ten confess the Trinitarian and Christological Faith in the precise Cyrilline key, including the Theopaschite confession that one of the Holy Trinity was crucified in the flesh. The eleventh lists the condemned heretics and adds Origen; the last three condemn the Three Chapters by name, the person and writings of Theodore of Mopsuestia, the writings of Theodoret against Cyril, and the Letter ascribed to Ibas to Maris the Persian.",
 topics: ["Anathemas", "Christology", "Three Chapters", "Theopaschism", "Origenism", "Theotokos"],
 },
 ],
 pendingDocuments: [
 {
 title: "The Fifteen Anathemas against the Origenists",
 note: "The fifteen anathemas condemning the Origenist speculation (pre-existence of souls, the final restoration of all things), associated with the synod and its monastic context. Pending a clean public-domain source.",
 },
 {
 title: "The Sentence of the Synod (the synodal acts against the Three Chapters)",
 note: "The Council's full sentence setting out the case against Theodore, Theodoret's writings, and the Letter of Ibas, with its detailed reasoning. Pending a clean PD source.",
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
 slug: "the-definition-of-faith",
 title: "The Definition of Faith",
 subtitle: "The horos of the Council on the two wills and two operations, 681",
 blurb:
 "The dogmatic Definition of the Sixth Council in full, from its Eighteenth Session. It receives the five prior councils and the Letter of Pope St. Agatho, names and condemns the authors of Monothelitism including Honorius of Rome, and defines that in the one Christ there are two natural wills and two natural operations, the human will freely subject to the divine and not suppressed but deified.",
 topics: ["Definition", "Christology", "Two Wills", "Monothelitism", "Dyothelitism"],
 },
 ],
 pendingDocuments: [
 {
 title: "The Letter of St. Agatho to the Emperor",
 note: "The dogmatic Letter of Pope St. Agatho, with the synodal letter of his Roman council of 125 bishops, received by the Council as the confession of the Apostolic see and acclaimed as the voice of Peter. Pending a clean public-domain source.",
 },
 {
 title: "The Prosphonetic Address to the Emperor",
 note: "The Council's closing oration to Constantine IV, recounting its labours and its sentence against the Monothelites. Pending a clean PD source.",
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
];

export function getCouncil(slug: string): Council | null {
 return COUNCILS.find((c) => c.slug === slug) ?? null;
}

export function getCouncilByOrdinal(ordinal: number): Council | null {
 return COUNCILS.find((c) => c.ordinal === ordinal) ?? null;
}
