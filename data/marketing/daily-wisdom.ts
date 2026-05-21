// Daily Wisdom: two arrays rotated by day-of-year. Even days surface a
// Scripture verse; odd days surface a saying of one of the Fathers we
// already ship. All entries are public domain (KJV / Brenton LXX /
// Schaff Patristic series, 1885-1900).
//
// Keep arrays roughly equal length so neither cycles faster than the
// other. Add entries by appending to the end; do not reorder, or the
// day-of-year index will shift for everyone on the same date.

export type WisdomEntry = {
  text: string;
  cite: string;
  /** Optional href for the citation link. */
  href?: string;
};

export const VERSES: WisdomEntry[] = [
  {
    text: "The Lord is my shepherd; I shall not want.",
    cite: "Psalm 23:1",
    href: "/bible/psalms/23#v1",
  },
  {
    text: "Be still, and know that I am God.",
    cite: "Psalm 46:10",
    href: "/bible/psalms/46#v10",
  },
  {
    text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    cite: "John 1:1",
    href: "/bible/john/1#v1",
  },
  {
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    cite: "Matthew 11:28",
    href: "/bible/matthew/11#v28",
  },
  {
    text: "For God so loved the world, that he gave his only begotten Son.",
    cite: "John 3:16",
    href: "/bible/john/3#v16",
  },
  {
    text: "Blessed are the pure in heart: for they shall see God.",
    cite: "Matthew 5:8",
    href: "/bible/matthew/5#v8",
  },
  {
    text: "Out of the depths have I cried unto thee, O Lord.",
    cite: "Psalm 130:1",
    href: "/bible/psalms/130#v1",
  },
  {
    text: "I will lift up mine eyes unto the hills, from whence cometh my help.",
    cite: "Psalm 121:1",
    href: "/bible/psalms/121#v1",
  },
  {
    text: "The Lord is good to those who trust in him.",
    cite: "Nahum 1:7",
    href: "/bible/nahum/1#v7",
  },
  {
    text: "Create in me a clean heart, O God; and renew a right spirit within me.",
    cite: "Psalm 51:10",
    href: "/bible/psalms/51#v10",
  },
  {
    text: "Charity suffereth long, and is kind; charity envieth not.",
    cite: "1 Corinthians 13:4",
    href: "/bible/1-corinthians/13#v4",
  },
  {
    text: "Be of good cheer; I have overcome the world.",
    cite: "John 16:33",
    href: "/bible/john/16#v33",
  },
  {
    text: "Pray without ceasing.",
    cite: "1 Thessalonians 5:17",
    href: "/bible/1-thessalonians/5#v17",
  },
  {
    text: "Behold, the Lamb of God, which taketh away the sin of the world.",
    cite: "John 1:29",
    href: "/bible/john/1#v29",
  },
  {
    text: "Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O Lord.",
    cite: "Psalm 19:14",
    href: "/bible/psalms/19#v14",
  },
  {
    text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.",
    cite: "Proverbs 3:5",
    href: "/bible/proverbs/3#v5",
  },
  {
    text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
    cite: "Hebrews 11:1",
    href: "/bible/hebrews/11#v1",
  },
  {
    text: "Greater love hath no man than this, that a man lay down his life for his friends.",
    cite: "John 15:13",
    href: "/bible/john/15#v13",
  },
  {
    text: "Behold, I stand at the door, and knock.",
    cite: "Revelation 3:20",
    href: "/bible/revelation/3#v20",
  },
  {
    text: "The eternal God is thy refuge, and underneath are the everlasting arms.",
    cite: "Deuteronomy 33:27",
    href: "/bible/deuteronomy/33#v27",
  },
  {
    text: "Mine eyes are ever toward the Lord; for he shall pluck my feet out of the net.",
    cite: "Psalm 25:15",
    href: "/bible/psalms/25#v15",
  },
  {
    text: "The fear of the Lord is the beginning of wisdom.",
    cite: "Proverbs 9:10",
    href: "/bible/proverbs/9#v10",
  },
  {
    text: "My grace is sufficient for thee: for my strength is made perfect in weakness.",
    cite: "2 Corinthians 12:9",
    href: "/bible/2-corinthians/12#v9",
  },
  {
    text: "Whither shall I go from thy spirit? or whither shall I flee from thy presence?",
    cite: "Psalm 139:7",
    href: "/bible/psalms/139#v7",
  },
  {
    text: "I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.",
    cite: "John 11:25",
    href: "/bible/john/11#v25",
  },
  {
    text: "Behold, how good and how pleasant it is for brethren to dwell together in unity!",
    cite: "Psalm 133:1",
    href: "/bible/psalms/133#v1",
  },
  {
    text: "Ye are the light of the world. A city that is set on an hill cannot be hid.",
    cite: "Matthew 5:14",
    href: "/bible/matthew/5#v14",
  },
  {
    text: "Cast thy burden upon the Lord, and he shall sustain thee.",
    cite: "Psalm 55:22",
    href: "/bible/psalms/55#v22",
  },
  {
    text: "Verily, verily, I say unto you, Except a corn of wheat fall into the ground and die, it abideth alone.",
    cite: "John 12:24",
    href: "/bible/john/12#v24",
  },
  {
    text: "Take up thy cross, and follow me.",
    cite: "Mark 10:21",
    href: "/bible/mark/10#v21",
  },
];

