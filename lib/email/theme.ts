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
  /**
   * The owner's brief draws its charts in the email (lib/admin/briefCharts.ts),
   * in the admin money chart's own hues (app/admin/admin-theme.css,
   * --adm-money-*, his word of 2026-11-12: "if you can make it a different
   * color, right, if that helps ... If there's no distinction, then it just
   * shows up all white"): the shop, Plus, the EIKON Box membership, a plan the
   * product name does not say (the ink), refunds (a grey, below the line),
   * and the track a bar runs on. Each clears 3:1 on the card, as a chart mark
   * must (lib/admin/__tests__/ownerBrief.test.ts). No gold and no yellow.
   */
  chartShop: string;
  chartPlus: string;
  chartBox: string;
  chartOther: string;
  chartBack: string;
  chartTrack: string;
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
    chartShop: "#3987e5",
    chartPlus: "#008300",
    chartBox: "#d55181",
    chartOther: "#f4f4f5",
    chartBack: "#939393",
    chartTrack: "#2e2e33",
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
    chartShop: "#3987e5",
    chartPlus: "#008300",
    chartBox: "#d55181",
    chartOther: "#e4e4e7",
    chartBack: "#a1a1aa",
    chartTrack: "#2e2e33",
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
    chartShop: "#3987e5",
    chartPlus: "#008300",
    chartBox: "#d55181",
    chartOther: "#dbe4f4",
    chartBack: "#8fa2c4",
    chartTrack: "#26324a",
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
    chartShop: "#2a78d6",
    chartPlus: "#008300",
    chartBox: "#d55181",
    chartOther: "#2b2317",
    chartBack: "#6b5a45",
    chartTrack: "#d6c7a4",
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
