/**
 * The look the three legal texts share (1.9; his word of 2026-11-10, "can you
 * revamp the TOS design?", and his yes to the Privacy Policy and the shop's
 * policy taking the same look): the Terms of Service, the Privacy Policy and
 * EIKON's shipping and returns, on their pages and in the sheet that opens
 * wherever the app says you agree to them (./LegalSheet.tsx).
 *
 * One file, so the three match by construction. The texts' words are theirs
 * alone (./TermsText.tsx, ./PrivacyText.tsx, ./ShopPoliciesText.tsx): this
 * holds only how a heading, a paragraph, a list and a link are set, at the
 * size a study of Theology is read at (components/theology/wayStyle.ts).
 * The Privacy Policy writes these strings out where it uses them, so the
 * test that holds its German level with its English can still read each
 * block's look (lib/legal/__tests__/privacyLevel.test.ts);
 * lib/legal/__tests__/legalLook.test.ts holds what it writes to these.
 */

/** The id of the page's own name, beside its mark: the bar takes the name once this has gone up under it. */
export const LEGAL_PAGE_NAME = "legal-page-name";

/** The text's own title, in Lora, as every page names itself. */
export const LEGAL_H1 = "font-serif text-title font-bold leading-[1.12] tracking-[-0.01em] text-balance text-paper";

/** The words a text opens on. What it sets in bold stays in the full ink, so a notice the law wants seen is seen. */
export const LEGAL_LEAD = "mt-4 font-serif text-[17px] leading-[1.65] text-paper/80";

/** A second opening paragraph, close under the first. */
export const LEGAL_LEAD_NEXT = "mt-3 font-serif text-[17px] leading-[1.65] text-paper/80";

/** A section's heading. It stops under the bar when the contents list brings it up. */
export const LEGAL_H2 = "mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper";

/** A heading inside a section. */
export const LEGAL_H3 = "mt-7 font-serif text-[16.5px] font-bold leading-[1.3] text-paper";

/** Running words. */
export const LEGAL_P = "mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88";

/** A link inside the words. */
export const LEGAL_A = "text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper";

/** A list inside the words. */
export const LEGAL_UL = "mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40";

/** A raised surface inside a text: the two ways to keep your reading, side by side. */
export const LEGAL_CARD = "theology-tray rounded-[18px] px-4 py-4";

/** A raised surface's own name. */
export const LEGAL_CARD_NAME = "mb-2 font-sans text-detail font-semibold text-paper";

/** Words on a raised surface, a step smaller than the running words. */
export const LEGAL_CARD_P = "font-serif text-[16px] leading-[1.65] text-paper/88";

/** A further paragraph on a raised surface. */
export const LEGAL_CARD_P_NEXT = "mt-3 font-serif text-[16px] leading-[1.65] text-paper/88";

/** A practical note under a surface's words. */
export const LEGAL_CARD_NOTE = "mt-3 font-sans text-detail leading-[1.55] text-paper/60";

/** The text's closing line, under a hairline. */
export const LEGAL_CLOSE = "mt-12 border-t border-paper/8 pt-6";

/** The closing line's words. */
export const LEGAL_CLOSE_P = "font-serif text-[16.5px] leading-[1.7] text-paper/75";
