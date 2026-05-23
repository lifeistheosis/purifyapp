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
 /**
 * Short popular byname. Shown prominently on the saints index card and
 * the profile hero. Examples: "The Theologian", "Golden-Mouth",
 * "Pillar of Orthodoxy", "The Forerunner".
 */
 byname?: string;
 born?: string;
 reposed?: string;
 feastDays: string[];
 see?: string;
 shortBio: string;
 life: string[];
 works: Work[];
 /**
 * Notable quotations, drawn verbatim from the saint's own works (or, where
 * noted, his recorded words). Shown in a "In his own words" section on the
 * profile. `href` deep-links to the work the line is taken from.
 */
 quotes?: Quote[];
 /**
 * Optional path to a real icon image, e.g. "/saints/icons/john-chrysostom.png".
 * If absent, the SaintIcon component renders a styled placeholder
 * (halo + initials on a wood-and-gold panel).
 */
 iconUrl?: string;
 /**
 * Featured saint (the Theotokos): sorts first on the index and renders a
 * distinguished card + hero. Other saints leave this unset.
 */
 featured?: boolean;
 /**
 * Venerated titles, shown in a "Titles" section. Used by the Theotokos
 * (Mother of God, Ever-Virgin, Panagia, ...).
 */
 titles?: string[];
 /**
 * Named feasts (beyond the plain `feastDays` dates), each optionally linking
 * to the calendar. Used by the Theotokos for her Great Feasts.
 */
 greatFeasts?: { name: string; date: string; href?: string }[];
 /**
 * Possessive pronoun for UI copy like "Read {his/her} works". Defaults to
 * "his"; set "her" for female saints (and the Theotokos).
 */
 pronoun?: "his" | "her";
};

export type Quote = {
 text: string;
 source: string;
 href?: string;
};

