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
  /** Links inside running text. Never `accent`: on night that is near-white. */
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
    mark: "#d4af37",
    link: "#d4af37",
    well: "#141417",
    cardRadius: 16,
    buttonRadius: 999,
    scheme: "dark",
    crossPath: "/purify-cross-mark.png",
  },
  candlelight: {
    canvas: "#100b03",
    card: "#251a0a",
    heading: "#eedcae",
    body: "#eadabb",
    muted: "#b39b66",
    line: "#3d2c12",
    accent: "#d9b45a",
    onAccent: "#171006",
    label: "#d9b45a",
    mark: "#d9b45a",
    link: "#d9b45a",
    well: "#1b1206",
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
 * Fonts. Gmail strips the stylesheet link and shows the fallbacks, which is
 * why the fallback is named rather than left to the client: Georgia and Arial
 * are the two faces every mail client has had for twenty years, and they sit
 * close enough to Lora and DM Sans that the layout does not move.
 */
export const SERIF = "Lora,Georgia,'Times New Roman',serif";
export const SANS = "'DM Sans',Arial,Helvetica,sans-serif";
export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;600&display=swap";
