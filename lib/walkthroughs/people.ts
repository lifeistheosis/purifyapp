// Who a walk's note introduces (1.8). The owner, 2026-10-17, on the Job walk:
// "make the footnotes like more in depth ... when it says who Job is, these
// are good, but then add like icon photos, and then add even more ... like
// who Job is to the Orthodox Church." So a note that introduces someone the
// Church honours carries, under its own words, that person's icon, their
// title and feast as the Church keeps them, and two or three plain sentences
// on what they are to the Church: why it reads them, and where they are in
// its services. A note that introduces a place says what it is, in a line.
//
// ONCE EACH, on the first note of the walk that names them (NOTE_PEOPLE), as
// a book explains a name where it first meets it. St. Gregory's is the first
// note that gives a line of his. Only the honoured: Job's wife, his three
// friends and Elius are introduced by their notes and are not commemorated by
// the Church, so they carry nothing more. A name that only labels a book or a
// verse of Scripture (the Law of Moses, the Servant of Isaiah, the Psalmist,
// the letter of St. James) introduces no one.
//
// THE WORDS are ours, in the reader's language (walk.person.* and walk.place.*
// in the catalogs, every language), written as close as we can to what the
// Church's calendar, its service books and its Scripture say. No quotation is
// in them, and every fact rests on text the app already carries (`facts`):
// the calendar (data/calendar), the saints' pages (lib/saints/saints.ts), the
// day's readings as the OCA publishes them, Brenton's Septuagint and the KJV,
// St. Gregory's Morals, the prayers. They wait for a future clergy review
// (WALK_PEOPLE_REVIEW): no priest reviews Purify yet (the owner, 2026-10-16),
// so nothing waits on one. lib/walkthroughs/__tests__/people.test.ts holds
// every fact to the text it names.
//
// THE PICTURES are icons the app already shows, never a new download: Job's is
// his book's read-aloud cover (lib/readAloud/covers.ts, FIGURES), the saints'
// are their books' covers (lib/reading/coverArt.ts, COVER_ART), so a person
// wears one picture everywhere. Their sources and licences are recorded there
// (docs/licensing/READ_COVERS.md, COVER_ICONS.md and SAINT_HEROES.md). They
// live on the website and the apps ask for them (lib/media/streamed.ts); with
// no signal the note shows the name without the picture. `crop` is the square
// the sheet shows, in the picture's own pixels: the whole face, inside any
// light edge. Each was cut this way, opened and read by
// scripts/check-picture-edges.mjs on 2026-10-18.

/** The people a walk introduces, each honoured by the Church. */
export type WalkPersonId = "job" | "gregory" | "paul" | "ephraim" | "theotokos" | "basil" | "chrysostom";

/** The places a walk's note introduces. */
export type WalkPlaceId = "ausis";

/** Where a fact is written in what the app carries. The test reads each one. */
export type Evidence =
  /** data/calendar/daily-saints.json: the day carries a commemoration of this name (and note). */
  | { kind: "calendar"; day: string; name: string; note?: string }
  /** A saint's page (lib/saints/saints.ts): its epithet, short life or life says this. */
  | { kind: "profile"; slug: string; says: string }
  /** The saint's first feast day on that page. */
  | { kind: "profileFeast"; slug: string }
  /** data/bible/<book>/<chapter>.json: the verse says this. */
  | { kind: "scripture"; book: string; chapter: number; verse: number; says: string }
  /** data/bible/commentary/<book>/<chapter>.json: the entry under the verse says this. */
  | { kind: "father"; book: string; chapter: number; verse: number; index: number; says: string }
  /** data/calendar/official-readings.json: the day appoints this reading, so labelled. */
  | { kind: "reading"; date: string; reading: string; label: string }
  /** A file of the app's own says this. */
  | { kind: "file"; path: string; says: string }
  /** In the same readings, the share of days whose Epistle is from St. Paul's letters. */
  | { kind: "epistles"; atLeast: number };

/** One fact our lines state, and where it is written. */
export type Fact = { claim: string; from: Evidence[] };

