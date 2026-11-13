/**
 * What a Purify email looks like.
 *
 * The app has four reading modes in app/globals.css: the default night, plus
 * candlelight, monastery and parchment. An email that arrives in the same
 * colours as the app the reader already has open reads as the same product,
 * so these are those modes, narrowed to the handful of values an email can
 * actually use. Nothing here is per-message: one mode is active for every
 * email Purify sends, and changing EMAIL_MODE below changes all of them.
 *
 * WHY TOKENS AND NOT INLINE HEX. Every email module used to carry its own
 * copies of #1a1720, #3a3540, #8a8580 and #b8892f, which is why the layout
 * could be changed in one place and still come out looking like four different
 * products. lib/email/__tests__/theme.test.ts fails on a hex literal in any
 * email module, so a new email cannot start a fifth palette.
 *
 * Pure and dependency-free: the templates, the legacy senders and the tests
 * all read it, and it must stay importable from anywhere.
 */

export type EmailMode = "night" | "candlelight" | "monastery" | "parchment";

export type EmailTheme = {
  /** Behind the letter. */
  canvas: string;
  /** The letter itself. */
  card: string;
  /** Headings and the values a reader is meant to find again. */
  heading: string;
  /** Running text. */
  body: string;
  /** Labels, footers, the sign-off. */
  muted: string;
  /** Hairlines between rows. */
  line: string;
  /** Buttons. */
  accent: string;
  /** Text on the accent. */
  onAccent: string;
  /** The small line above the heading that says what the email is about. */
  label: string;
  /** A feast day, a tracking number, anything the eye should land on. */
  mark: string;
  /**
   * Links inside running text, underlined (lib/email/blocks.ts link), so a
   * link is found by its line and not only by a colour.
   */
  link: string;
  /** A recessed well: a quoted support message, a reviewer's note. */
  well: string;
  cardRadius: number;
  buttonRadius: number;
  /** Tells a client not to invert what is already dark. */
  scheme: "dark" | "light";
  /**
   * The cross at the top, from public/. Off-white, so it only works on the
   * dark modes; parchment shows the wordmark alone until a dark mark exists.
   */
  crossPath: string | null;
};

export const EMAIL_THEMES: Record<EmailMode, EmailTheme> = {
  night: {
    canvas: "#0b0b0e",
    card: "#1d1d20",
    heading: "#f4f4f5",
    body: "#d6d6da",
    muted: "#a39ea8",
    line: "#2e2e33",
    accent: "#eaeaec",
    onAccent: "#101013",
    label: "#bdbdc3",
    // White, as the app's own Dark palette marks a feast since 1.8; it was
    // the gold #d4af37 (refinement 2: no gold or yellow in Purify).
    mark: "#ffffff",
    link: "#ffffff",
    well: "#141417",
    cardRadius: 16,
    buttonRadius: 999,
    scheme: "dark",
    crossPath: "/purify-cross-mark.png",
  },
  // Black and light grey since 2026-09-25, in step with the app's
  // Candlelight palette in app/globals.css (it was warm amber).
  candlelight: {
    canvas: "#050505",
    card: "#18181b",
    heading: "#e4e4e7",
    body: "#d4d4d8",
    muted: "#a1a1aa",
    line: "#2e2e33",
    accent: "#e4e4e7",
    onAccent: "#0a0a0a",
    label: "#a1a1aa",
    mark: "#e4e4e7",
    link: "#e4e4e7",
    well: "#111113",
    cardRadius: 12,
    buttonRadius: 6,
    scheme: "dark",
    crossPath: "/purify-cross-mark.png",
  },
  monastery: {
    canvas: "#080b11",
    card: "#171e2b",
    heading: "#dbe4f4",
    body: "#d3dbe9",
    muted: "#8fa2c4",
    line: "#26324a",
    accent: "#aebedd",
    onAccent: "#0d1119",
    label: "#aebedd",
    mark: "#dbe4f4",
    link: "#aebedd",
    well: "#101622",
    cardRadius: 14,
    buttonRadius: 8,
    scheme: "dark",
    crossPath: "/purify-cross-mark.png",
  },
  parchment: {
    canvas: "#e6dcc4",
    card: "#f1e8d4",
    heading: "#2b2317",
    body: "#2b2317",
    muted: "#6b5a45",
    line: "#d6c7a4",
    accent: "#962820",
    onAccent: "#f6eedd",
    label: "#962820",
    mark: "#962820",
    link: "#962820",
    well: "#e9dcbf",
    cardRadius: 3,
    buttonRadius: 3,
    scheme: "light",
    crossPath: null,
  },
};

