import { ANTHEM_ART, ANTHEM_VERSIONS, type LyricLine } from "@/lib/prayers/anthemLyrics";

/**
 * What can play under a prayer (1.7). The owner, 2026-10-15: "allow you to
 * play it while you're praying ... if they're not listening to it while
 * they're praying, have a small little pop-up ... would you like to listen
 * to this with the chant ... they can choose which chants, and there's like
 * previews ... it previews the best, most popular section".
 *
 * The Anthem in its three languages is all the recorded music we hold. A
 * chant joins this list once we have a recording we may use (an open
 * question in the 1.7 brief); nothing else here needs to change for it.
 */
export type Chant = {
  id: string;
  /** The catalog key of its name. */
  titleKey: string;
  /** Its language, written in its own script. */
  language: string;
  src: string;
  art: string;
  captions?: LyricLine[];
  rtl?: boolean;
  /**
   * The stretch a preview plays, in seconds: the part it is known by. For
   * the Anthem, "Most Holy Trinity, save us all by Thy grace" with the lines
   * around it, in each language.
   */
  preview: { from: number; to: number };
};

const PREVIEWS: Record<string, Chant["preview"]> = {
  en: { from: 17.9, to: 31.4 },
  fr: { from: 17.3, to: 33.2 },
  ar: { from: 15.9, to: 32.4 },
};

export const CHANTS: readonly Chant[] = ANTHEM_VERSIONS.map((v) => ({
  id: `anthem-${v.code}`,
  titleKey: `prayers.anthem.version.${v.code}.title`,
  language: v.label,
  src: v.src,
  art: ANTHEM_ART,
  captions: v.lyrics,
  rtl: v.rtl,
  preview: PREVIEWS[v.code] ?? { from: 0, to: 15 },
}));

/** The address a preview plays: the file with its stretch as a media
 *  fragment, so the player starts there and stops at its end by itself. */
export function previewSrc(chant: Chant): string {
  return `${chant.src}#t=${chant.preview.from},${chant.preview.to}`;
}