/** A picture the app already shows, and the square of it the note shows. */
export type Portrait = {
  file: string;
  width: number;
  height: number;
  crop: { left: number; top: number; size: number };
  /** Where the picture and its rights are registered. */
  registry: { kind: "readAloud"; figure: "job" } | { kind: "coverArt"; slug: string };
};

export type WalkPerson = {
  id: WalkPersonId;
  /** Their title as the Church keeps it, in the reader's language. */
  nameKey: string;
  /** Two or three sentences on what they are to the Church. */
  churchKey: string;
  /** Their feast as the calendar writes it ("May 6"), in the reader's language on screen. */
  feast: string;
  feastFrom: Evidence[];
  portrait: Portrait;
  /** How a note names them: the note that introduces them is the first to. */
  names: string[];
  facts: Fact[];
};

export type WalkPlace = {
  id: WalkPlaceId;
  nameKey: string;
  lineKey: string;
  /** How a note names it. */
  names: string[];
  facts: Fact[];
};

/** Our words here, waiting for a future clergy review. */
export const WALK_PEOPLE_REVIEW = {
  status: "awaiting-clergy-review",
  since: "2026-10-18",
  ours: [
    "who is introduced, and on which note",
    "each title as the Church keeps it, in every language",
    "each person's lines on what they are to the Church",
    "the line on the land of Ausis",
  ],
} as const;

/**
 * Holy Monday to Holy Friday of 2027 (Pascha is May 2), the one Holy Week in
 * the OCA's table the app carries (data/calendar/official-readings.json). The
 * test works the days out from Pascha again.
 */
const HOLY_WEEK_2027 ={ monday: "2027-04-26", tuesday: "2027-04-27", wednesday: "2027-04-28", thursday: "2027-04-29", friday: "2027-04-30" } as const;

const job = (chapter: number, verse: number, says: string): Evidence => ({ kind: "scripture", book: "job", chapter, verse, says });
const morals = (chapter: number, verse: number, index: number, says: string): Evidence => ({ kind: "father", book: "job", chapter, verse, index, says });
const profile = (slug: string, says: string): Evidence => ({ kind: "profile", slug, says });