/**
 * The mode every Purify email is sent in. Night is the app's default, so it is
 * the one a reader recognises. One line to change, and the owner sees all four
 * side by side before it is changed.
 */
export const EMAIL_MODE: EmailMode = "night";

export const T: EmailTheme = EMAIL_THEMES[EMAIL_MODE];

/**
 * Fonts, named and never fetched. A letter linked Google Fonts until 1.9, so
 * a mail client that loads stylesheets called Google as the letter opened;
 * the owner's yes to 145 (2026-11-10) took the link out, as 143 took every
 * outside load out of the pages. Lora and DM Sans show where a reader has
 * them; everywhere else Georgia and Arial, the two faces every mail client has
 * had for twenty years, which sit close enough that the layout does not move.
 * Gmail always showed these, since it strips the stylesheet link.
 */
export const SERIF = "Lora,Georgia,'Times New Roman',serif";
export const SANS = "'DM Sans',Arial,Helvetica,sans-serif";

// ── The design kit's email look (his yes, 2026-11-13: "yes look") ───────
//
// The kit's emails (docs/brand/kit/email/, the Fable designer's) draw with
// named slots: the page, a raised card, the ink and its shares, hairlines, a
// chart's quiet marks, the button, a feast's rubric, the calendar's fasting
// registers and money's three hues. Dark is written inline; one style block
// turns a letter to the clean light where a reader's screen is light, never
// parchment. The values are the kit's own, computed by its builder from
// docs/brand/kit/tokens.css and app/globals.css (build.mjs PALETTES and
// NIGHT_SKY); lib/email/__tests__/kit.test.ts holds these to that builder, so
// a change in the kit shows here as a failing test, not as a drift.

export const KIT_SLOTS = [
  "ground",
  "raised",
  "ink",
  "body",
  "quiet",
  "line",
  "rule",
  "mark",
  "button",
  "onButton",
  "rubric",
  "fastStrict",
  "fastFish",
  "fastWineOil",
  "fastFree",
  "shop",
  "plus",
  "box",
] as const;

export type KitSlot = (typeof KIT_SLOTS)[number];
export type KitWears = Record<KitSlot, string>;

/** Dark, the app's default: written inline in every letter. */
export const KIT_DARK: KitWears = {
  ground: "#101013",
  raised: "#1d1d20",
  ink: "#ffffff",
  body: "#c3c3c4",
  quiet: "#939395",
  line: "#28282b",
  rule: "#404042",
  mark: "#6b6b6d",
  button: "#ffffff",
  onButton: "#101013",
  rubric: "#e2e2e5",
  fastStrict: "#e05656",
  fastFish: "#60b8ac",
  fastWineOil: "#b28ee2",
  fastFree: "#28c88c",
  shop: "#3987e5",
  plus: "#008300",
  box: "#d55181",
};

/** The clean light: white carrying the app's ink, where a client says the screen is light. Never parchment. */
export const KIT_LIGHT: KitWears = {
  ground: "#ffffff",
  raised: "#f3f3f3",
  ink: "#49424e",
  body: "#5b5560",
  quiet: "#6d6871",
  line: "#edeced",
  rule: "#dbd9dc",
  mark: "#8b868e",
  button: "#49424e",
  onButton: "#ffffff",
  rubric: "#962820",
  fastStrict: "#a82828",
  fastFish: "#1e6e68",
  fastWineOil: "#7040a0",
  fastFree: "#167652",
  shop: "#2a78d6",
  plus: "#008300",
  box: "#d55181",
};

/** Night sky, one of the app's looks: the Sunday email's dark in the Nativity Fast. */
export const KIT_NIGHT_SKY: KitWears = {
  ground: "#05070d",
  raised: "#0f1420",
  ink: "#edf0f6",
  body: "#b3b6bc",
  quiet: "#85878d",
  line: "#1c1e24",
  rule: "#33363c",
  mark: "#62646a",
  button: "#edf0f6",
  onButton: "#05070d",
  rubric: "#e2e2e5",
  fastStrict: "#e05656",
  fastFish: "#60b8ac",
  fastWineOil: "#b28ee2",
  fastFree: "#28c88c",
  shop: "#3987e5",
  plus: "#008300",
  box: "#d55181",
};

/** The Nativity card's night, dark on every palette as the card is (`dark-island`). */
export const KIT_NIGHT = { ground: "#0b0b0e", line: "#28282b", words: "#c2c2c3" } as const;
