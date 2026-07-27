// Apologetics, the reasoned defense of the faith. A companion to /theology
// (which argues within the faith, from the Fathers) aimed outward: at the
// questions an enquirer or an objector brings. Each entry is an in-house
// framing essay in the Orthodox register, with Scripture and, as the
// editorial team assembles them, a verbatim patristic florilegium.
//
// Pure data + pure helpers, no fs, no "use client". The body is read at
// request time from data/apologetics/<slug>.json.

export type ApologeticsGroup = "existence" | "authority";

export type ApologeticsTopicMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  group: ApologeticsGroup;
  /** Short blurb shown in the hub index. */
  summary: string;
  /** Coming but not yet seeded. Surfaces honestly. */
  planned?: boolean;
  estimatedMinutes?: number;
};

export const APOLOGETICS_GROUP_ORDER: ApologeticsGroup[] = [
  "existence",
  "authority",
];

export const APOLOGETICS_GROUP_LABEL: Record<
  ApologeticsGroup,
  { en: string; subtitle: string }
> = {
  existence: {
    en: "That God is",
    subtitle:
      "The reasoned ground for belief in God against the denials of the age.",
  },
  authority: {
    en: "Scripture, Tradition, and the Church",
    subtitle:
      "Where the Christian faith is kept, and by what authority it is known.",
  },
};

export const APOLOGETICS_TOPICS: ApologeticsTopicMeta[] = [
  {
    slug: "atheism",
    title: "On atheism",
    subtitle: "The fool hath said in his heart, There is no God.",
    group: "existence",
    summary:
      "The classical and contemporary denial of God, and the Orthodox answer: that the order, intelligibility, and contingency of the world, and the moral and personal depths of man, point beyond themselves to their uncreated Cause, whom the Church knows not as a conclusion of argument only but as the living God.",
    estimatedMinutes: 16,
  },
  {
    slug: "deism",
    title: "On deism",
    subtitle: "A maker who withdrew, against the God who draws near.",
    group: "existence",
    summary:
      "Deism grants a first cause but denies His providence and His coming among us. The Orthodox answer holds that the God who made all things upholds them still, is present to His creation by His energies, and has entered it in the Incarnation, so that He is not the absent watchmaker but the God who is with us.",
    estimatedMinutes: 11,
  },
  {
    slug: "sola-scriptura",
    title: "On sola scriptura",
    subtitle: "The Scriptures are the Church's, read within her life.",
    group: "authority",
    summary:
      "The claim that Scripture alone, apart from the Tradition and the Church, is the rule of faith is answered from Scripture itself, from history, and from the Fathers: the Church received, discerned, and canonized the Scriptures, and the same apostolic Tradition that gave us the Bible interprets it. The Bible is the Church's book, not a book above her.",
    estimatedMinutes: 14,
  },
];

export function getApologeticsMeta(
  slug: string,
): ApologeticsTopicMeta | undefined {
  return APOLOGETICS_TOPICS.find((t) => t.slug === slug);
}

export function apologeticsByGroup(
  g: ApologeticsGroup,
): ApologeticsTopicMeta[] {
  return APOLOGETICS_TOPICS.filter((t) => t.group === g);
}

export function apologeticsParams(): { slug: string }[] {
  return APOLOGETICS_TOPICS.filter((t) => !t.planned).map((t) => ({
    slug: t.slug,
  }));
}