export const WALK_PEOPLE: Readonly<Record<WalkPersonId, WalkPerson>> = {
  job: {
    id: "job",
    nameKey: "walk.person.job.name",
    churchKey: "walk.person.job.church",
    feast: "May 6",
    feastFrom: [{ kind: "calendar", day: "05-06", name: "Righteous Job the Long-Suffering" }],
    portrait: {
      file: "/covers/job.v1.jpg",
      width: 1024,
      height: 1024,
      crop: { left: 225, top: 123, size: 758 },
      registry: { kind: "readAloud", figure: "job" },
    },
    names: ["Job"],
    facts: [
      {
        claim: "St. James points to his patience",
        from: [{ kind: "scripture", book: "james", chapter: 5, verse: 11, says: "Ye have heard of the patience of Job" }],
      },
      {
        claim: "Ezekiel names him with Noah and Daniel among the righteous",
        from: [
          {
            kind: "scripture",
            book: "ezekiel",
            chapter: 14,
            verse: 14,
            says: "Noe, and Daniel, and Job, they alone should be delivered by their righteousness",
          },
        ],
      },
      {
        claim: "In Holy Week his book is read at Vespers each day from Monday to Friday",
        from: [
          { kind: "reading", date: HOLY_WEEK_2027.monday, reading: "Job 1:1-12", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.tuesday, reading: "Job 1:13-22", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.wednesday, reading: "Job 2:1-10", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.thursday, reading: "Job 38:1-23; 42:1-5", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.friday, reading: "Job 42:12-17 LXX", label: "Vespers, 5th reading" },
        ],
      },
      {
        claim: "on Holy Friday its last verses promise that he will rise again",
        from: [job(42, 17, "it is written that he will rise again with those whom the Lord raises up")],
      },
      {
        claim: "St. Gregory sees in his sufferings the likeness of Christ in His Passion",
        from: [morals(2, 3, 0, "If blessed Job bears the likeness of our Redeemer in His Passion")],
      },
    ],
  },

  gregory: {
    id: "gregory",
    nameKey: "walk.person.gregory.name",
    churchKey: "walk.person.gregory.church",
    feast: "March 12",
    feastFrom: [{ kind: "profileFeast", slug: "gregory-the-dialogist" }],
    portrait: {
      file: "/covers/authors/gregory-the-dialogist.v1.jpg",
      width: 600,
      height: 750,
      crop: { left: 72, top: 0, size: 420 },
      registry: { kind: "coverArt", slug: "gregory-the-dialogist" },
    },
    names: ["Gregory"],
    facts: [
      {
        claim: "The West calls him Gregory the Great; the Orthodox Church honours him as the Dialogist, for his Dialogues on the fathers of Italy",
        from: [
          profile("gregory-the-dialogist", "The East calls him the Dialogist, for his Dialogues on the Italian Fathers"),
          profile("gregory-the-dialogist", "The Orthodox Church honors him as Gregory the Dialogist"),
        ],
      },
      {
        claim: "The Church ascribes to him the Liturgy of the Presanctified Gifts, served in Great Lent",
        from: [profile("gregory-the-dialogist", "ascribes to him the Liturgy of the Presanctified Gifts served in Great Lent")],
      },
      {
        claim: "and on the first three days of Holy Week, when Job is read at its Vespers",
        from: [
          { kind: "reading", date: HOLY_WEEK_2027.monday, reading: "Matthew 24:3-35", label: "Gospel, Presanctified" },
          { kind: "reading", date: HOLY_WEEK_2027.monday, reading: "Job 1:1-12", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.tuesday, reading: "Matthew 24:36-26:2", label: "Gospel, Presanctified" },
          { kind: "reading", date: HOLY_WEEK_2027.tuesday, reading: "Job 1:13-22", label: "Vespers, 2nd reading" },
          { kind: "reading", date: HOLY_WEEK_2027.wednesday, reading: "Matthew 26:6-16", label: "Gospel, Presanctified" },
          { kind: "reading", date: HOLY_WEEK_2027.wednesday, reading: "Job 2:1-10", label: "Vespers, 2nd reading" },
        ],
      },
      {
        claim: "His Morals, quoted in this walk, read Job as history, as Christ and His Church, and as counsel for the soul",
        from: [
          profile("gregory-the-dialogist", "reading Job historically, allegorically and morally"),
          morals(1, 5, 1, "both Christ and His Church, were represented by him"),
        ],
      },
    ],
  },

  paul: {
    id: "paul",
    nameKey: "walk.person.paul.name",
    churchKey: "walk.person.paul.church",
    feast: "June 29",
    feastFrom: [
      { kind: "profileFeast", slug: "apostle-paul" },
      { kind: "calendar", day: "06-29", name: "Holy Glorious and All-Praised Leaders of the Apostles Peter and Paul" },
    ],
    portrait: {
      file: "/covers/authors/apostle-paul.v1.jpg",
      width: 600,
      height: 750,
      crop: { left: 18, top: 0, size: 312 },
      registry: { kind: "coverArt", slug: "apostle-paul" },
    },
    names: ["St. Paul"],
    facts: [
      {
        claim: "The Church keeps him with St. Peter as the leaders of the Apostles",
        from: [{ kind: "calendar", day: "06-29", name: "Holy Glorious and All-Praised Leaders of the Apostles Peter and Paul" }],
      },
      { claim: "and calls him the Apostle to the Nations", from: [profile("apostle-paul", "Apostle to the Nations")] },
      {
        claim: "His letters run from Romans to Hebrews",
        from: [profile("apostle-paul", "Romans, the two letters to Corinth"), profile("apostle-paul", "the long sermon to the Hebrews")],
      },
      {
        claim: "on most days of the year the reading from the Apostle at the Divine Liturgy is taken from one of them",
        from: [{ kind: "epistles", atLeast: 0.75 }],
      },
    ],
  },

  ephraim: {
    id: "ephraim",
    nameKey: "walk.person.ephraim.name",
    churchKey: "walk.person.ephraim.church",
    feast: "January 28",
    feastFrom: [
      { kind: "profileFeast", slug: "ephraim-the-syrian" },
      { kind: "calendar", day: "01-28", name: "St. Ephraim the Syrian" },
    ],
    portrait: {
      file: "/covers/authors/ephraim-the-syrian.v1.jpg",
      width: 480,
      height: 600,
      crop: { left: 112, top: 8, size: 300 },
      registry: { kind: "coverArt", slug: "ephraim-the-syrian" },
    },
    names: ["St. Ephraim"],
    facts: [
      {
        claim: "A deacon of Edessa in the fourth century",
        from: [
          profile("ephraim-the-syrian", "serving as a deacon in the local church"),
          profile("ephraim-the-syrian", "He reposed at Edessa on June 9, 373"),
        ],
      },
      { claim: "he wrote nearly everything in verse", from: [profile("ephraim-the-syrian", "He wrote almost everything in verse")] },
      {
        claim: "the Church honours him as the Harp of the Spirit",
        from: [profile("ephraim-the-syrian", "He is honoured as 'the Harp of the Spirit'")],
      },
      {
        claim: "The prayer that bears his name is prayed throughout Great Lent at the weekday services, with a prostration after each of its three petitions",
        from: [
          { kind: "file", path: "data/prayers/rules/lent-ephrem.json", says: "Prayed throughout Great Lent at the weekday services" },
          { kind: "file", path: "data/prayers/rules/lent-ephrem.json", says: "Make a prostration after each of the three petitions" },
        ],
      },
    ],
  },

  theotokos: {
    id: "theotokos",
    nameKey: "walk.person.theotokos.name",
    churchKey: "walk.person.theotokos.church",
    feast: "August 15",
    feastFrom: [
      { kind: "profileFeast", slug: "theotokos" },
      { kind: "calendar", day: "08-15", name: "Dormition of the Most Holy Theotokos" },
    ],
    portrait: {
      file: "/covers/authors/theotokos.v1.jpg",
      width: 600,
      height: 750,
      crop: { left: 120, top: 56, size: 390 },
      registry: { kind: "coverArt", slug: "theotokos" },
    },
    names: ["Mother of God"],
    facts: [
      {
        claim: "The Church honours her above every other creature, as the one who gave her own flesh to the Son of God",
        from: [profile("theotokos", "it honors her above every other creature, as the one who gave her own flesh to the eternal Son")],
      },
      {
        claim: "and in its daily prayers sings of her as more honourable than the Cherubim",
        from: [
          { kind: "file", path: "data/prayers/rules/morning.json", says: "More honorable than the Cherubim" },
          { kind: "file", path: "data/prayers/hours/compline.json", says: "More honorable than the Cherubim" },
        ],
      },
      {
        claim: "Her Nativity on September 8 is the first great feast of the Church's year, and her Dormition on August 15 the last",
        from: [
          profile("theotokos", "Her birth is kept as the first of the year's great feasts, on the eighth of September"),
          profile("theotokos", "This is the Dormition, kept on the fifteenth of August after a fast, the last of the year's great feasts"),
        ],
      },
    ],
  },

  basil: {
    id: "basil",
    nameKey: "walk.person.basil.name",
    churchKey: "walk.person.basil.church",
    feast: "January 1",
    feastFrom: [
      { kind: "profileFeast", slug: "basil-the-great" },
      { kind: "calendar", day: "01-01", name: "St. Basil the Great" },
    ],
    portrait: {
      file: "/covers/authors/basil-the-great.v1.jpg",
      width: 600,
      height: 750,
      crop: { left: 312, top: 22, size: 270 },
      registry: { kind: "coverArt", slug: "basil-the-great" },
    },
    names: ["St. Basil"],
    facts: [
      {
        claim: "Archbishop of Caesarea in the fourth century",
        from: [
          { kind: "calendar", day: "01-01", name: "St. Basil the Great", note: "Archbishop of Caesarea" },
          profile("basil-the-great", "Made bishop of Caesarea in 370"),
        ],
      },
      {
        claim: "he sold his family's estates to build a hospital and an almshouse outside his city",
        from: [profile("basil-the-great", "He sold the family estates to build a hospital, almshouse, and school complex outside the walls")],
      },
      {
        claim: "The Divine Liturgy that bears his name is served on the Sundays of Great Lent and on his feast, among other days",
        from: [profile("basil-the-great", "The Divine Liturgy that bears his name is still served in Orthodox churches on the Sundays of Great Lent, on his own feast")],
      },
      {
        claim: "the Church keeps him with St. Gregory the Theologian and St. John Chrysostom as one of the Three Hierarchs",
        from: [
          { kind: "calendar", day: "01-30", name: "Synaxis of the Three Holy Hierarchs", note: "Basil the Great, Gregory the Theologian, John Chrysostom" },
        ],
      },
    ],
  },

  chrysostom: {
    id: "chrysostom",
    nameKey: "walk.person.chrysostom.name",
    churchKey: "walk.person.chrysostom.church",
    feast: "November 13",
    feastFrom: [
      { kind: "profileFeast", slug: "john-chrysostom" },
      { kind: "calendar", day: "11-13", name: "St. John Chrysostom, Archbishop of Constantinople" },
    ],
    portrait: {
      file: "/covers/authors/john-chrysostom.v1.jpg",
      width: 600,
      height: 750,
      crop: { left: 60, top: 24, size: 290 },
      registry: { kind: "coverArt", slug: "john-chrysostom" },
    },
    names: ["Chrysostom"],
    facts: [
      {
        claim: "The people named him Golden-Mouth for his preaching",
        from: [profile("john-chrysostom", "whom the people called Chrysostom, 'Golden-Mouth'")],
      },
      {
        claim: "and he died in exile in 407",
        from: [profile("john-chrysostom", "The second exile killed him. Sent on foot through the Armenian highlands in the winter of 407, he died at Comana")],
      },
      {
        claim: "The Divine Liturgy most often served in Orthodox churches bears his name",
        from: [profile("john-chrysostom", "the author of the Divine Liturgy most often served in Orthodox churches")],
      },
      {
        claim: "and his Paschal homily is read at the Paschal Vigil in every Orthodox church",
        from: [{ kind: "file", path: "data/saints/john-chrysostom/paschal-homily.json", says: "Read at the Paschal Vigil in every Orthodox church" }],
      },
    ],
  },
};