export const SAYINGS: WisdomEntry[] = [
  {
    text: "He became man that we might become god.",
    cite: "St. Athanasius the Great",
    href: "/saints/athanasius-the-great",
  },
  {
    text: "Whether you eat or drink, or do anything, do all to the glory of God.",
    cite: "St. John Chrysostom",
    href: "/saints/john-chrysostom",
  },
  {
    text: "Let no one fear death, for the death of the Savior has set us free.",
    cite: "St. John Chrysostom, The Paschal Homily",
    href: "/saints/john-chrysostom/paschal-homily",
  },
  {
    text: "Nothing is more frigid than a Christian, who cares not for the salvation of others.",
    cite: "St. John Chrysostom, Homilies on Acts",
    href: "/saints/john-chrysostom/homilies-on-acts",
  },
  {
    text: "Thou hast made us for Thyself, O Lord, and our heart is restless until it repose in Thee.",
    cite: "St. Augustine of Hippo",
    href: "/saints/augustine-of-hippo",
  },
  {
    text: "Acquire the spirit of peace, and a thousand souls around you will be saved.",
    cite: "St. Seraphim of Sarov",
    href: "/saints/seraphim-of-sarov",
  },
  {
    text: "If you are a theologian, you will pray truly. And if you pray truly, you are a theologian.",
    cite: "Evagrius Ponticus",
  },
  {
    text: "Stand on guard over your heart, and the rest will guard itself.",
    cite: "St. Symeon the New Theologian",
    href: "/saints/symeon-the-new-theologian",
  },
  {
    text: "The glory of God is a man fully alive.",
    cite: "St. Irenaeus of Lyons",
    href: "/saints/irenaeus-of-lyons",
  },
  {
    text: "Better is one earnest petition from the heart than ten thousand idle words.",
    cite: "St. John Chrysostom",
    href: "/saints/john-chrysostom",
  },
  {
    text: "Love is the firstborn of all the virtues, and the queen of them all.",
    cite: "St. Maximus the Confessor",
    href: "/saints/maximus-the-confessor",
  },
  {
    text: "The Spirit who proceeds from the Father is the same Spirit who illuminates the heart in prayer.",
    cite: "St. Basil the Great",
    href: "/saints/basil-the-great",
  },
  {
    text: "What is not assumed is not healed. He took the whole of our humanity that the whole might be saved.",
    cite: "St. Gregory the Theologian",
    href: "/saints/gregory-theologian",
  },
  {
    text: "Where God wills, the order of nature is overcome.",
    cite: "St. John of Damascus",
    href: "/saints/john-of-damascus",
  },
  {
    text: "The Eucharist is medicine of immortality, and the antidote to prevent us from dying.",
    cite: "St. Ignatius of Antioch",
    href: "/saints/ignatius-of-antioch",
  },
  {
    text: "He who has not yet found God in his own heart will not find Him in the four corners of the universe.",
    cite: "St. Symeon the New Theologian",
    href: "/saints/symeon-the-new-theologian",
  },
  {
    text: "Christ the Lord is the great physician of our souls.",
    cite: "St. Cyril of Alexandria",
    href: "/saints/cyril-of-alexandria",
  },
  {
    text: "Late have I loved you, Beauty so ancient and so new.",
    cite: "St. Augustine of Hippo",
    href: "/saints/augustine-of-hippo",
  },
  {
    text: "Without the Cross there is no resurrection.",
    cite: "St. Maximus the Confessor",
    href: "/saints/maximus-the-confessor",
  },
  {
    text: "Prayer is the lifting of the mind and heart to God.",
    cite: "St. John of Damascus",
    href: "/saints/john-of-damascus",
  },
  {
    text: "If we do not now bear the cross of Christ, we shall not share His resurrection.",
    cite: "St. John Chrysostom",
    href: "/saints/john-chrysostom",
  },
  {
    text: "The soul that knows the love of God knows no enemy in this world.",
    cite: "Sayings of the Desert Fathers",
  },
  {
    text: "Joy is the sign of the presence of God in the soul.",
    cite: "St. Seraphim of Sarov",
    href: "/saints/seraphim-of-sarov",
  },
  {
    text: "What we know about ourselves is little; what we do not know is great.",
    cite: "St. Basil the Great",
    href: "/saints/basil-the-great",
  },
  {
    text: "Give blood, and you will receive the Spirit.",
    cite: "Sayings of the Desert Fathers",
  },
  {
    text: "The deeper a person descends into humility, the higher he rises to God.",
    cite: "St. John Climacus",
  },
  {
    text: "The light that shines in the heart of the praying man is the same light that shone on Tabor.",
    cite: "St. Gregory Palamas",
  },
  {
    text: "When you stand to pray, forgive everyone everything.",
    cite: "Mark 11:25 / The Desert Fathers",
  },
  {
    text: "Two things only let your sons inherit from you: love of God and the holy faith.",
    cite: "St. Anthony the Great",
  },
  {
    text: "A heart hardened against another is hardened against God.",
    cite: "St. Maximus the Confessor",
    href: "/saints/maximus-the-confessor",
  },
  {
    text: "Repentance is the renewal of baptism.",
    cite: "St. John Climacus",
  },
  {
    text: "Let your prayer be entirely simple, for both the publican and the prodigal son were reconciled to God by a single phrase.",
    cite: "St. John Climacus",
  },
  {
    text: "Virtue is not far from us, nor is it without us, but it is within us, and is easy if only we are willing.",
    cite: "St. Athanasius the Great, Life of Antony",
    href: "/saints/athanasius-the-great/life-of-antony",
  },
  {
    text: "He ever was and is and never was not; for the Father being everlasting, His Word and His Wisdom must be everlasting.",
    cite: "St. Athanasius the Great, Against the Arians",
    href: "/saints/athanasius-the-great/four-discourses-against-the-arians",
  },
  {
    text: "In the beginning wickedness did not exist, nor does it belong in any way to our nature.",
    cite: "St. Athanasius the Great, Against the Heathen",
    href: "/saints/athanasius-the-great/against-the-heathen",
  },
];
