// Silver Night: Purify's own pictures, one for each place (2.0, his word of
// 2026-11-27: "implement everything"; the methods are docs/brand/art/IMPLEMENT.md).
// One picture per place: a place's picture is its Discover door, its answer card
// in onboarding and the head of its own page, and a tapped door carries it into
// that head (data-carry / data-carry-into, lib/ui/routeMotion.ts).
//
// Every picture is made with Gemini from the prompts in docs/brand/art/PLAN.md,
// with his yes on each, and built into public/art/ by scripts/art/build.mjs.
// No picture recreates a holy icon (his word, 2026-11-27); the one exception he
// made by name is the daily rule's (docs/brand/art/PICKED.md).
//
// Dark for readers until 2.0 lights it: ART_LIVE, and Testers mode walks it.

export const ART_LIVE = false;

export type PlaceKey =
  | "parish" | "history" | "councils" | "chants" | "shop" | "start" | "reading" | "quiet" | "rule"
  | "saints" | "theology" | "calendar" | "walkthroughs" | "chat" | "plus";

export type Art = {
  /** The picture, in public/art: the WebP, with an AVIF beside it. */
  webp: string;
  avif: string;
  width: number;
  height: number;
  /** Says what is in the picture, not what the place is. */
  alt: string;
  /** Where a cut to another shape keeps the subject (a 16:9 picture on a 4:3 door). */
  focus?: string;
};

const art = (key: PlaceKey, width: number, height: number, alt: string, focus?: string): Art => ({ webp: `/art/${key}.webp`, avif: `/art/${key}.avif`, width, height, alt, ...(focus ? { focus } : {}) });

export const ART: Readonly<Record<PlaceKey, Art>> = {
  parish: art("parish", 1024, 765, "A small Orthodox church in black silhouette on a misty hill under a full moon, its windows lit."),
  history: art("history", 1024, 765, "A Byzantine city across the water at night, a great dome under the full moon and a ship with one sail."),
  councils: art("councils", 1024, 765, "Bishops seen from behind in a domed hall, gathered around an open book in a pool of light."),
  chants: art("chants", 1024, 765, "Two chanters seen from behind at a stand with an open music book and a candle, in a misty church."),
  shop: art("shop", 1024, 765, "An open wooden box glowing from within on a dark table, mist around it."),
  start: art("start", 1024, 765, "The arched door of a small chapel standing half open at night, light spilling over its steps into the mist."),
  reading: art("reading", 1024, 572, "Tall shelves of old books in a monastery library at night, a ladder against them and one lamp on a long table."),
  quiet: art("quiet", 768, 574, "A monk in silhouette on a rock above a sea of mist, a prayer rope in his hand."),
  rule: art("rule", 768, 574, "A shelf with a prayer book, a candle and a prayer rope under a hanging lamp, an icon on the wall."),
  saints: art("saints", 1024, 572, "A line of saints in robes, each with a soft halo, walking along a misty mountain ridge at first light.", "70% 50%"),
  theology: art("theology", 1024, 572, "A spiral stone staircase seen from below, winding up into a soft white light."),
  calendar: art("calendar", 1024, 572, "Four arched windows, each showing the same church in winter, spring, summer and autumn."),
  walkthroughs: art("walkthroughs", 1024, 572, "A traveler with a staff crossing an old stone bridge over a misty river toward the hills."),
  chat: art("chat", 1024, 572, "Monks talking on benches under a great tree in a monastery courtyard at dusk, a lantern in its branches."),
  plus: art("plus", 1024, 572, "A long library aisle between tall shelves, lamps hanging along it and one reader walking in the mist."),
};

/** The picture of the place a Discover door opens, by the door's address; null where none is made yet. */
export const DOOR_ART: Readonly<Record<string, PlaceKey>> = {
  "/parishes": "parish",
  "/history": "history",
  "/councils": "councils",
  "/chants": "chants",
  "/shop": "shop",
  "/start": "start",
  "/reading": "reading",
  "/saints": "saints",
  "/theology": "theology",
  "/calendar": "calendar",
  "/walkthroughs": "walkthroughs",
  "/community": "chat",
};

export function doorArt(href: string): { key: PlaceKey; art: Art } | null {
  const key = DOOR_ART[href];
  return key ? { key, art: ART[key] } : null;
}

/** The picture on each answer of "What are you looking for?" that has one of its own or its place's. */
export const ANSWER_ART: Readonly<Partial<Record<string, PlaceKey>>> = {
  saints: "saints",
  beliefs: "theology",
  feasts: "calendar",
  councils: "councils",
  history: "history",
  fathers: "reading",
  prayer: "rule",
  quiet: "quiet",
};

export function answerArt(answer: string): Art | null {
  const key = ANSWER_ART[answer];
  return key ? ART[key] : null;
}

/** The name a picture travels under, from a door to the head of its place. */
export const carryKey = (key: PlaceKey) => `place:${key}`;