export const WALK_PLACES: Readonly<Record<WalkPlaceId, WalkPlace>> = {
  ausis: {
    id: "ausis",
    nameKey: "walk.place.ausis.name",
    lineKey: "walk.place.ausis.line",
    names: ["Ausis"],
    facts: [
      {
        claim: "The last verse of our Septuagint sets it on the borders of Idumea and Arabia",
        from: [job(42, 17, "living in the land of Ausis, on the borders of Idumea and Arabia")],
      },
      {
        claim: "and counts Job among the kings who reigned in Edom, as Jobab, the fifth from Abraham",
        from: [
          job(42, 17, "these were the kings who reigned in Edom"),
          job(42, 17, "Jobab, who is called Job"),
          job(42, 17, "so that he was the fifth from Abraam"),
        ],
      },
    ],
  },
};

/** The note that introduces each person: the first of the walk to name them. */
export const NOTE_PEOPLE: Readonly<Record<string, WalkPersonId>> = {
  "job-1-1": "job",
  "job-1-5": "gregory",
  "job-5-13": "paul",
  "job-20-29": "ephraim",
  "job-23-12": "theotokos",
  "job-31-17": "basil",
  "job-35-14": "chrysostom",
};

/** The note that introduces each place. */
export const NOTE_PLACES: Readonly<Record<string, WalkPlaceId>> = {
  "job-1-1": "ausis",
};

export function notePerson(cardId: string): WalkPerson | null {
  const id = NOTE_PEOPLE[cardId];
  return id ? WALK_PEOPLE[id] : null;
}

export function notePlace(cardId: string): WalkPlace | null {
  const id = NOTE_PLACES[cardId];
  return id ? WALK_PLACES[id] : null;
}

/**
 * Where the picture sits in its square box so that the box shows `crop`: its
 * size and offset as parts of the box, for an absolutely placed <img> in a box
 * that clips it. All four are percentages of the box's side.
 */
export function portraitPlacement(p: Portrait): { width: number; height: number; left: number; top: number } {
  const per = 100 / p.crop.size;
  return {
    width: p.width * per,
    height: p.height * per,
    left: -p.crop.left * per,
    top: -p.crop.top * per,
  };
}