export const SAINTS: Saint[] = [
 {
 slug: "theotokos",
 featured: true,
 pronoun: "her",
 iconUrl: "/saints/icons/theotokos.jpg",
 name: "The Most Holy Theotokos",
 byname: "Ever-Virgin Mary",
 epithet: "Mother of God · Panagia",
 born: "Tradition: Jerusalem, to Ss. Joachim and Anna",
 reposed: "The Dormition, c. 41 (Jerusalem)",
 feastDays: [
 "August 15",
 "September 8",
 "November 21",
 "March 25",
 "October 1",
 "December 26",
 ],
 see: "Jerusalem",
 shortBio:
 "The Mother of God, more honorable than the Cherubim and beyond compare more glorious than the Seraphim: the Virgin who bore the uncontainable Word, and who stands first among all the saints.",
 titles: [
 "Theotokos (the God-bearer)",
 "Ever-Virgin",
 "Mother of God",
 "Panagia (the All-Holy)",
 "More Honorable than the Cherubim",
 "Queen of Heaven",
 "The New Eve",
 "Joy of All Who Sorrow",
 ],
 greatFeasts: [
 { name: "The Nativity of the Theotokos", date: "September 8", href: "/calendar" },
 { name: "The Entrance into the Temple", date: "November 21", href: "/calendar" },
 { name: "The Annunciation", date: "March 25", href: "/calendar" },
 { name: "The Dormition", date: "August 15", href: "/calendar" },
 { name: "The Synaxis of the Theotokos", date: "December 26", href: "/calendar" },
 { name: "The Protection of the Theotokos", date: "October 1", href: "/calendar" },
 ],
 life: [
 "The Most Holy Theotokos stands at the heart of the Church's love and wonder: a daughter of the fallen race of Adam who became the Mother of its Maker. The Orthodox Church does not worship her, for worship belongs to God alone; but it honors her above every other creature, as the one who gave her own flesh to the eternal Son and so opened the way of our salvation.",
 "The Church holds that she was born to the aged and childless Joachim and Anna, who had prayed long for a child and vowed to dedicate her to God. Her birth is kept as the first of the year's great feasts, on the eighth of September. While still a small child she was brought to the Temple in Jerusalem and, the tradition relates, received to be raised within its precincts, a feast the Church keeps on the twenty-first of November as the Entrance of the Theotokos.",
 "Betrothed in her youth to the righteous Joseph, a guardian of her virginity, she was living quietly at Nazareth when the Archangel Gabriel was sent to her. He greeted her as 'full of grace' and told her she would bear the Son of the Most High. To the angel's word she gave the answer on which, the Fathers say, the whole world waited: 'Behold the handmaid of the Lord; be it unto me according to thy word.' In that free consent the Word was made flesh.",
 "Carrying the Lord within her, she went into the hill country to her kinswoman Elizabeth, and there poured out the song the Church has never ceased to sing, the Magnificat: 'My soul doth magnify the Lord.' In Bethlehem she brought forth her firstborn and laid him in a manger; she kept the words of the shepherds and the magi and pondered them in her heart; and she fled with the child into Egypt from the sword of Herod.",
 "She appears again at the beginning of his ministry, at the wedding in Cana of Galilee, where her quiet command to the servants remains her counsel to every Christian: 'Whatsoever he saith unto you, do it.' Through the years of his preaching she followed at a distance, a sword piercing her own soul, as the elder Symeon had foretold over the infant in the Temple.",
 "She did not turn away at the end. While the disciples fled, she stood at the foot of the Cross; and from there her dying Son gave her to the beloved disciple, and the disciple to her: 'Behold thy mother.' In her the Church sees the mother of all who are born anew in Christ.",
 "After the Resurrection and the Ascension she remained with the apostles, and was among them in the upper room when the Holy Spirit descended at Pentecost. She lived out her remaining years under the care of the Apostle John, honored by the young Church as its mother.",
 "The Church holds that when she fell asleep, the apostles were gathered miraculously to her side; that her Son received her soul; and that on the third day he raised her body and took her to himself, the first to share fully in the resurrection he had won. This is the Dormition, kept on the fifteenth of August after a fast, the last of the year's great feasts and the seal of her life. The Church sings of her as 'more honorable than the Cherubim and beyond compare more glorious than the Seraphim,' and runs to her protection in every need.",
 ],
 quotes: [
 {
 text: "Behold the handmaid of the Lord; be it unto me according to thy word.",
 source: "At the Annunciation (Luke 1:38)",
 },
 {
 text: "My soul doth magnify the Lord, and my spirit hath rejoiced in God my Saviour.",
 source: "The Magnificat (Luke 1:46-47)",
 href: "/saints/theotokos/the-magnificat",
 },
 {
 text: "Whatsoever he saith unto you, do it.",
 source: "At the wedding in Cana (John 2:5)",
 },
 ],
 works: [
 {
 slug: "the-magnificat",
 title: "The Magnificat",
 subtitle: "The Song of the Theotokos",
 year: "Luke 1:46-55",
 blurb:
 "Her song at the Visitation, chanted at Orthros every morning: the soul's magnifying of the Lord who has regarded the lowliness of his handmaiden and exalted the humble.",
 topics: ["Praise", "Humility", "Mercy", "Prophecy", "Scripture"],
 },
 ],
 },
 {
 slug: "anthony-the-great",
 byname: "Father of Monasticism",
 iconUrl: "/saints/icons/anthony-the-great.jpg",
 name: "St. Anthony the Great",
 epithet: "Father of Monks · The Great",
 born: "c. 251 (Coma, Lower Egypt)",
 reposed: "January 17, 356 (Mount Colzim)",
 feastDays: ["January 17"],
 shortBio:
 "The Egyptian who gave away his inheritance at a word of the Gospel and went into the desert, becoming the father of Christian monasticism and the great pattern of ascetic struggle.",
 life: [
 "Anthony was born around the year 251 at Coma in Lower Egypt, the son of well-to-do Christian parents who left him a large estate and the care of a younger sister. He was a quiet boy who loved the church more than the schoolroom. When he was about twenty his parents died, and not long after, entering the church, he heard the Gospel read: 'If thou wilt be perfect, go and sell that thou hast, and give to the poor, and thou shalt have treasure in heaven.'",
 "He took the words as spoken to him. He gave the family lands to his village, sold the rest and gave it to the poor, placed his sister with a community of consecrated virgins, and went to live as an ascetic at the edge of his town, learning from the holy old men nearby. He worked with his hands, prayed without ceasing, and ate once a day after sunset.",
 "Seeking greater solitude he withdrew to the tombs, and then across the Nile to an abandoned desert fort, where he shut himself in for nearly twenty years. There the Life of Antony, written by St. Athanasius who knew him, tells of his long warfare with the demons, who came against him as wild beasts and as phantoms and as despair, and whom he overcame by the name of Christ, by prayer, and by humility.",
 "When at last his friends broke open the door, he came out neither wasted nor wild but whole in body and serene in soul, and the report of him drew so many imitators that the desert, in Athanasius's famous phrase, was made a city of monks. Anthony became their father and physician of souls, teaching not by systems but by his life, and by short, piercing words that were remembered and gathered into the Sayings of the Desert Fathers.",
 "Twice he left his solitude for the sake of the Church. In the persecution under Maximinus he went down to Alexandria to comfort the confessors and longed for martyrdom himself; and in old age he came down again to stand publicly with St. Athanasius against the Arians, declaring that the Son is not a creature but the eternal Word, so that pagans and heretics alike marveled at the old monk to whom even the emperors wrote.",
 "He withdrew at the end to the 'Inner Mountain' by the Red Sea, where a monastery bearing his name still stands. There he reposed in peace around the year 356, having lived, the tradition holds, to one hundred and five years, and asking that his burial place be kept secret. He is honored as the father of monasticism, kept on the seventeenth of January, his struggle and his stillness a pattern for all who would seek God.",
 ],
 quotes: [
 {
 text: "I saw the snares of the enemy spread out over the world, and I groaned and said, What can pass through these? And I heard a voice saying, Humility.",
 source: "The Sayings of the Desert Fathers",
 },
 {
 text: "Our life and our death is with our neighbour. If we win our brother, we win God; if we cause our brother to stumble, we have sinned against Christ.",
 source: "The Sayings of the Desert Fathers",
 },
 {
 text: "Whoever has not been tried by temptation cannot enter the Kingdom of Heaven; take away temptations, and no one would be saved.",
 source: "The Sayings of the Desert Fathers",
 },
 {
 text: "I no longer fear God, but I love Him; for perfect love casteth out fear.",
 source: "The Sayings of the Desert Fathers",
 },
 ],
 works: [
 {
 slug: "life-of-antony",
 title: "Life of Antony",
 subtitle: "Written by St. Athanasius the Great",
 year: "c. 360",
 blurb:
 "The first and greatest monastic biography, written by St. Athanasius for the monks abroad. It tells of Anthony's call, his long warfare with the demons, and the wisdom by which the desert was made a city. The book that set countless souls on the ascetic path.",
 topics: ["Monasticism", "Asceticism", "Spiritual Warfare", "Desert", "Prayer"],
 },
 ],
 },
 {
 slug: "athanasius-the-great",
 byname: "Pillar of Orthodoxy",
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
 "Born in Alexandria around 296, Athanasius was raised in a Christian household and educated in the classical curriculum of his city. While still a young man he wrote two companion treatises, Against the Heathen and On the Incarnation, that already showed the mind which would shape the century: that the Word through whom all things were made had entered His own creation to remake it from within.",
 "As a young deacon he accompanied his bishop, Alexander, to the First Ecumenical Council at Nicaea in 325. There the priest Arius taught that the Son was a creature, that there was once when He was not. Athanasius saw at once what was at stake: if the Son is not true God of true God, then He cannot make us partakers of God, and no one is saved. The Council confessed the Son to be of one essence with the Father, and that word became the labor of Athanasius's life.",
 "On Alexander's repose in 328, Athanasius, barely thirty, was elevated to the patriarchal throne of Alexandria. He would hold it for forty-five years, but spend seventeen of them in exile.",
 "Five times he was driven from his see by emperors who sought peace with the Arian party: to Trier, to Rome, to the desert of the Egyptian monks, and to the catacombs and house-roofs of his own city. Each time he returned, and each time he taught the same thing: that if the Son is not what the Father is, no man is saved. From his pen in those years came the Four Discourses Against the Arians, the Defence of the Nicene Definition, and On the Councils, the great arsenal of Nicene theology.",
 "In the Egyptian desert he found not only refuge but friendship. He knew St. Anthony the Great, and after the hermit's repose he wrote the Life of Antony, the book that carried the monastic ideal across the whole Empire and set countless souls, Augustine among them, on the path to God.",
 "Against him stood the power of emperors and the eloquence of the learned; for him stood the Scriptures, the monks, and the faith of the simple. Twice St. Anthony himself came down from the mountain to stand publicly at his side. The age would later remember the lonely struggle in a single phrase: Athanasius against the world.",
 "He outlived nearly every emperor who exiled him. He reposed in peace in Alexandria on May 2, 373, having seen the faith of Nicaea publicly confirmed once more before his death. The Church keeps him as the Pillar of Orthodoxy and a Father of the Fathers, and reads his treatise On the Incarnation still as the clearest brief statement of why God became man.",
 ],
 quotes: [
 {
 text: "He was made man that we might be made God; and He manifested Himself by a body that we might receive the idea of the unseen Father; and He endured the insolence of men that we might inherit immortality.",
 source: "On the Incarnation, 54",
 href: "/saints/athanasius-the-great/on-the-incarnation#s1",
 },
 {
 text: "In the beginning wickedness did not exist. Nor indeed does it exist even now in those who are holy, nor does it in any way belong to their nature.",
 source: "Against the Heathen, 2",
 href: "/saints/athanasius-the-great/against-the-heathen",
 },
 {
 text: "He ever was and is and never was not. For the Father being everlasting, His Word and His Wisdom must be everlasting.",
 source: "Four Discourses Against the Arians, I.9",
 href: "/saints/athanasius-the-great/four-discourses-against-the-arians",
 },
 {
 text: "The Son is not from nothing but from God, and is Word and Wisdom, not creature or work, but a proper offspring from the Father.",
 source: "On the Nicene Definition, 19",
 href: "/saints/athanasius-the-great/on-the-nicene-definition",
 },
 {
 text: "We believe in one Only and True God, the Father Almighty, Creator and Framer of all things.",
 source: "On the Councils of Ariminum and Seleucia",
 href: "/saints/athanasius-the-great/on-the-councils",
 },
 {
 text: "Virtue has need at our hands of willingness alone, for it is not far from us, nor is it without us, but it is within us, and is easy if only we are willing.",
 source: "Life of Antony, 20",
 href: "/saints/athanasius-the-great/life-of-antony",
 },
 {
 text: "We Christians hold the mystery not in the wisdom of Greek arguments, but in the power of faith richly supplied to us by God through Jesus Christ.",
 source: "Life of Antony, 78",
 href: "/saints/athanasius-the-great/life-of-antony",
 },
 {
 text: "Believe on the Lord and love Him; keep yourselves from filthy thoughts and fleshly pleasures.",
 source: "Life of Antony, 55",
 href: "/saints/athanasius-the-great/life-of-antony",
 },
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
 {
 slug: "against-the-heathen",
 title: "Against the Heathen",
 subtitle: "Contra Gentes",
 year: "c. 318",
 blurb:
 "The companion to On the Incarnation. Athanasius shows how idolatry and evil entered by the soul turning from God, and how creation and the soul itself still point back to the Word through whom all things were made.",
 topics: ["Creation", "Idolatry", "The Soul", "Knowledge of God", "Apologetics"],
 },
 {
 slug: "four-discourses-against-the-arians",
 title: "Four Discourses Against the Arians",
 subtitle: "Orationes contra Arianos",
 year: "c. 356-360",
 blurb:
 "The fullest refutation of Arianism: a verse-by-verse defense of the Son's eternity and equality with the Father, answering every text the Arians pressed into service. The backbone of Nicene theology.",
 topics: ["Trinity", "Christology", "Arianism", "Nicaea", "Scripture"],
 },
 {
 slug: "on-the-nicene-definition",
 title: "On the Nicene Definition",
 subtitle: "De Decretis",
 year: "c. 352",
 blurb:
 "Why the Council of Nicaea chose its words. Athanasius defends the non-scriptural terms 'from the essence' and 'one in essence' as the only way to fence out the Arian evasions and confess the Son truly God.",
 topics: ["Nicaea", "Trinity", "Councils", "Doctrine", "Tradition"],
 },
 {
 slug: "on-the-councils",
 title: "On the Councils of Ariminum and Seleucia",
 subtitle: "De Synodis",
 year: "c. 359-361",
 blurb:
 "A history and theological reckoning of the rival councils and the shifting Arian creeds, written to gather the wavering back to the one faith of Nicaea by showing the unity beneath its disputed words.",
 topics: ["Councils", "Arianism", "Creeds", "Church History", "Unity"],
 },
 {
 slug: "life-of-antony",
 title: "Life of Antony",
 subtitle: "Vita S. Antonii",
 year: "c. 360",
 blurb:
 "Athanasius's life of his friend St. Anthony the Great: the call of the Gospel, the long warfare in the tombs and the desert, and the wisdom by which the desert was made a city. The book that carried monasticism across the world.",
 topics: ["Monasticism", "Asceticism", "Spiritual Warfare", "Desert", "Prayer"],
 },
 ],
 },
 {
 slug: "john-chrysostom",
 byname: "Golden-Mouth",
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
 "It was at Antioch, in the Lent of 387, that he became the voice of a terrified city. When the people, crushed by a new tax, had thrown down and broken the statues of the emperor Theodosius and dreaded his vengeance, John preached the twenty-one Homilies on the Statues, holding the city together with the fear of God and the hope of mercy until imperial pardon came. The people never forgot it, and it was there that the name Golden-Mouth fastened to him.",
 "In 397 he was seized, almost kidnapped, and brought to Constantinople to be made archbishop of the capital. He gave away the silver of the patriarchate, fed the poor, and from the pulpit rebuked the luxury of the court. The empress Eudoxia, whose vanity he had publicly named, twice procured his exile.",
 "The second exile killed him. Sent on foot through the Armenian highlands in the winter of 407, he died at Comana in Pontus on September 14, his last words: 'Glory to God for all things.'",
 "Thirty-one years later, in 438, his relics were brought home to Constantinople in triumph, and the emperor Theodosius II laid his face upon the coffin to beg forgiveness for the wrong his parents had done the saint. The Church numbers him with St. Basil the Great and St. Gregory the Theologian as one of the Three Hierarchs, and keeps him as the author of the Divine Liturgy most often served in Orthodox churches to this day.",
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
 subtitle: "The six books, complete",
 year: "c. 386",
 blurb:
 "The weight of the priesthood, the manner of those who would bear it, and why the young Chrysostom fled ordination.",
 topics: ["Priesthood", "Humility", "Pride", "Eucharist", "Vocation"],
 },
 {
 slug: "homilies-on-john",
 title: "Homilies on the Gospel of John",
 subtitle: "The complete eighty-eight homilies",
 year: "c. 391",
 blurb:
 "Chrysostom's verse-by-verse preaching through the whole Fourth Gospel, all eighty-eight homilies, the longest patristic treatment of any New Testament book.",
 topics: ["Logos", "Incarnation", "Trinity", "Eucharist", "Scripture", "Theology"],
 },
 {
 slug: "homilies-on-romans",
 title: "Homilies on the Epistle to the Romans",
 subtitle: "The complete thirty-two homilies",
 year: "c. 391",
 blurb:
 "Chrysostom's verse-by-verse exposition of St. Paul's greatest epistle, on grace, faith, the law, and life in the Spirit, across all sixteen chapters.",
 topics: ["Grace", "Faith", "Law", "Salvation", "Repentance", "Scripture"],
 },
 {
 slug: "homilies-on-hebrews",
 title: "Homilies on the Epistle to the Hebrews",
 subtitle: "The complete thirty-four homilies",
 year: "c. 403",
 blurb:
 "Delivered near the end of his life and published from a hearer's notes, Chrysostom's reading of Hebrews on Christ the High Priest and the better covenant.",
 topics: ["Christ", "Priesthood", "Covenant", "Faith", "Perseverance", "Scripture"],
 },
 {
 slug: "homilies-on-1-corinthians",
 title: "Homilies on the First Epistle to the Corinthians",
 subtitle: "The complete forty-four homilies",
 year: "c. 392",
 blurb:
 "Chrysostom's pastoral reading of a divided church, on unity, the gifts, the Eucharist, the resurrection of the body, and the hymn to love in chapter thirteen.",
 topics: ["Love", "Unity", "Eucharist", "Resurrection", "Wisdom", "Scripture"],
 },
 {
 slug: "homilies-on-2-corinthians",
 title: "Homilies on the Second Epistle to the Corinthians",
 subtitle: "The complete thirty homilies",
 year: "c. 392",
 blurb:
 "The most personal of Paul's letters expounded: affliction and comfort, the ministry of reconciliation, godly sorrow, and strength made perfect in weakness.",
 topics: ["Affliction", "Comfort", "Repentance", "Ministry", "Weakness", "Scripture"],
 },
 {
 slug: "homilies-on-ephesians",
 title: "Homilies on the Epistle to the Ephesians",
 subtitle: "The complete twenty-four homilies",
 year: "c. 392",
 blurb:
 "On the mystery of the Church as the body of Christ, grace through faith, the unity of the Spirit, and the whole armour of God.",
 topics: ["Church", "Grace", "Unity", "Marriage", "Spiritual Warfare", "Scripture"],
 },
 {
 slug: "homilies-on-philippians",
 title: "Homilies on the Epistle to the Philippians",
 subtitle: "The complete fifteen homilies",
 year: "c. 400",
 blurb:
 "Joy from a prison cell: the self-emptying of Christ, pressing toward the prize, and learning in whatsoever state to be content.",
 topics: ["Joy", "Humility", "Christ", "Contentment", "Perseverance", "Scripture"],
 },
 {
 slug: "homilies-on-colossians",
 title: "Homilies on the Epistle to the Colossians",
 subtitle: "The complete twelve homilies",
 year: "c. 399",
 blurb:
 "Christ the image of the invisible God and the fullness of the Godhead, against every philosophy that would dim His supremacy.",
 topics: ["Christ", "Wisdom", "Baptism", "Thanksgiving", "Heresy", "Scripture"],
 },
 {
 slug: "homilies-on-1-thessalonians",
 title: "Homilies on the First Epistle to the Thessalonians",
 subtitle: "The complete eleven homilies",
 year: "c. 400",
 blurb:
 "Encouragement to a young church on holiness, brotherly love, work, and the coming of the Lord and the resurrection of those who sleep.",
 topics: ["Hope", "Resurrection", "Holiness", "Love", "Vigilance", "Scripture"],
 },
 {
 slug: "homilies-on-2-thessalonians",
 title: "Homilies on the Second Epistle to the Thessalonians",
 subtitle: "The complete five homilies",
 year: "c. 400",
 blurb:
 "On patience under persecution, the man of sin and the restrainer, and the duty to stand fast and to labour quietly for one's bread.",
 topics: ["Patience", "Judgment", "Tradition", "Work", "Vigilance", "Scripture"],
 },
 {
 slug: "homilies-on-1-timothy",
 title: "Homilies on the First Epistle to Timothy",
 subtitle: "The complete eighteen homilies",
 year: "c. 397",
 blurb:
 "A handbook for the shepherd: sound doctrine, prayer, the qualifications of bishops and deacons, the care of widows, and contentment with godliness.",
 topics: ["Priesthood", "Prayer", "Order", "Almsgiving", "Contentment", "Scripture"],
 },
 {
 slug: "homilies-on-2-timothy",
 title: "Homilies on the Second Epistle to Timothy",
 subtitle: "The complete ten homilies",
 year: "c. 397",
 blurb:
 "Paul's last letter: fan into flame the gift of God, endure hardship as a good soldier, and the charge to preach the word in season and out.",
 topics: ["Perseverance", "Courage", "Scripture", "Suffering", "Ministry", "Faith"],
 },
 {
 slug: "homilies-on-titus",
 title: "Homilies on the Epistle to Titus",
 subtitle: "The complete six homilies",
 year: "c. 397",
 blurb:
 "On ordering the churches of Crete, the character of elders, sound teaching, and the grace of God that trains us to live soberly and godly.",
 topics: ["Order", "Grace", "Good Works", "Teaching", "Sobriety", "Scripture"],
 },
 {
 slug: "homilies-on-philemon",
 title: "Homilies on the Epistle to Philemon",
 subtitle: "The complete three homilies",
 year: "c. 397",
 blurb:
 "On the runaway slave Onesimus returned as a brother: a short letter Chrysostom reads as a lesson in mercy, restitution, and the dignity of every soul.",
 topics: ["Mercy", "Forgiveness", "Brotherhood", "Humility", "Charity", "Scripture"],
 },
 {
 slug: "homilies-on-acts",
 title: "Homilies on the Acts of the Apostles",
 subtitle: "The complete fifty-five homilies",
 year: "c. 400",
 blurb:
 "The only complete patristic commentary on Acts to survive: the descent of the Spirit, the life of the first community, and the apostolic preaching from Jerusalem to Rome.",
 topics: ["Holy Spirit", "Church", "Mission", "Almsgiving", "Martyrdom", "Scripture"],
 },
 {
 slug: "commentary-on-galatians",
 title: "Commentary on the Epistle to the Galatians",
 subtitle: "The complete commentary, all six chapters",
 year: "c. 395",
 blurb:
 "Chrysostom's continuous commentary on Paul's defense of the Gospel of grace: justified by faith and not by the law, and called to the freedom of the children of God.",
 topics: ["Grace", "Faith", "Freedom", "Law", "Spirit", "Scripture"],
 },
 ],
 quotes: [
 {
 text: "Let no one fear death, for the death of the Savior has set us free.",
 source: "The Paschal Homily",
 href: "/saints/john-chrysostom/paschal-homily",
 },
 {
 text: "Nothing is more frigid than a Christian, who cares not for the salvation of others.",
 source: "Homilies on the Acts of the Apostles, Homily 20",
 href: "/saints/john-chrysostom/homilies-on-acts",
 },
 {
 text: "Nothing is so important as thy brother's salvation.",
 source: "Homilies on the Epistle to the Romans",
 href: "/saints/john-chrysostom/homilies-on-romans",
 },
 {
 text: "Nothing is worse than envy; to destroy another it destroys itself also.",
 source: "Homilies on the Gospel of John",
 href: "/saints/john-chrysostom/homilies-on-john",
 },
 {
 text: "He that loves never can hate.",
 source: "Homilies on the First Epistle to the Corinthians, on the hymn to love",
 href: "/saints/john-chrysostom/homilies-on-1-corinthians",
 },
 {
 text: "Nothing is more blessed than that chain.",
 source: "Homilies on the Epistle to the Ephesians, on the imprisonment of St. Paul",
 href: "/saints/john-chrysostom/homilies-on-ephesians",
 },
 {
 text: "Almsgiving I mean, fits not only the rich, but also the needy.",
 source: "Homilies on the Epistle to the Hebrews",
 href: "/saints/john-chrysostom/homilies-on-hebrews",
 },
 {
 text: "God has bestowed a power on priests greater than that of our natural parents.",
 source: "On the Priesthood",
 href: "/saints/john-chrysostom/on-the-priesthood",
 },
 {
 text: "For neither of these did the Law avail, but grace was sufficient for both.",
 source: "Commentary on the Epistle to the Galatians",
 href: "/saints/john-chrysostom/commentary-on-galatians",
 },
 {
 text: "Glory to God for all things.",
 source: "His last words, at Comana in Pontus, 407",
 },
 ],
 },
 {
 slug: "basil-the-great",
 byname: "Father of Monasticism",
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
 byname: "The Theologian",
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
 byname: "Defender of the Holy Icons",
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
 byname: "Acquirer of the Holy Spirit",
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
 {
 slug: "ignatius-of-antioch",
 byname: "The God-bearer",
 iconUrl: "/saints/icons/ignatius-of-antioch.jpg",
 name: "St. Ignatius of Antioch",
 epithet: "Bishop of Antioch · Apostolic Father",
 born: "c. 35",
 reposed: "c. 108 (Rome)",
 feastDays: ["December 20"],
 see: "Antioch",
 shortBio:
 "A disciple of the Apostle John and second bishop of Antioch, who was taken in chains to Rome to be killed by wild beasts in the Colosseum, and wrote seven letters along the road that have shaped the Church ever since.",
 life: [
 "Tradition names Ignatius as a disciple of the Apostle John and identifies him with the child whom the Lord set in the midst of the disciples and said, 'Whosoever shall humble himself as this little child, the same is greatest in the kingdom of heaven.' From this comes his second name, Theophorus, the God-bearer.",
 "He succeeded the Apostle Peter and Evodius as bishop of Antioch, the city where the disciples were first called Christians. For some forty years he led the Antiochene church through the last decades of the apostolic generation.",
 "In the persecution under the emperor Trajan he was condemned to die at Rome. Bound and guarded by ten soldiers whom he called 'ten leopards', he was taken overland through Asia Minor. At each stop the local churches sent delegations to comfort him, and he wrote to them in return: to the Ephesians, the Magnesians, the Trallians, the Romans, the Philadelphians, the Smyrneans, and to Polycarp of Smyrna.",
 "He was martyred in the Colosseum, devoured by lions. The seven letters are the earliest patristic writings outside the New Testament, and witness to the eucharistic theology, the threefold ministry of bishop, presbyter, and deacon, and the unity of the Church around her bishop.",
 ],
 works: [
 {
 slug: "epistle-to-the-romans",
 title: "Epistle to the Romans",
 subtitle: "Written on the road to martyrdom",
 year: "c. 107",
 blurb:
 "The fiercest of the seven letters: Ignatius begs the Roman Christians not to intervene to spare him from the wild beasts.",
 topics: ["Martyrdom", "Eucharist", "Bishopric", "Unity"],
 },
 ],
 },
 {
 slug: "maximus-the-confessor",
 byname: "The Confessor",
 iconUrl: "/saints/icons/maximus-the-confessor.jpg",
 name: "St. Maximus the Confessor",
 epithet: "Monk · Theologian of the Two Wills of Christ",
 born: "c. 580 (Constantinople)",
 reposed: "August 13, 662",
 feastDays: ["January 21", "August 13"],
 see: "Constantinople (lay)",
 shortBio:
 "The monk who almost alone defended the Orthodox confession that Christ has two natural wills, divine and human, against the imperial monothelite party, and was tortured and exiled for it; called 'the Confessor' for the witness of his maimed body.",
 life: [
 "Born in Constantinople of a noble family, Maximus rose to become first secretary to the emperor Heraclius. In his early thirties he resigned all worldly office and entered the monastery of Chrysopolis across the Bosphorus, where he was tonsured and took up the strict ascetic life.",
 "When the empire and patriarchate adopted monothelitism, the doctrine that Christ had only one will, Maximus left the East and travelled to North Africa and Rome, persuading bishops and councils that the doctrine was a betrayal of Chalcedon. At the Lateran Council of 649, called at his urging, monothelitism was condemned.",
 "For this he was arrested and brought back to Constantinople. He was tried, exiled, brought back, tried again, and finally, when he refused to recant, his tongue was cut out and his right hand cut off, that he might neither speak nor write the truth he confessed.",
 "He was exiled to the Caucasus, where he died on August 13, 662. Twenty years later the Sixth Ecumenical Council of 681 affirmed everything he had taught and condemned everything he had opposed. The Church gave him the name 'Confessor' for the witness of his maimed body and silent tongue.",
 ],
 works: [
 {
 slug: "four-hundred-chapters-on-love",
 title: "Four Hundred Chapters on Love",
 subtitle: "First Century",
 year: "c. 626",
 blurb:
 "Maximus's most-read work: a ladder of short maxims on the ascetic life, organized in four centuries of one hundred chapters each.",
 topics: ["Love", "Asceticism", "Theology", "Will"],
 },
 ],
 },
 {
 slug: "symeon-the-new-theologian",
 byname: "The New Theologian",
 iconUrl: "/saints/icons/symeon-the-new-theologian.jpg",
 name: "St. Symeon the New Theologian",
 epithet: "Abbot of St. Mamas · Father of Hesychasm",
 born: "949 (Galatia)",
 reposed: "March 12, 1022",
 feastDays: ["March 12", "October 12"],
 see: "Constantinople",
 shortBio:
 "One of only three saints surnamed 'the Theologian' in the Orthodox Church, who insisted, against the academic theology of his day, that the same gifts of the Holy Spirit given to the apostles are available to every Christian who seeks them.",
 life: [
 "Symeon entered the imperial service in Constantinople, but at the age of twenty-seven he abandoned the world to become a monk under the elder Symeon the Studite, whose name and discipleship he afterwards bore.",
 "Some years into his monastic life, while at prayer in his cell, he was visited by an experience of the uncreated divine light. He saw himself filled with light, and within the light he saw Christ Himself. The experience was repeated many times throughout his life and became the central theme of his preaching: that the vision of God is not reserved for the apostles or for the great fathers, but is offered to every Christian who repents and prays.",
 "Made abbot of the monastery of St. Mamas in Constantinople, he reformed it and shepherded it for twenty-five years. His insistence that the gifts of the Spirit are still given drew opposition from churchmen who considered it presumptuous; he was eventually exiled to a small abandoned chapel across the Bosphorus, where his disciples followed him and a new monastery grew up around him.",
 "His Hymns of Divine Love, his Catechetical Discourses, and the Practical and Theological Chapters became the foundation of the hesychast tradition that flowered three centuries later under Gregory Palamas. He reposed in his hermitage on March 12, 1022.",
 ],
 works: [
 {
 slug: "discourse-on-faith",
 title: "Discourse on Faith",
 subtitle: "From the Catechetical Discourses",
 year: "Late 10th c.",
 blurb:
 "Symeon's account of the divine light he saw at prayer, and his insistence that the same vision is offered to every Christian who seeks it.",
 topics: ["Holy Spirit", "Light", "Repentance", "Mysticism"],
 },
 ],
 },
 {
 slug: "augustine-of-hippo",
 byname: "Doctor of Grace",
 iconUrl: "/saints/icons/augustine-of-hippo.jpg",
 name: "St. Augustine of Hippo",
 epithet: "Bishop of Hippo · Blessed Augustine",
 born: "November 13, 354 (Tagaste, North Africa)",
 reposed: "August 28, 430",
 feastDays: ["June 15", "August 28"],
 see: "Hippo Regius",
 shortBio:
 "The North African bishop whose long Tractates on the Gospel of John gave the Latin Church its deepest reading of the Fourth Gospel.",
 life: [
 "Augustine was born in Tagaste in Roman North Africa to a pagan father, Patricius, and a Christian mother, Monica, whose prayers and tears the Church remembers as the model of every persevering parent. He was educated in rhetoric at Carthage and grew into a brilliant teacher of pagan letters before his conversion.",
 "For nine years he followed the Manichaean sect, then briefly Neoplatonism, restless and divided in himself. The decisive turn came in 386 in a garden in Milan, where he heard a child's voice and opened Paul's epistle to the Romans. He was baptized by Ambrose of Milan at the Paschal Vigil of 387, his mother present, then sailed home to Africa.",
 "Ordained priest at Hippo Regius almost against his will, he was consecrated bishop there in 395 and held that small African see for thirty-five years. He preached without rest, wrote without rest, and answered every controversy of his age, from the Donatists to the Pelagians to the pagan accusation that the sack of Rome in 410 was Christianity's fault.",
 "His Confessions are the first interior autobiography in Christian literature. His City of God reframes history. His one hundred twenty-four Tractates on John, delivered as a homiletic series to his African flock, walk the entire Gospel verse by verse. He reposed at Hippo on August 28, 430, while the Vandals besieged the city, with the penitential Psalms pinned to the wall above his bed.",
 ],
 works: [
 {
 slug: "confessions",
 title: "Confessions",
 subtitle: "Book I, complete (Pusey translation)",
 year: "c. 397-400",
 blurb:
 "The first interior autobiography in Christian literature. Book I covers Augustine's infancy and earliest boyhood as he reflects on God's presence from his first breath.",
 topics: ["Autobiography", "Prayer", "Sin", "Grace", "Memory", "Theology"],
 },
 {
 slug: "tractates-on-john",
 title: "Tractates on the Gospel of John",
 subtitle: "Selections from the one hundred twenty-four homilies",
 year: "406-420",
 blurb:
 "Augustine's verse-by-verse reading of the Fourth Gospel, the longest Latin commentary on John from the early Church.",
 topics: ["Logos", "Incarnation", "Trinity", "Eucharist", "Scripture", "Theology"],
 },
 ],
 },
 {
 slug: "cyril-of-alexandria",
 byname: "Seal of the Fathers",
 iconUrl: "/saints/icons/cyril-of-alexandria.jpg",
 name: "St. Cyril of Alexandria",
 epithet: "Patriarch of Alexandria · Seal of the Fathers",
 born: "c. 376 (Alexandria or its surrounds)",
 reposed: "June 27, 444",
 feastDays: ["June 9", "January 18"],
 see: "Alexandria",
 shortBio:
 "The patriarch whose Christology defeated Nestorianism at the Council of Ephesus and whose commentary on John defends the eternal divinity of the Word.",
 life: [
 "Cyril was born about 376 to a notable Alexandrian family and trained from his youth in Scripture and the writings of Athanasius, his predecessor by two generations on the throne of St. Mark. As a young man he spent five years among the monks of the Egyptian desert before returning to the city to assist his uncle, the patriarch Theophilus.",
 "He succeeded Theophilus in 412 and would govern the Church of Alexandria for thirty-two years. His earliest works are exegetical: a long commentary on John, a parallel commentary on Luke, a treatise on the Trinity in dialogue form. He read every line of Scripture against the question that mattered to him most: who is Christ?",
 "In 428 Nestorius, archbishop of Constantinople, denied that the Virgin Mary should be called Theotokos, the God-bearer, on the grounds that Christ had two persons. Cyril answered with twelve anathemas and rallied the Church. At the Third Ecumenical Council at Ephesus in 431, the title Theotokos was vindicated and Nestorius was deposed.",
 "Cyril spent his last years defending and refining the Christology that the Council had received, and is honored to this day as the Seal of the Fathers for the precision and authority of his teaching. He reposed in Alexandria on June 27, 444.",
 ],
 works: [
 {
 slug: "commentary-on-john",
 title: "Commentary on the Gospel of John",
 subtitle: "Selections from the twelve books",
 year: "c. 425",
 blurb:
 "Cyril's reading of the Fourth Gospel, ordered by the question who is Christ, given to the Church before the Nestorian crisis erupted.",
 topics: ["Christology", "Trinity", "Logos", "Incarnation", "Theotokos", "Scripture"],
 },
 ],
 },
 {
 slug: "irenaeus-of-lyons",
 byname: "Disciple of the Disciple",
 iconUrl: "/saints/icons/irenaeus-of-lyons.jpg",
 name: "St. Irenaeus of Lyons",
 epithet: "Bishop of Lugdunum · Disciple of Polycarp",
 born: "c. 130 (Smyrna)",
 reposed: "c. 202",
 feastDays: ["August 23"],
 see: "Lugdunum (Lyons)",
 shortBio:
 "The second-century bishop who heard Polycarp who heard John, and whose Against Heresies preserved the apostolic faith against the Gnostic teachers of his age.",
 life: [
 "Irenaeus was born in Asia Minor, probably in Smyrna, around the year 130. As a boy he heard the elder Polycarp, bishop and martyr, who had himself been a disciple of John the Theologian. The continuity from the Apostle to Polycarp to Irenaeus is one of the visible threads by which the early Church guarded the deposit of faith.",
 "He travelled west to Gaul as a priest of the Christian community at Lyons. When the persecution of 177 cut down the bishop Pothinus and a great company of the faithful, Irenaeus was away in Rome bearing a letter; on his return he was consecrated to the empty see.",
 "His Against Heresies, written about 180, was the first systematic refutation of the Gnostic sects, especially the school of Valentinus. He answered them, paradoxically, by going through their own writings and showing how completely they had abandoned the apostolic preaching, particularly the testimony of the Fourth Gospel.",
 "Irenaeus is the earliest extant Father to cite all four Gospels together as a single canonical witness, and the first to develop in detail the doctrine of recapitulation: that Christ, by becoming what we are, sums up the whole of human nature and restores in Himself what Adam lost. He is honored as a martyr, though the manner of his repose around 202 is not certainly known.",
 ],
 works: [
 {
 slug: "against-heresies-on-john",
 title: "Against Heresies: On the Fourth Gospel",
 subtitle: "Selections from Books III and V",
 year: "c. 180",
 blurb:
 "Irenaeus on why the Church reads four Gospels and how the Word who was with the Father became flesh to recapitulate the whole of humanity.",
 topics: ["Logos", "Incarnation", "Recapitulation", "Gospel", "Tradition", "Theology"],
 },
 ],
 },
 {
 slug: "apostle-paul",
 byname: "The Apostle to the Nations",
 iconUrl: "/saints/icons/apostle-paul.jpg",
 name: "Holy Apostle Paul",
 epithet: "Apostle to the Nations · Chosen Vessel",
 born: "c. AD 5 (Tarsus in Cilicia)",
 reposed: "c. AD 67 (Rome)",
 feastDays: ["June 29", "June 30"],
 see: "Apostle at large; preached from Damascus to Rome",
 shortBio:
 "The Pharisee from Tarsus who hunted the Church until the risen Christ stopped him on the road to Damascus, and who from that day to his beheading at Rome traveled the empire planting the Gospel.",
 life: [
 "Saul was born around the year five in Tarsus of Cilicia to a family of Roman citizens. He was educated at the feet of Gamaliel, the leading rabbi of his generation, and grew into a zealous Pharisee. He held the cloaks of those who stoned the first martyr Stephen, and was on the road to Damascus to arrest Christians when the Lord Himself appeared to him in light and called him by name.",
 "The blinding of Saul became the opening of the Apostle Paul. After three days of prayer in Damascus he was baptized by Ananias, and after a season in Arabia he began the work that would fill the rest of his life. Three missionary journeys, more than ten thousand miles by land and sea, planted the Gospel in cities from Antioch to Corinth to Rome.",
 "His epistles, more than any other writing, gave the early Church the words by which it learned to speak of Christ. Romans, the two letters to Corinth, Galatians, Ephesians, Philippians, Colossians, the letters to Thessalonica, Timothy, and Titus, the letter to Philemon, and the long sermon to the Hebrews together fill the second half of the New Testament.",
 "Paul wrote his last letter from a Roman prison, awaiting execution under Nero. He was beheaded on the Ostian Way, traditionally on the same day Peter was crucified, around the year sixty-seven. The Church keeps their feast together on June 29, and his alone on June 30 with the Synaxis of the Twelve Apostles.",
 ],
 works: [
 {
 slug: "letter-from-the-prison",
 title: "Final Words from Prison",
 subtitle: "Selected passages from 2 Timothy and Philippians",
 year: "c. 64-67",
 blurb:
 "Paul's last surviving letters, written in chains, on contentment, the good fight, and the crown of righteousness laid up for those who love His appearing.",
 topics: ["Apostle", "Suffering", "Hope", "Mission", "Scripture"],
 },
 ],
 },
 {
 slug: "mary-of-egypt",
 pronoun: "her",
 byname: "The Desert Penitent",
 iconUrl: "/saints/icons/mary-of-egypt.jpg",
 name: "St. Mary of Egypt",
 epithet: "Ascetic of the Jordan · Mother of all penitents",
 born: "c. 344 (Alexandria)",
 reposed: "c. 421 (the Trans-Jordanian desert)",
 feastDays: ["April 1", "Fifth Sunday of Great Lent"],
 see: "Hermitess beyond the Jordan",
 shortBio:
 "The Alexandrian who lived in dissolution for seventeen years, was halted at the doors of the Holy Sepulchre by an unseen hand, and spent forty-seven years alone in the desert weeping for her sins until the Theotokos sent the priest Zosimas to find her.",
 life: [
 "Mary was born in Egypt around the year three hundred and forty-four. At twelve she ran from her parents to Alexandria, where for seventeen years she lived by begging and prostitution, not so much for money as for the pleasure of sin. With a band of pilgrims sailing for Jerusalem to venerate the Cross she crossed the sea, paying her passage as she paid for everything, with her body.",
 "On the feast of the Exaltation she tried to enter the church of the Holy Sepulchre with the crowd, and an unseen power held her back at the doors. After three failed attempts she understood. She went outside, prayed before an icon of the Theotokos, vowed to leave her life, and returned: this time the doors opened.",
 "Hearing within her heart the voice that said, 'Cross the Jordan, and there you will find rest,' she bought three small loaves and walked into the desert, where she lived for forty-seven years alone with no one but God. Toward the end of her life the priest Zosimas, fasting in the same desert during Great Lent, found her and learned her story. She received Communion from him the following year on Holy Thursday, beside the Jordan, and was dead and buried in the sand when he came back a year later.",
 "Her life, written by Saint Sophronius of Jerusalem, is read in full in Orthodox monasteries at Matins of the Thursday of the fifth week of Great Lent, the Great Canon of St. Andrew of Crete sung throughout. She is the patroness of every penitent who has thought it too late to turn.",
 ],
 works: [
 {
 slug: "life-by-sophronius",
 title: "The Life of St. Mary of Egypt",
 subtitle: "Selections from the Life by St. Sophronius of Jerusalem",
 year: "c. 638",
 blurb:
 "The astonishing account of Mary's encounter at the doors of the Sepulchre, her forty-seven years in the desert, and her last Communion at the hands of Zosimas.",
 topics: ["Repentance", "Asceticism", "Theotokos", "Forgiveness", "Lent"],
 },
 ],
 },
 {
 slug: "nicholas-the-wonderworker",
 byname: "The Wonderworker",
 iconUrl: "/saints/icons/nicholas-the-wonderworker.jpg",
 name: "St. Nicholas the Wonderworker",
 epithet: "Archbishop of Myra in Lycia · The Wonderworker",
 born: "c. 270 (Patara in Lycia)",
 reposed: "December 6, 343",
 feastDays: ["December 6", "May 9"],
 see: "Myra in Lycia",
 shortBio:
 "The fourth-century bishop of Myra whose secret almsgiving, deliverances at sea, and reckless love for the poor have made him the most universally honored saint of the Christian world.",
 life: [
 "Nicholas was born around the year two hundred and seventy at Patara, the son of devout Christian parents who left him their estate when he was still a young man. He spent the inheritance not on himself but on those in need, most famously on three sisters whose father had no dowry for them and was preparing to sell them into prostitution. Three nights in a row Nicholas threw a bag of gold through their window, the last time being caught by the father as he ran away.",
 "He was ordained reader, deacon, and presbyter while still very young, and after a pilgrimage to the Holy Land was chosen by direct revelation to succeed the dead archbishop of Myra. He governed that see through the last great persecution under Diocletian, was imprisoned and tortured for the Faith, and emerged at the peace of Constantine to attend the First Ecumenical Council at Nicaea in 325, where he is said to have struck Arius across the face for his blasphemy.",
 "The wonders worked through him filled the synaxaria of every Orthodox nation. He calmed storms at sea, raised the drowned, fed the starving in a famine year, struck down corrupt officials and softened cruel ones. The sailors of every Mediterranean port took him for their patron, and the children of every Christian household keep his feast still.",
 "He reposed in Myra on December the sixth, 343. His relics were translated to Bari in southern Italy in 1087, where they myrrh still flows from them. He is honored everywhere: in Russia his icon hangs in every home, in Greece his troparion is sung at every Liturgy, in the West his memory is the seed of the Father Christmas of the modern world. The Orthodox Church does not let the figure be sentimentalized; he remains a wonderworker, an iconoclast of injustice, and the swift help of all who call on him.",
 ],
 works: [
 {
 slug: "stories-and-prayers",
 title: "Stories and Prayers of St. Nicholas",
 subtitle: "Selected episodes from the Life and a prayer for sailors",
 year: "Compiled from sources of the 4th-9th centuries",
 blurb:
 "The three bags of gold, the famine in Myra, the rescue of the unjustly condemned officers, and the Orthodox troparion still sung at his Liturgy.",
 topics: ["Almsgiving", "Justice", "Hospitality", "Prayer", "Wonders"],
 },
 ],
 },
 {
 slug: "marina-the-great-martyr",
 pronoun: "her",
 byname: "Margaret of Antioch",
 iconUrl: "/saints/icons/marina-the-great-martyr.jpg",
 name: "St. Marina the Great-Martyr",
 epithet: "Great-Martyr of Antioch in Pisidia · Margaret",
 born: "c. 255 (Antioch in Pisidia)",
 reposed: "c. 275",
 feastDays: ["July 17"],
 shortBio:
 "The young virgin of Pisidia who confessed Christ before her own pagan father, endured fierce tortures, and is venerated in the West under the name Margaret.",
 life: [
 "Marina was born around the middle of the third century at Antioch in Pisidia, the daughter of a pagan priest named Aedesius. Her mother died while she was an infant, and the child was given over to a Christian nurse in the countryside, who raised her in the faith and the love of Christ. When her father learned that she had become a Christian he cast her off, and so the girl who might have inherited his house became instead a keeper of sheep.",
 "In her fifteenth year the eparch Olybrius, passing through the region, saw the beautiful shepherdess and desired her for his wife, on the one condition that she renounce Christ. Marina answered that she was already betrothed to the Lord and would not deny Him. The enraged official had her seized and brought to judgment, where she confessed her faith openly before the tribunal.",
 "She was subjected to terrible tortures, beaten with rods, her body torn with iron combs, burned with torches, and bound and cast into a vessel of water. At each torment, the Synaxarion relates, she was strengthened from heaven and her wounds were healed, so that the crowds who watched began themselves to believe, and many were martyred with her. The tradition tells also of her struggle with the demon in her prison cell, whom she overcame by the sign of the Cross.",
 "At last she was beheaded, around the year 275, while still a girl. Her relics were widely venerated across both East and West, and under the name Margaret she became one of the most beloved virgin-martyrs of medieval Christendom. The Orthodox Church keeps her memory on the seventeenth of July, honoring in her the fearless confession of a child against the powers of the age.",
 ],
 works: [],
 },
 {
 slug: "hermione-of-ephesus",
 pronoun: "her",
 byname: "Daughter of the Apostle Philip",
 iconUrl: "/saints/icons/hermione-of-ephesus.jpg",
 name: "St. Hermione of Ephesus",
 epithet: "Virgin-Martyr · Daughter of the Apostle Philip",
 born: "1st century",
 reposed: "c. 117 (Ephesus)",
 feastDays: ["September 4"],
 see: "Ephesus",
 shortBio:
 "One of the four prophesying daughters of the Apostle Philip, a healer of the sick at Ephesus who confessed Christ before two emperors and died a martyr.",
 life: [
 "Hermione was one of the four daughters of the holy Apostle Philip, the deacon and evangelist of whom the Book of Acts says that they 'did prophesy.' Raised in the apostolic household, she and her sister Eutychia set out after their father's repose to find the Apostle John the Theologian, but arriving at Ephesus they learned that he too had already fallen asleep in the Lord.",
 "They remained at Ephesus, where Hermione was instructed by a disciple of the apostles named Petronius and gave herself to the service of the Church. She received from God the gift of healing, and her dwelling became a place of refuge where the sick of body and soul were cured in the name of Christ, so that many of the pagans came to the faith through her.",
 "In the days of the emperor Trajan, and again under his successor Hadrian, she was brought before the authorities and commanded to sacrifice to the idols. She confessed Christ boldly, and was subjected to torture; but the tradition relates that her tormentors were themselves converted by the wonders that attended her sufferings, and that she healed even those who had been sent to harm her.",
 "After long endurance she gave up her soul to God at Ephesus around the year 117. The Church honors her on the fourth of September as a virgin and martyr, and as one of the prophesying daughters of an apostle, a living link between the age of the Twelve and the Church of the Fathers.",
 ],
 works: [],
 },
 {
 slug: "isidora-of-tabenna",
 pronoun: "her",
 byname: "The Fool-for-Christ",
 iconUrl: "/saints/icons/isidora-of-tabenna.jpg",
 name: "St. Isidora of Tabenna",
 epithet: "Fool-for-Christ · Nun of the Tabennisi Convent",
 born: "4th century",
 reposed: "c. 365 (Tabennisi, Egypt)",
 feastDays: ["May 1"],
 shortBio:
 "The nun of the Tabennisi convent who hid her holiness beneath the guise of madness, served as the lowest of all, and is honored as the first fool-for-Christ.",
 life: [
 "Isidora was a nun of the great women's monastery at Tabennisi in Egypt, the community founded under the rule of St. Pachomius. Among the four hundred sisters of that convent she chose for herself the lowest of all places, and concealed the gifts God had given her under the appearance of folly and derangement.",
 "She wore a rag bound about her head instead of the monastic veil, worked in the kitchen at every menial labor, ate only the scraps and the crumbs left from the pots, and never sat at table with the others. The sisters mocked her, struck her, and treated her as one out of her mind, and she bore all their contempt without a word of complaint, never angry, never idle, praying always in secret.",
 "Her hidden sanctity was revealed when an angel appeared to the great anchorite Pitirim of Porphyrite, telling him that a woman more pleasing to God than he dwelt at Tabennisi, wearing a crown upon her head. Coming to the convent, the old man asked to see all the sisters; and when Isidora was at last brought forward against her will, he bowed to the ground before her and asked her blessing, declaring that she was the holy one the angel had shown him.",
 "The sisters, astonished, fell at her feet and begged forgiveness for their long mistreatment. But Isidora, unable to bear the honor and praise of men, secretly left the monastery and was never found again; whether she withdrew into the desert or fell asleep in the Lord no one knew. The Church keeps her memory on the first of May and honors her as the first of the fools-for-Christ, who counted the world's esteem as nothing for the sake of humility.",
 ],
 works: [],
 },
 {
 slug: "olympias-the-deaconess",
 pronoun: "her",
 byname: "Deaconess of Constantinople",
 iconUrl: "/saints/icons/olympias-the-deaconess.jpg",
 name: "St. Olympias the Deaconess",
 epithet: "Deaconess of the Great Church · Friend of St. John Chrysostom",
 born: "c. 361 (Constantinople)",
 reposed: "c. 408 (Nicomedia)",
 feastDays: ["July 25"],
 see: "Constantinople",
 shortBio:
 "The noble widow of Constantinople who gave her vast fortune to the poor and the Church, served as deaconess of the Great Church, and stood by St. John Chrysostom in his exile.",
 life: [
 "Olympias was born around 361 into one of the great families of Constantinople, the granddaughter of a prefect and heiress to an immense fortune. Left an orphan, she was raised under the guidance of devout relatives and married a young prefect of the city, Nevridius; but he died within a year or two of the wedding, and Olympias, still very young, resolved to remain a widow and to consecrate herself wholly to God.",
 "The emperor Theodosius, wishing her to marry a kinsman of his, placed her property under guardianship when she refused; but she bore the deprivation with such joy, thanking the emperor for relieving her of the burden of administering her wealth, that he relented and restored all to her. From that time she poured out her riches without measure, endowing churches and hospitals, ransoming captives, feeding the poor, and supporting clergy and monastics throughout the East.",
 "The Patriarch Nectarius ordained her deaconess of the Great Church, though she was barely thirty, and in that ministry she served the women of the Church, the sick, and the needy. When St. John Chrysostom came to the throne of Constantinople, he found in her a daughter and a fellow-laborer; she gathered a community of devout women about her near the cathedral, living in fasting, prayer, and works of mercy.",
 "When Chrysostom was driven into exile, Olympias remained steadfastly loyal to him, and for this she was persecuted, slandered, fined, and at last banished from the city. From his exile the saint wrote her a long series of letters, seventeen of which survive, comforting her in her afflictions and bidding her not to grieve. She died in exile at Nicomedia around 408, worn out by sorrow and labor; the Church honors her on the twenty-fifth of July as a deaconess and a confessor.",
 ],
 works: [],
 },
 {
 slug: "gregory-of-nyssa",
 byname: "The Cappadocian",
 iconUrl: "/saints/icons/gregory-of-nyssa.jpg",
 name: "St. Gregory of Nyssa",
 epithet: "Bishop of Nyssa · The Cappadocian Father",
 born: "c. 335 (Caesarea in Cappadocia)",
 reposed: "c. 395 (Nyssa)",
 feastDays: ["January 10"],
 see: "Nyssa",
 shortBio:
 "The youngest of the great Cappadocians, brother of St. Basil and St. Macrina, a profound mystical theologian whose works on the soul and the vision of God shaped all later Orthodox thought.",
 life: [
 "Gregory was born around 335 at Caesarea in Cappadocia, into a family that gave more saints to the Church than perhaps any other: his grandmother Macrina the Elder, his parents Basil and Emmelia, his elder brother Basil the Great, his sister Macrina the Younger, and his brother Peter of Sebaste are all numbered among the saints. He was the youngest of the brothers, and in his early life leaned toward the career of a rhetorician rather than the service of the Church.",
 "Drawn back to the things of God by the example of his sister Macrina and the urging of his brother Basil, he was eventually ordained, and around the year 372 Basil consecrated him bishop of the small town of Nyssa, needing a trustworthy ally in the struggle against the Arians. Gregory was no administrator, Basil himself complained of his brother's unworldliness, and the Arian party soon contrived his deposition and exile.",
 "He returned in triumph at the death of the Arian emperor Valens, and after the repose of Basil he came into his own as a theologian of the first rank. At the Second Ecumenical Council in Constantinople in 381 he was a leading defender of the divinity of the Holy Spirit, and the council named him a touchstone of orthodoxy for the churches of Pontus.",
 "His writings, the great catechetical oration, the treatise on the soul and the resurrection composed as a dialogue with the dying Macrina, the Life of Moses, the homilies on the Song of Songs, and his works against Eunomius, explore the endless ascent of the soul toward a God who can never be exhausted. He reposed around 395, and the Church honors him on the tenth of January among the great Fathers and teachers of the Cappadocian age.",
 ],
 works: [],
 },
 {
 slug: "paisios-the-athonite",
 byname: "Elder of the Holy Mountain",
 iconUrl: "/saints/icons/paisios-the-athonite.jpg",
 name: "St. Paisios the Athonite",
 epithet: "Hieromonk of Mount Athos · Elder of Panagouda",
 born: "July 25, 1924 (Farasa, Cappadocia)",
 reposed: "July 12, 1994 (Souroti, near Thessaloniki)",
 feastDays: ["July 12"],
 see: "Mount Athos (Panagouda, dependency of Koutloumousiou)",
 shortBio:
 "The Cappadocian-born monk of Mount Athos whose hermitage at Panagouda was for twenty-five years a place of pilgrimage for tens of thousands seeking counsel, and who, since his glorification in 2015, has been venerated as one of the great elders of the modern Orthodox world.",
 life: [
 "Arsenios Eznepidis was born in the village of Farasa in Cappadocia on the twenty-fifth of July, 1924, and baptized by the saintly Elder Arsenios of Farasa, who foretold that the boy would one day become a monk. Less than a month after his baptism his family was uprooted by the population exchange between Greece and Turkey, and they settled at Konitsa in Epirus, where he grew up.",
 "He learned carpentry, served in the Greek army as a signalman during the civil war of 1948-1949, and from his youth practiced a strict prayer rule and read the lives of the saints. After his military service he sought out the monastic life, first at the monastery of Esphigmenou on Mount Athos in 1950, then at Philotheou, and was tonsured to the small schema with the name Paisios in 1954.",
 "From 1958 to 1962 he was sent at the bidding of the Metropolitan to help revive monastic life at the dilapidated monastery of Stomion in Konitsa; from 1962 to 1964 he lived on Mount Sinai, struggling in solitude in the cave of Sts. Galaktion and Episteme; and in 1964 he returned to Athos for good. After years at the Iviron skete and at Katounakia, in 1979 he settled at the small cell of Panagouda, a dependency of the monastery of Koutloumousiou, where he was to spend the remaining fifteen years of his life.",
 "There, against all the inclinations of his solitary heart, he gave himself to the multitudes who climbed the steep path to his door, pilgrims from every corner of Greece and from many nations, sometimes a thousand a day in the summer months. He spoke with each as if there were no other, healed the sick by his prayer, foresaw the difficulties of his visitors, and refused all gifts but a little flour for the prosphora.",
 "He suffered from cancer in his last years and bore it without painkillers, as he had borne every cross. He was taken from Panagouda to the women's monastery of St. John the Theologian at Souroti, near Thessaloniki, which had grown up under his guidance, and there he reposed on the twelfth of July, 1994. His grave at Souroti has been since that day a place of unbroken pilgrimage. The Ecumenical Patriarchate canonized him on the thirteenth of January, 2015, naming his feast on the day of his repose.",
 ],
 quotes: [
 {
 text: "Prayer must come from the heart, with pain. When one prays for another with pain, that prayer is heard.",
 source: "Spiritual Counsels, on pain of heart",
 href: "/saints/paisios-the-athonite/spiritual-counsels",
 },
 {
 text: "When you have done what you can, leave the rest to God. He does what we cannot do, but He will not do what we can.",
 source: "Spiritual Counsels, on trust in God",
 href: "/saints/paisios-the-athonite/spiritual-counsels",
 },
 {
 text: "Do not be afraid. Whatever comes, God permits it for our good. Only let us keep our soul close to Him.",
 source: "Spiritual Counsels, on the times",
 href: "/saints/paisios-the-athonite/spiritual-counsels",
 },
 {
 text: "If you love Christ, you will not be able to keep silent for joy.",
 source: "Epistles, on joy in the cell",
 href: "/saints/paisios-the-athonite/epistles",
 },
 ],
 works: [
 {
 slug: "spiritual-counsels",
 title: "Spiritual Counsels",
 subtitle: "Selected sayings",
 year: "Recorded 1968-1994",
 blurb:
 "Brief sayings of the Elder of Panagouda on prayer with pain, trust in God's providence, love of neighbor, humility, and the spirit of our own age, gathered from the oral tradition of his pilgrims.",
 topics: ["Prayer", "Humility", "Trust", "Love", "Watchfulness"],
 },
 {
 slug: "epistles",
 title: "Epistles",
 subtitle: "Selected letters of spiritual counsel",
 year: "c. 1965-1994",
 blurb:
 "Letters to the nuns of Souroti and to spiritual children in the world, on perseverance in the struggle, prayer for those who have strayed, and the joy that is the perfume of the Holy Spirit.",
 topics: ["Repentance", "Perseverance", "Family", "Joy", "Holy Spirit"],
 },
 ],
 },
 {
 slug: "apostle-peter",
 byname: "Chief of the Apostles",
 iconUrl: "/saints/icons/apostle-peter.jpg",
 name: "Holy Apostle Peter",
 epithet: "Chief of the Apostles · The Rock",
 born: "c. AD 1 (Bethsaida of Galilee)",
 reposed: "c. AD 67 (Rome)",
 feastDays: ["June 29", "June 30", "January 16"],
 see: "Antioch, then Rome",
 shortBio:
 "The Galilean fisherman whom Christ called from his nets to be a fisher of men, whose confession at Caesarea Philippi the Church names the rock of her faith, and who, after a night of denial and a morning of restoration, fed the sheep of the Lord until he was crucified head-downward in Rome.",
 life: [
 "Simon was the son of Jonas, a fisherman of Bethsaida on the Sea of Galilee, and brother of the Apostle Andrew. He was already married and settled in Capernaum when his brother brought him to Jesus with the words, 'We have found the Messias.' At their meeting the Lord looked upon him and said, 'Thou art Simon the son of Jonas: thou shalt be called Cephas,' the Aramaic word the Greek Gospel renders Peter, that is, a stone.",
 "He left his nets at a word and followed. He was at the wedding of Cana, the calming of the storm, the raising of Jairus's daughter, the Transfiguration on Tabor, and the agony in Gethsemane. He was the first of the Twelve to confess, when the Lord asked the question at Caesarea Philippi, 'Thou art the Christ, the Son of the living God,' and heard in answer the words on which the Church has never ceased to reflect: 'Upon this rock I will build my church, and the gates of hell shall not prevail against it.'",
 "He was also the disciple who, on the night the Lord was taken, denied Him three times in the high priest's courtyard, and who at the cock-crow went out and wept bitterly. After the Resurrection the Lord sought him out by the Sea of Tiberias, and over a breakfast of bread and fish gave him a threefold commission to balance the threefold fall: 'Lovest thou me? Feed my sheep.' From that morning his ministry was a tending of the flock.",
 "At Pentecost he was the first to speak to the gathered crowd, and three thousand were baptized at his preaching. He healed the lame man at the Beautiful Gate, raised Tabitha at Joppa, received in a vision at the house of Simon the tanner the command to take the Gospel to the Gentiles, and baptized the centurion Cornelius and his household, opening the door of the Church to the nations.",
 "Tradition holds that he served as the first bishop of Antioch before going to Rome, where he labored in the last years of his life. There, in the persecution under Nero around the year 67, he was crucified; and the tradition relates that, counting himself unworthy to suffer in the manner of his Master, he asked to be hanged head-downward. He was buried on the Vatican hill, and the Church keeps his feast together with the Apostle Paul on the twenty-ninth of June, and the feast of his Chains on the sixteenth of January.",
 ],
 quotes: [
 {
 text: "Thou art the Christ, the Son of the living God.",
 source: "His confession at Caesarea Philippi (Matthew 16:16)",
 },
 {
 text: "Lord, to whom shall we go? thou hast the words of eternal life.",
 source: "John 6:68",
 },
 {
 text: "Casting all your care upon him; for he careth for you.",
 source: "1 Peter 5:7 (KJV)",
 href: "/saints/apostle-peter/the-two-epistles",
 },
 {
 text: "Whom having not seen, ye love; in whom, though now ye see him not, yet believing, ye rejoice with joy unspeakable and full of glory.",
 source: "1 Peter 1:8 (KJV)",
 href: "/saints/apostle-peter/the-two-epistles",
 },
 {
 text: "But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ.",
 source: "2 Peter 3:18 (KJV)",
 href: "/saints/apostle-peter/the-two-epistles",
 },
 ],
 works: [
 {
 slug: "the-two-epistles",
 title: "Selected Passages from the Two Epistles",
 subtitle: "From the First and Second Epistles General of Peter",
 year: "c. 62-67",
 blurb:
 "Five passages from Peter's two catholic epistles, on the living hope born from the Resurrection, the royal priesthood of the Church, the duty of shepherds, the casting of every care on God, and the call to grow in grace.",
 topics: ["Hope", "Church", "Priesthood", "Humility", "Suffering", "Scripture"],
 },
 ],
 },
 {
 slug: "apostle-matthew",
 byname: "The Evangelist",
 name: "Holy Apostle and Evangelist Matthew",
 epithet: "Evangelist · Levi the Publican",
 born: "1st century (Galilee)",
 reposed: "1st century (tradition: Ethiopia)",
 feastDays: ["November 16", "June 30"],
 see: "Apostle at large; tradition sends him to Ethiopia and the East",
 shortBio:
 "The customs officer of Capernaum who left his ledger at a word of the Lord and afterwards wrote the first of the four Gospels, the Gospel of the Kingdom for the Hebrews.",
 life: [
 "Matthew, also called Levi the son of Alphaeus, was a Jew of Galilee who held the customs post at Capernaum, gathering tolls on the trade road that ran from Damascus down to the Mediterranean. To his own people his trade made him an outcast, lumped together with sinners; to the Romans he was a useful man.",
 "He was sitting at the receipt of custom when the Lord passed by and called him with a single word. The other evangelists who tell the story call him Levi at the booth and Matthew among the Twelve; he himself, in his own Gospel, gives only the name by which the disciples afterwards knew him, and adds without comment the dinner he gave at his house that night for his old colleagues, the publicans and sinners.",
 "He travelled with the Twelve through the rest of the Lord's ministry, was numbered with them in the Acts after the Resurrection, and was present in the upper room at Pentecost. Tradition holds that he then preached among the Hebrews in Judaea for some years, during which he wrote his Gospel in their tongue, ordered around the great discourses of the Lord and arranged to show how every fulfilment had been foretold by the prophets.",
 "Later traditions take him to Ethiopia or to Parthia, where he is said to have died a martyr's death. The relics venerated as his now lie at Salerno in southern Italy. The Church keeps him among the four evangelists, signified in the iconography by a man (or an angel), the symbol assigned him from the opening of his Gospel with the human genealogy of Christ.",
 ],
 quotes: [
 {
 text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
 source: "Matthew 5:3 (KJV)",
 href: "/saints/apostle-matthew/selected-passages",
 },
 {
 text: "I will have mercy, and not sacrifice: for I am not come to call the righteous, but sinners to repentance.",
 source: "Matthew 9:13 (KJV)",
 href: "/saints/apostle-matthew/selected-passages",
 },
 {
 text: "Lo, I am with you alway, even unto the end of the world.",
 source: "Matthew 28:20 (KJV)",
 href: "/saints/apostle-matthew/selected-passages",
 },
 ],
 works: [
 {
 slug: "selected-passages",
 title: "Selected Passages from the Gospel",
 subtitle: "From the Gospel according to St. Matthew",
 year: "c. 50-65",
 blurb:
 "Three scenes from the Gospel he wrote: his own call at the tax booth, the opening of the Sermon on the Mount, and the Great Commission with which his Gospel closes.",
 topics: ["Gospel", "Repentance", "Kingdom", "Beatitudes", "Mission", "Scripture"],
 },
 ],
 },
 {
 slug: "apostle-john",
 byname: "The Theologian",
 name: "Holy Apostle and Evangelist John",
 epithet: "The Theologian · The Beloved Disciple",
 born: "1st century (Bethsaida of Galilee)",
 reposed: "c. AD 100 (Ephesus)",
 feastDays: ["May 8", "September 26"],
 see: "Ephesus",
 shortBio:
 "The fisherman of Galilee whom the Lord loved, who reclined on his breast at the Mystical Supper and stood beneath his Cross, and who afterwards wrote the Fourth Gospel, the three catholic epistles, and the Apocalypse, the only apostle to die in peace, having lived to a very great age at Ephesus.",
 life: [
 "John was the son of Zebedee, a fisherman of Bethsaida, and of Salome, who according to tradition was a daughter of Joseph the Betrothed and therefore a kinswoman of the Lord. He and his elder brother James were partners with Simon Peter in the fishing trade on the Sea of Galilee, and were called by the Lord from their nets on the same day Peter was called.",
 "From the first he was reckoned among the Lord's closest disciples. With Peter and James he alone was admitted to the raising of Jairus's daughter, to the Transfiguration on Tabor, and to the agony in Gethsemane. He calls himself in his own Gospel only 'the disciple whom Jesus loved,' and that disciple reclined on the Lord's breast at the Mystical Supper.",
 "He was the only one of the Twelve who did not flee on the night the Lord was taken. He followed to the courtyard of the high priest, and stood at the foot of the Cross, and there received from the dying Lord the charge of his Mother: 'Behold thy mother.' He took her into his own house, and cared for her until her Dormition.",
 "He was among the first at the empty tomb on the morning of the Resurrection, saw the linen clothes lying, and believed. After Pentecost he laboured with Peter at Jerusalem and was reckoned one of the pillars of the Church there.",
 "Tradition relates that after the Dormition of the Theotokos he settled at Ephesus, the great Christian metropolis of Asia, and was the spiritual father of all the churches of Asia Minor. Exiled by the emperor Domitian to the island of Patmos, he received there the visions that became the Book of Revelation. Returning to Ephesus under Nerva, he wrote in his very old age the Fourth Gospel, that the Church might know in his words who the Word had been from before the world. He wrote also the three catholic epistles, the last of them perhaps the briefest writing in the New Testament.",
 "He lived to a very great age, the tradition says past a hundred, and was the only one of the Twelve to die in peace. The Fathers add that he laid himself down in a grave he had himself prepared at Ephesus, and when his disciples opened it the next day his body was no longer there. The Church keeps the memory of his Dormition on the twenty-sixth of September and a feast of him with the rest of the Twelve on the thirtieth of June; on the eighth of May, the tradition relates, a fragrant dust rose from his grave and brought healing to all who took it, and that miracle is kept as its own feast.",
 ],
 quotes: [
 {
 text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
 source: "John 1:1 (KJV)",
 href: "/saints/apostle-john/selected-passages",
 },
 {
 text: "And the Word was made flesh, and dwelt among us.",
 source: "John 1:14 (KJV)",
 href: "/saints/apostle-john/selected-passages",
 },
 {
 text: "A new commandment I give unto you, That ye love one another; as I have loved you.",
 source: "John 13:34 (KJV)",
 href: "/saints/apostle-john/selected-passages",
 },
 {
 text: "Beloved, let us love one another: for love is of God.",
 source: "1 John 4:7 (KJV)",
 href: "/saints/apostle-john/selected-passages",
 },
 {
 text: "He that loveth not knoweth not God; for God is love.",
 source: "1 John 4:8 (KJV)",
 href: "/saints/apostle-john/selected-passages",
 },
 ],
 works: [
 {
 slug: "selected-passages",
 title: "Selected Passages from the Gospel and First Epistle",
 subtitle: "From the Theologian's Gospel and his catholic epistles",
 year: "c. 90-100",
 blurb:
 "Four passages from the Fourth Gospel and the First Epistle: the Prologue, the new commandment of love, the High-Priestly Prayer, and the great chapter that confesses God is love.",
 topics: ["Logos", "Incarnation", "Love", "Unity", "Trinity", "Scripture"],
 },
 ],
 },
 {
 slug: "apostle-thomas",
 byname: "Didymus, the Twin",
 name: "Holy Apostle Thomas",
 epithet: "Apostle to India · The Twin",
 born: "1st century (Galilee)",
 reposed: "1st century (tradition: Mylapore in India)",
 feastDays: ["October 6", "June 30", "Antipascha (Thomas Sunday)"],
 see: "Apostle at large; tradition sends him to Parthia and India",
 shortBio:
 "The apostle whose honest doubt at the Resurrection drew from the Risen Lord the offer of his wounds, and whose confession 'My Lord and my God' is the highest the Gospels record from any human mouth; tradition sends him to India, where he founded the Church of the Malabar coast.",
 life: [
 "Thomas was a Galilean Jew, called among the Twelve and given the Aramaic name Thomas, which means 'twin'; the Gospel of John, when he is mentioned, glosses the name into Greek as Didymus.",
 "He appears three times by name in the Fourth Gospel and each time speaks. He proposed to his fellow disciples, when the Lord turned back into Judaea to raise Lazarus, that they should go with him to die together; he asked at the Mystical Supper the question that drew from the Lord the saying 'I am the way, the truth, and the life'; and on the eighth day after the Resurrection he was given by the Lord the wounds of the hands and the side and answered with the confession the Church has not ceased to repeat: 'My Lord and my God.'",
 "Tradition relates that when the apostles cast lots after Pentecost to divide the world between them for preaching, India fell to Thomas. He went first to Parthia, then to the kingdom of Gondophares in north India, and afterwards down the Malabar coast in the south, where he founded seven churches that survive to this day as the ancient St. Thomas Christians of Kerala.",
 "He was martyred at Mylapore near the modern city of Chennai, run through with a spear, around the middle of the first century. The Church keeps his memory on the sixth of October, and on the Sunday after Pascha as Thomas Sunday or the Antipascha, the eighth day on which the Risen Lord returned to the upper room to meet him.",
 ],
 quotes: [
 {
 text: "Let us also go, that we may die with him.",
 source: "John 11:16 (KJV)",
 href: "/saints/apostle-thomas/the-confession",
 },
 {
 text: "Lord, we know not whither thou goest; and how can we know the way?",
 source: "John 14:5 (KJV)",
 href: "/saints/apostle-thomas/the-confession",
 },
 {
 text: "My Lord and my God.",
 source: "John 20:28 (KJV)",
 href: "/saints/apostle-thomas/the-confession",
 },
 ],
 works: [
 {
 slug: "the-confession",
 title: "The Confession of Thomas",
 subtitle: "Selected passages from the Gospel of John",
 year: "c. 90",
 blurb:
 "The three scenes in which Thomas speaks in the Fourth Gospel: his courage on the road to Bethany, his question at the Supper, and his confession of the Risen Lord on the eighth day.",
 topics: ["Resurrection", "Faith", "Doubt", "Christology", "Scripture"],
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
 // Use the last (rightmost) 3-4 digit number, that's the year in dates like "May 2, 373".
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
