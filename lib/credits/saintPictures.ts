import type { CcLicence } from "@/lib/credits/photos";

/**
 * The saints' own pictures whose licence asks that their maker be named (CC
 * BY, CC BY-SA), for every place that draws a saint's face. The arbiter,
 * 2026-11-11, 15:11 UTC, approving Updates 2's recommendation for St Mark of
 * Ephesus's icon: his page names the maker in a line under the picture, with
 * the licence's deed and the maker's page (components/saints/PictureCredit.tsx,
 * PictureCredit); every small face of it (a calendar row, a search row, the
 * saints' list, a council or history page, a patron card, Today) says the
 * credit to a screen reader and opens his page (PictureCreditNote); the
 * home-screen widget and the desktop app's Discord picture show the plate for
 * it, since they open nothing and have no room; the website's search-engine
 * picture carries the credit and the licence in its own fields; and a journal
 * banner or a shared picture never shows it. No line under every face.
 *
 * Kept here, small, so a page of faces does not read the whole rights
 * registry (lib/saints/iconRights.ts, every row's description of its
 * picture). lib/credits/__tests__/photos.test.ts holds the two together: every
 * saint's picture on the credits page is here, as the registry has it, and
 * nothing else is.
 */
export type SaintPictureCredit = {
  /** Whom the picture's page asks to be named. */
  name: string;
  /** "icon": the icon's own painter, who published it under the licence; "photograph": the photographer of an old work. */
  kind: "icon" | "photograph";
  licence: CcLicence;
  /** The licence's deed (lib/credits/photos.ts, CC_LICENCES). */
  deed: string;
  /** The picture's page: its maker's own where the licence was given there. */
  source: string;
};

export const CREDITED_SAINT_PICTURES: Readonly<Record<string, SaintPictureCredit>> = {
  "/saints/icons/victorinus-of-pettau.jpg": {
    name: "Urharec",
    kind: "photograph",
    licence: "CC BY-SA 3.0",
    deed: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: "https://commons.wikimedia.org/wiki/File:Victorinus.jpg",
  },
  "/saints/icons/anatolius-of-constantinople.v2.jpg": {
    name: "Branko Jovanović, BLAGO Fund",
    kind: "photograph",
    licence: "CC BY 4.0",
    deed: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://www.blagofund.org/Archives/StaroNagorichane/Pictures/Interior/Nave/East_columns/SNAGORICANE_1_080A5498.html",
  },
  "/saints/icons/juvenal-of-jerusalem.v2.jpg": {
    name: "BLAGO Fund",
    kind: "photograph",
    licence: "CC BY 4.0",
    deed: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://www.blagofund.org/Archives/Decani/Church/Pictures/Frescoes/Prothesis/Vault/CX4K3164.html",
  },
  "/saints/icons/lazar-of-serbia.v2.jpg": {
    name: "Branko Jovanović, BLAGO Fund",
    kind: "photograph",
    licence: "CC BY 4.0",
    deed: "https://creativecommons.org/licenses/by/4.0/",
    source: "https://www.blagofund.org/Archives/Ljubostinja/Pictures/Interior/Narthex/Portraits_of_rulers/LJUBOSTINJA_1_080A1394.html",
  },
  "/saints/icons/mark-of-ephesus.jpg": {
    name: "Eleon icon-painting workshop (Иконописная мастерская Елеон)",
    kind: "icon",
    licence: "CC BY 2.0",
    deed: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/107233269@N08/20781338902/",
  },
};

/** The credit a saint's picture asks for, or null for a picture that asks none. */
export function saintPictureCredit(src: string | null | undefined): SaintPictureCredit | null {
  return (src && CREDITED_SAINT_PICTURES[src]) || null;
}

/** The words of a credit, in the reader's language around the maker's name: "Icon by …", "Photograph by …". */
export function creditKey(credit: Pick<SaintPictureCredit, "kind">): "credits.iconBy" | "credits.by" {
  return credit.kind === "icon" ? "credits.iconBy" : "credits.by";
}

/**
 * The maker's name, kept whole in its own direction inside a sentence of the
 * reader's (U+2068 FIRST STRONG ISOLATE to U+2069 POP DIRECTIONAL ISOLATE):
 * in Arabic and Urdu, a name in Latin and Cyrillic letters with a bracket in
 * it would otherwise be reordered.
 */
export function isolatedName(name: string): string {
  return `\u2068${name}\u2069`;
}

/**
 * What a face of a credited picture says to a screen reader after the name it
 * stands beside: " (Icon by …, CC BY 2.0)", in the reader's language; "" for
 * a picture that asks no credit. `t` is the catalog's (useTranslate).
 */
export function creditWords(src: string | null | undefined, t: (key: string, replacements?: Record<string, string | number>) => string): string {
  const credit = saintPictureCredit(src);
  return credit ? ` (${t(creditKey(credit), { name: isolatedName(credit.name) })}, ${credit.licence})` : "";
}
